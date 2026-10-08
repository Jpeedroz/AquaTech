/* ============================================================
   session.js — contexto do usuário autenticado no navegador.

   Guarda SOMENTE: usuario_id, propriedade_id, nome, e-mail e um
   token (quando o Flask existir). NUNCA guarda senha ou senha_hash.

   ATENÇÃO: isto é conveniência de interface, NÃO segurança.
   A proteção real das telas e dos dados será feita no Flask
   (validando o token/cookie em cada requisição à API).
   ============================================================ */

const CHAVE_SESSAO = 'aquasmart_sessao';

function salvarSessao(dados) {
  const sessao = {                       // lista fixa de campos permitidos
    usuario_id: dados.usuario_id,
    propriedade_id: dados.propriedade_id ?? null,
    nome: dados.nome,
    email: dados.email,
    token: dados.token ?? null
  };
  sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
}

function getSessao() {
  try { return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO)); }
  catch (e) { return null; }
}

function atualizarSessao(parcial) {
  const atual = getSessao();
  if (atual) salvarSessao({ ...atual, ...parcial });
}

function limparSessao() { sessionStorage.removeItem(CHAVE_SESSAO); }

// Chamada no início das telas protegidas. Sem sessão → volta ao login.
function exigirLogin() {
  if (!getSessao()) { window.location.replace('../login/login.html'); return false; }
  return true;
}
