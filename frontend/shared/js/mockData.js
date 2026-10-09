/* ============================================================
   mockData.js — FASE 1: dados de mentira com a estrutura do banco.

   Os nomes de tabelas e colunas são os do arquivo SQL
   (usuarios, propriedades, dispositivos, sensores,
   leituras_sensores, eventos_irrigacao).

   Todas as telas leem a MESMA série abaixo, por isso Dashboard,
   Histórico, Irrigações e Consumo sempre mostram números
   consistentes (ex.: 2 eventos hoje = 270 L em todas as telas).

   Não há números aleatórios: a série é calculada de forma fixa
   a partir da data de hoje.

   Na FASE 2 este arquivo deixa de ser usado (api.js passa a
   usar fetch). Só api.js chama as funções mock*().
   ============================================================ */

/* ---------- 1) Dados editáveis (ficam salvos no navegador) ---------- */
const MOCK_CHAVE = 'aquasmart_mock_v1';
const MOCK_ESTADO_INICIAL = {
  usuarios: [
    // "telefone" NÃO existe na tabela usuarios (ver INCOMPATIBILIDADE nº 1)
    { id: 1, name: 'João Pereira', email: 'joao@example.com', telefone: '(88) 99999-9999' }
  ],
  propriedades: [
    // "limite_umidade_desliga" NÃO existe no banco (ver INCOMPATIBILIDADE nº 2)
    { id: 1, usuario_id: 1, name: 'Sítio Boa Vista', localizacao: 'Juazeiro do Norte - CE',
      area_hectares: 2.00, cultura: 'Cebola', metodo_irrigacao: "Bomba d'água",
      limite_umidade: 18.00, limite_umidade_desliga: 30.00 }
  ],
  proximoUsuarioId: 2,
  proximaPropriedadeId: 2
};
// NENHUMA senha é guardada aqui. O mock só confere se o e-mail existe.
let mockEstado = (function () {
  try { const s = JSON.parse(localStorage.getItem(MOCK_CHAVE)); if (s && s.usuarios) return s; } catch (e) {}
  return JSON.parse(JSON.stringify(MOCK_ESTADO_INICIAL));
})();
function mockSalvar() { localStorage.setItem(MOCK_CHAVE, JSON.stringify(mockEstado)); }

/* ---------- 2) Dados fixos do dispositivo e sensores ---------- */
const MOCK_DISPOSITIVOS = [
  { id: 1, propriedade_id: 1, codigo_dispositivo: 'ESP32-001', name: 'ESP32 AquaSmart', online: true, irrigacao_ligada: false }
];
const MOCK_SENSORES = [
  { id: 1, dispositivo_id: 1, type: 'umidade_solo', name: 'Sensor de Umidade', unit: '%' },
  { id: 2, dispositivo_id: 1, type: 'temperature', name: 'Sensor de Temperatura', unit: '°C' },
  { id: 3, dispositivo_id: 1, type: 'vazao_agua', name: 'Sensor de Vazão', unit: 'L/min' }
];

/* ---------- 3) Série de leituras e eventos (60 dias até hoje) ---------- */
const MOCK_SERIE = gerarSerieMock();

function gerarSerieMock() {
  const hoje = inicioDoDia(new Date());
  const HORAS = [7, 8, 9, 10, 11, 12, 13, 14];
  const UMID = [25, 21, 17, 24, 30, 24, 18, 30];     // umidade de hoje, hora a hora
  const TEMP = [27, 28, 29, 29, 28, 32, 33, 28];     // temperatura de hoje, hora a hora
  // litros dos últimos 6 dias antes de hoje (hoje = 270 L → 7 dias somam 1.260 L)
  const LITROS_RECENTES = { 1: 130, 2: 190, 3: 220, 4: 120, 5: 190, 6: 140 };
  const eventos = [], leituras = [];
  let idEvento = 1, idLeitura = 1;

  const quando = (dia, h) => { const d = new Date(dia); d.setHours(h, 0, 0, 0); return d; };
  const novoEvento = (dia, h, minutos, litros, antes, depois) => {
    const ini = quando(dia, h), fim = new Date(ini.getTime() + minutos * 60000);
    return { id: idEvento++, dispositivo_id: 1, iniciado_em: paraTimestamp(ini), encerrado_em: paraTimestamp(fim),
             duracao_minutos: minutos, agua_utilizada_litros: litros, umidade_antes: antes, umidade_depois: depois };
  };

  for (let i = 59; i >= 0; i--) {                    // do dia mais antigo até hoje
    const dia = somarDias(hoje, -i);
    if (i === 0) {
      eventos.push(novoEvento(dia, 9, 120, 180, 17, 30));   // hoje: 2 irrigações = 270 L
      eventos.push(novoEvento(dia, 13, 60, 90, 18, 30));
    } else {
      const litros = LITROS_RECENTES[i] ?? 100 + ((i * 37) % 13) * 10;
      eventos.push(novoEvento(dia, 9, Math.round(litros / 1.5), litros, 17 + (i % 4), 30));
    }
    HORAS.forEach((h, k) => {
      const dU = i === 0 ? 0 : ((i * 3 + k) % 5) - 2;        // pequena variação nos dias passados
      const dT = i === 0 ? 0 : ((i + k) % 3) - 1;
      const hora = paraTimestamp(quando(dia, h));
      leituras.push({ id: idLeitura++, sensor_id: 1, type: 'umidade_solo', value: Math.min(45, Math.max(10, UMID[k] + dU)), hora_leitura: hora });
      leituras.push({ id: idLeitura++, sensor_id: 2, type: 'temperature', value: TEMP[k] + dT, hora_leitura: hora });
    });
  }
  return { eventos, leituras };
}

/* ---------- 4) Consultas (equivalem a SELECTs do banco) ---------- */
function mockNoPeriodo(timestamp, ini, fim) { const d = timestamp.slice(0, 10); return d >= ini && d <= fim; }
function mockPropriedadeDoUsuario(uid) { return mockEstado.propriedades.find(p => p.usuario_id === uid) || null; }
function mockDispositivosDaPropriedade(pid) { return MOCK_DISPOSITIVOS.filter(d => d.propriedade_id === pid); }

function mockLeiturasPeriodo(pid, ini, fim) {
  const dispIds = mockDispositivosDaPropriedade(pid).map(d => d.id);
  const sensIds = MOCK_SENSORES.filter(s => dispIds.includes(s.dispositivo_id)).map(s => s.id);
  return MOCK_SERIE.leituras.filter(l => sensIds.includes(l.sensor_id) && mockNoPeriodo(l.hora_leitura, ini, fim))
    .map(l => ({ sensor_id: l.sensor_id, type: l.type, value: l.value, hora_leitura: l.hora_leitura }));
}
function mockEventosPeriodo(pid, ini, fim) {
  const dispIds = mockDispositivosDaPropriedade(pid).map(d => d.id);
  return MOCK_SERIE.eventos.filter(e => dispIds.includes(e.dispositivo_id) && mockNoPeriodo(e.iniciado_em, ini, fim));
}
// Equivale à view consumo_diario (propriedade + data → litros)
function mockConsumoDiario(pid, ini, fim) {
  const porDia = new Map();
  mockEventosPeriodo(pid, ini, fim).forEach(e => {
    const dia = e.iniciado_em.slice(0, 10);
    porDia.set(dia, (porDia.get(dia) || 0) + e.agua_utilizada_litros);
  });
  return [...porDia.entries()].sort().map(([data, litros]) =>
    ({ propriedade_id: pid, data_consumo: data, agua_utilizada_litros: Math.round(litros * 100) / 100 }));
}
function mockResumoConsumo(pid) {
  const hoje = new Date(), iso = paraISO(hoje);
  const soma = (ini, fim) => mockConsumoDiario(pid, ini, fim).reduce((t, d) => t + d.agua_utilizada_litros, 0);
  return { hoje: soma(iso, iso), ultimos_7_dias: soma(paraISO(somarDias(hoje, -6)), iso),
           ultimos_30_dias: soma(paraISO(somarDias(hoje, -29)), iso), total: soma('0000-01-01', '9999-12-31') };
}

// Equivale à view resumo_dashboard (mesmos nomes de coluna)
function mockResumoDashboard(uid) {
  const u = mockEstado.usuarios.find(x => x.id === uid);
  if (!u) throw new Error('Usuário não encontrado.');
  const p = mockPropriedadeDoUsuario(uid);
  const d = p ? mockDispositivosDaPropriedade(p.id)[0] : null;
  const ultima = (tipo) => {
    if (!d) return null;
    const s = MOCK_SENSORES.find(x => x.dispositivo_id === d.id && x.type === tipo);
    const ls = MOCK_SERIE.leituras.filter(l => l.sensor_id === s.id);
    return ls[ls.length - 1];
  };
  const hoje = paraISO(new Date());
  const um = ultima('umidade_solo'), te = ultima('temperature');
  return {
    usuario_id: u.id, user_name: u.name,
    propriedade_id: p ? p.id : null, property_name: p ? p.name : null, localizacao: p ? p.localizacao : null,
    area_hectares: p ? p.area_hectares : null, cultura: p ? p.cultura : null,
    metodo_irrigacao: p ? p.metodo_irrigacao : null, limite_umidade: p ? p.limite_umidade : null,
    limite_umidade_desliga: p ? p.limite_umidade_desliga : null,          // extra (fora do banco)
    dispositivo_id: d ? d.id : null, codigo_dispositivo: d ? d.codigo_dispositivo : null,
    online: d ? d.online : null, irrigacao_ligada: d ? d.irrigacao_ligada : null,
    ultimo_sinal: um ? um.hora_leitura : null,
    umidade_atual: um ? um.value : null, temperatura_atual: te ? te.value : null,
    consumo_agua_hoje: p ? mockEventosPeriodo(p.id, hoje, hoje).reduce((t, e) => t + e.agua_utilizada_litros, 0) : 0
  };
}

/* ---------- 5) Cadastro, login e edição (simulam o Flask) ---------- */
// ATENÇÃO: o mock NÃO confere a senha (não existe senha guardada).
// A verificação real da senha (hash) será feita pelo Flask.
function mockLogin(email, senha) {
  const u = mockEstado.usuarios.find(x => x.email.toLowerCase() === email.toLowerCase());
  if (!u) throw new Error('Não encontramos uma conta com este e-mail. Clique em "Cadastre-se" para criar a sua.');
  if (!senha) throw new Error('Informe sua senha.');
  const p = mockPropriedadeDoUsuario(u.id);
  return { usuario_id: u.id, propriedade_id: p ? p.id : null, nome: u.name, email: u.email, token: 'token-mock' };
}
function mockCadastrarUsuario({ name, email, telefone }) {      // a senha vai só para a API, nunca é guardada aqui
  if (mockEstado.usuarios.some(x => x.email.toLowerCase() === email.toLowerCase())) throw new Error('Este e-mail já está cadastrado.');
  const u = { id: mockEstado.proximoUsuarioId++, name, email, telefone };
  mockEstado.usuarios.push(u); mockSalvar();
  return { usuario_id: u.id, propriedade_id: null, nome: u.name, email: u.email, token: 'token-mock' };
}
function mockCadastrarPropriedade(uid, dados) {
  if (mockPropriedadeDoUsuario(uid)) throw new Error('Este usuário já possui uma propriedade cadastrada.');
  const p = { id: mockEstado.proximaPropriedadeId++, usuario_id: uid, ...dados, limite_umidade: 18.00, limite_umidade_desliga: 30.00 };
  mockEstado.propriedades.push(p); mockSalvar();
  return p;
}
function mockAtualizarUsuario(uid, { name, telefone }) {
  const u = mockEstado.usuarios.find(x => x.id === uid);
  u.name = name; u.telefone = telefone; mockSalvar();
  return u;
}
function mockAtualizarPropriedade(uid, dados) {
  const p = mockPropriedadeDoUsuario(uid);
  Object.assign(p, dados); mockSalvar();
  return p;
}
