/* ============================================================
   api.js — ÚNICO ponto de acesso a dados do front-end.

   As telas chamam estas funções (getDashboardData, login...).
   FASE 1: USAR_MOCK = true  → respostas vêm de mockData.js.
   FASE 2: USAR_MOCK = false → o mesmo código usa fetch() na API Flask.
   Assim as telas NÃO precisam ser refeitas.

   O front-end nunca acessa o PostgreSQL: só conversa com a API.
   Em produção o usuário é identificado pelo token/cookie da sessão
   no Flask (por isso as rotas não recebem usuario_id na URL).
   ============================================================ */

const USAR_MOCK = true;
const API_BASE = '/api';

async function requisicao(caminho, opcoes = {}) {
  const resposta = await fetch(API_BASE + caminho, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',                       // envia o cookie de sessão do Flask
    ...opcoes
  });
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.mensagem || 'Erro na comunicação com o servidor.');
  }
  return resposta.json();
}
const post = (caminho, corpo) => requisicao(caminho, { method: 'POST', body: JSON.stringify(corpo) });
const put = (caminho, corpo) => requisicao(caminho, { method: 'PUT', body: JSON.stringify(corpo) });
const idUsuario = () => getSessao().usuario_id;
const idPropriedade = () => mockPropriedadeDoUsuario(idUsuario())?.id;   // só usado no mock

/* ---------- autenticação e cadastro ---------- */
// Envia email e senha. Resposta esperada: { usuario_id, propriedade_id, nome, email, token }
async function login(email, senha) {
  return USAR_MOCK ? mockLogin(email, senha) : post('/login', { email, senha });
}
// O HASH da senha é gerado pelo Back-end, nunca aqui.
async function cadastrarUsuario({ name, email, telefone, senha }) {
  return USAR_MOCK ? mockCadastrarUsuario({ name, email, telefone }) : post('/usuarios', { name, email, telefone, senha });
}
// Etapa 2 do cadastro: ainda não há login, então usa o usuário criado na etapa 1.
// O Flask deve validar o token de cadastro devolvido pela etapa 1.
async function cadastrarPropriedade(dados) {
  const pendente = getCadastroPendente();
  if (!pendente) throw new Error('Sua sessão de cadastro expirou. Comece o cadastro novamente.');
  return USAR_MOCK ? mockCadastrarPropriedade(pendente.usuario_id, dados)
                   : post('/propriedades', { ...dados, usuario_id: pendente.usuario_id, token_cadastro: pendente.token });
}
// Sair: avisa a API (quando existir), limpa a sessão e volta ao login.
// A proteção REAL das telas será feita no Flask; limpar a sessão aqui é só interface.
async function sair() {
  try { if (!USAR_MOCK) await post('/logout', {}); } catch (e) { /* segue mesmo assim */ }
  limparSessao();
  window.location.replace('../login/login.html');
}

/* ---------- conta e propriedade ---------- */
async function getUsuario() {
  return USAR_MOCK ? { ...mockEstado.usuarios.find(u => u.id === idUsuario()) } : requisicao('/usuario');
}
async function getPropriedade() {
  return USAR_MOCK ? { ...mockPropriedadeDoUsuario(idUsuario()) } : requisicao('/propriedade');
}
async function atualizarUsuario({ name, telefone }) {                         // PUT /api/usuario
  return USAR_MOCK ? mockAtualizarUsuario(idUsuario(), { name, telefone }) : put('/usuario', { name, telefone });
}
async function atualizarPropriedade(dados) {                                  // PUT /api/propriedade
  return USAR_MOCK ? mockAtualizarPropriedade(idUsuario(), dados) : put('/propriedade', dados);
}
// O Back-end deve: validar a senha atual, gerar novo senha_hash, invalidar sessões antigas.
async function alterarSenha(senhaAtual, novaSenha) {                          // PUT /api/usuario/senha
  if (USAR_MOCK) return { mensagem: 'MOCK: nada foi alterado. O Flask validará a senha atual e gravará o novo hash.' };
  return put('/usuario/senha', { senha_atual: senhaAtual, nova_senha: novaSenha });
}
// O Back-end deve: exigir autenticação, checar se o e-mail é de outro usuário,
// enviar confirmação ao novo e-mail e só então trocar (e atualizar a sessão).
async function solicitarTrocaEmail(novoEmail, senhaAtual) {                   // POST /api/usuario/email
  if (USAR_MOCK) return { mensagem: 'MOCK: o e-mail NÃO foi alterado. Em produção, um link de confirmação será enviado ao novo endereço.' };
  return post('/usuario/email', { novo_email: novoEmail, senha_atual: senhaAtual });
}

/* ---------- dados das telas (datas no formato AAAA-MM-DD) ---------- */
// GET /api/dashboard → { resumo (colunas de resumo_dashboard), leituras_umidade (hoje), eventos (hoje) }
async function getDashboardData() {
  if (!USAR_MOCK) return requisicao('/dashboard');
  const hoje = paraISO(new Date()), pid = idPropriedade();
  return {
    resumo: mockResumoDashboard(idUsuario()),
    leituras_umidade: pid ? mockLeiturasPeriodo(pid, hoje, hoje).filter(l => l.type === 'umidade_solo') : [],
    eventos: pid ? mockEventosPeriodo(pid, hoje, hoje) : []
  };
}
// GET /api/historico?inicio=&fim= → { leituras: [{sensor_id,type,value,hora_leitura}], eventos: [...] }
async function getHistoricoData(inicio, fim) {
  if (!USAR_MOCK) return requisicao(`/historico?inicio=${inicio}&fim=${fim}`);
  const pid = idPropriedade();
  return { leituras: pid ? mockLeiturasPeriodo(pid, inicio, fim) : [], eventos: pid ? mockEventosPeriodo(pid, inicio, fim) : [] };
}
// GET /api/irrigacoes?inicio=&fim= → { eventos: [linhas de eventos_irrigacao] }
async function getIrrigacoesData(inicio, fim) {
  if (!USAR_MOCK) return requisicao(`/irrigacoes?inicio=${inicio}&fim=${fim}`);
  const pid = idPropriedade();
  return { eventos: pid ? mockEventosPeriodo(pid, inicio, fim) : [] };
}
// GET /api/consumo?inicio=&fim= → { dias: [linhas da view consumo_diario] }
async function getConsumoData(inicio, fim) {
  if (!USAR_MOCK) return requisicao(`/consumo?inicio=${inicio}&fim=${fim}`);
  const pid = idPropriedade();
  return { dias: pid ? mockConsumoDiario(pid, inicio, fim) : [] };
}
// GET /api/consumo/resumo → { hoje, ultimos_7_dias, ultimos_30_dias, total }
async function getConsumoResumo() {
  if (!USAR_MOCK) return requisicao('/consumo/resumo');
  const pid = idPropriedade();
  return pid ? mockResumoConsumo(pid) : { hoje: 0, ultimos_7_dias: 0, ultimos_30_dias: 0, total: 0 };
}

/* ---------- recuperação de senha ---------- */
// POST /api/recuperar-senha { email } → o Flask envia o link por e-mail.
// A resposta deve ser SEMPRE a mesma, exista o e-mail ou não (não revelar quem tem conta).
async function solicitarRecuperacaoSenha(email) {
  if (USAR_MOCK) return { mock: true, mensagem: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.' };
  return post('/recuperar-senha', { email });
}
// POST /api/redefinir-senha { token, nova_senha } → o Flask valida o token e grava o novo senha_hash.
async function redefinirSenha(token, novaSenha) {
  if (USAR_MOCK) return { mensagem: 'Senha alterada com sucesso.' };
  return post('/redefinir-senha', { token, nova_senha: novaSenha });
}
// GET /api/redefinir-senha/verificar?token=XXXX → { valido: true|false }
// O Flask confere se o token existe, não expirou e não foi usado. Roda ao abrir o link do e-mail.
async function verificarTokenRecuperacao(token) {
  if (USAR_MOCK) return { valido: token !== 'expirado' };    // mock: ?token=expirado simula link vencido
  if (!token) return { valido: false };
  return requisicao(`/redefinir-senha/verificar?token=${encodeURIComponent(token)}`);
}
