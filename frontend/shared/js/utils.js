/* ============================================================
   utils.js — funções gerais usadas por várias telas.
   (datas, números, ícones, menu lateral, filtro de período,
   mensagens e janela modal)
   ============================================================ */

const MESES_NOME = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const MESES_ABREV = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

// Listas usadas no cadastro da propriedade e em Configurações
const CULTURAS = ['Cebola','Milho','Feijão','Tomate','Mandioca','Pimentão','Banana','Capim','Outra'];
const METODOS_IRRIGACAO = [
  { valor: "Bomba d'água", titulo: "Bomba d'água", descricao: 'Irrigação motorizada' },
  { valor: 'Gravidade',    titulo: 'Gravidade',    descricao: 'Irrigação por gravidade' }
];

/* ---------- datas ---------- */
function dois(n) { return String(n).padStart(2, '0'); }
function paraISO(d) { return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`; }          // 2026-10-07
function paraTimestamp(d) { return `${paraISO(d)}T${dois(d.getHours())}:${dois(d.getMinutes())}:00`; }      // como o TIMESTAMP do banco
function inicioDoDia(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function somarDias(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function dataBR(d) { return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}`; }
function horaBR(d) { return `${dois(d.getHours())}:${dois(d.getMinutes())}`; }
function horaCurta(d) { const m = d.getMinutes(); return m ? `${d.getHours()}h${dois(m)}` : `${d.getHours()}h`; }
function diaMesAbrev(d) { return `${d.getDate()} ${MESES_ABREV[d.getMonth()]}`; }                           // 31 AGO
function diaMesCurto(d) { const m = MESES_NOME[d.getMonth()].slice(0, 3); return `${d.getDate()} ${m[0].toUpperCase()}${m.slice(1)}`; } // 31 Ago
function diaMesExtenso(d) { return `${d.getDate()} de ${MESES_NOME[d.getMonth()]}`; }                       // 31 de agosto
function dataISOparaDate(s) { return new Date(s + 'T00:00:00'); }

/* ---------- números e textos ---------- */
function formatarNumero(n, casas = 0) { return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }); }
function formatarLitros(n) { return formatarNumero(n, 0) + ' L'; }
function formatarDuracao(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  if (h && m) return `${h}h ${m}min`;
  return h ? `${h}h` : `${m}min`;
}
function media(lista) { return lista.length ? lista.reduce((a, b) => a + b, 0) / lista.length : null; }
function primeiroNome(nome) { return (nome || '').trim().split(/\s+/)[0]; }
function saudacao() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
function validarEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function aplicarMascaraTelefone(input) {
  input.addEventListener('input', () => {
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    const corte = v.length > 10 ? 7 : 6;
    if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, corte)}-${v.slice(corte)}`;
    else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    input.value = v;
  });
}

/* ---------- ícones (SVG inline, traço simples) ---------- */
const ICONES = {
  home: '<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  waves: '<path d="M3 9c3-2 6 2 9 0s6 2 9 0M3 14c3-2 6 2 9 0s6 2 9 0M3 19c3-2 6 2 9 0s6 2 9 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2L10 21h4l.6-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  thermo: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>',
  bars: '<path d="M5 20V12M12 20V6M19 20v-8"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M5 12l5 5 9-10"/>'
};
function icone(nome, tamanho = 18) {
  return `<svg class="icone" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome]}</svg>`;
}

/* ---------- layout das telas internas (menu lateral + topo) ---------- */
function montarLayout(paginaAtual) {
  const sessao = getSessao();
  const itens = [
    ['dashboard', 'Dashboard', 'home'],
    ['historico', 'Histórico', 'history'],
    ['irrigacoes', 'Irrigações', 'drop'],
    ['consumo', 'Consumo de água', 'waves'],
    ['configuracoes', 'Configurações', 'gear']
  ];
  document.getElementById('sidebar').innerHTML = `
    <img class="sidebar-logo" src="../assets/logos/logo-escuro.png" alt="AquaSmart">
    <nav class="menu">
      ${itens.map(([id, texto, ic]) =>
        `<a class="menu-item ${id === paginaAtual ? 'ativo' : ''}" href="../${id}/${id}.html">${icone(ic)}<span>${texto}</span></a>`).join('')}
    </nav>
    <div class="sidebar-rodape">
      <div class="usuario"><span class="avatar" id="menuAvatar"></span>
        <div><strong id="menuNome"></strong><small>Proprietário</small></div></div>
      <button class="btn-sair" id="btnSair" type="button">${icone('logout')}<span>Sair</span></button>
    </div>`;
  atualizarUsuarioNoMenu(sessao.nome);
  document.getElementById('btnSair').addEventListener('click', sair);   // sair() está em api.js
}
function atualizarUsuarioNoMenu(nome) {
  document.getElementById('menuNome').textContent = nome;               // textContent evita injeção de HTML
  document.getElementById('menuAvatar').textContent = (nome || '?')[0].toUpperCase();
}
function definirTopo(titulo, subtitulo) {
  document.getElementById('tituloPagina').textContent = titulo;
  document.getElementById('subtituloPagina').textContent = subtitulo;
}

/* ---------- mensagens (toast) ---------- */
function mostrarMensagem(texto, tipo = 'sucesso') {
  const t = document.createElement('div');
  t.className = `toast toast-${tipo}`;
  t.textContent = texto;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4500);
}

/* ---------- janela modal genérica (usada em senha e e-mail) ---------- */
function abrirModal({ titulo, texto, campos, textoConfirmar, aoConfirmar }) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `<div class="modal"><h3></h3><p class="modal-texto"></p><div class="modal-campos"></div>
    <p class="erro-texto"></p>
    <div class="modal-botoes"><button type="button" class="btn btn-claro" data-acao="cancelar">Cancelar</button>
    <button type="button" class="btn btn-azul" data-acao="ok"></button></div></div>`;
  fundo.querySelector('h3').textContent = titulo;
  fundo.querySelector('.modal-texto').textContent = texto || '';
  fundo.querySelector('[data-acao=ok]').textContent = textoConfirmar;
  const areaCampos = fundo.querySelector('.modal-campos');
  campos.forEach(c => {
    const l = document.createElement('label');
    l.className = 'campo';
    l.innerHTML = '<span></span><input autocomplete="off">';
    l.querySelector('span').textContent = c.label;
    const inp = l.querySelector('input');
    inp.type = c.tipo || 'text'; inp.id = 'modal_' + c.id;
    areaCampos.appendChild(l);
  });
  const erro = fundo.querySelector('.erro-texto');
  fundo.querySelector('[data-acao=cancelar]').onclick = () => fundo.remove();
  fundo.querySelector('[data-acao=ok]').onclick = async () => {
    const valores = {};
    campos.forEach(c => { valores[c.id] = fundo.querySelector('#modal_' + c.id).value; });
    try {
      const msg = await aoConfirmar(valores);
      fundo.remove();
      if (msg) mostrarMensagem(msg, 'sucesso');
    } catch (e) { erro.textContent = e.message; }
  };
  document.body.appendChild(fundo);
}

/* ---------- período (Hoje / 7 dias / 1 mês / Personalizado) ---------- */
function resolverPeriodo(tipo, iniStr, fimStr) {
  const hoje = inicioDoDia(new Date());
  if (tipo === 'hoje') return { tipo, inicio: hoje, fim: hoje };
  if (tipo === '7dias') return { tipo, inicio: somarDias(hoje, -6), fim: hoje };
  if (tipo === '1mes') return { tipo, inicio: somarDias(hoje, -29), fim: hoje };   // últimos 30 dias
  return { tipo, inicio: dataISOparaDate(iniStr), fim: dataISOparaDate(fimStr) };
}
function descreverPeriodo(p) {
  if (p.tipo === 'hoje') return 'hoje';
  if (p.tipo === '7dias') return 'nos últimos 7 dias';
  if (p.tipo === '1mes') return 'nos últimos 30 dias';
  return `de ${dataBR(p.inicio)} a ${dataBR(p.fim)}`;
}

/* Cria o filtro dentro de "container" e chama aoMudar(periodo).
   estilo: 'select' (lista suspensa) ou 'pills' (botões).
   O período "Hoje" é aplicado logo na criação (padrão). */
function criarFiltroPeriodo(container, aoMudar, estilo) {
  const opcoes = [['hoje', 'Hoje'], ['7dias', '7 dias'], ['1mes', '1 mês'], ['personalizado', 'Personalizado']];
  let atual = 'hoje';
  container.classList.add('filtro', 'filtro-' + estilo);
  container.innerHTML = `<div class="filtro-opcoes"></div>
    <div class="filtro-custom" hidden>
      <label>Data inicial <input type="date" class="f-ini"></label>
      <label>Data final <input type="date" class="f-fim"></label>
      <button type="button" class="btn btn-azul btn-pequeno f-aplicar">Aplicar</button>
      <span class="erro-texto f-erro"></span>
    </div>`;
  const area = container.querySelector('.filtro-opcoes');
  const custom = container.querySelector('.filtro-custom');
  const erro = container.querySelector('.f-erro');
  let controles;

  if (estilo === 'select') {
    const sel = document.createElement('select');
    opcoes.forEach(([v, t]) => sel.add(new Option(t, v)));
    sel.addEventListener('change', () => escolher(sel.value));
    area.appendChild(sel);
    controles = () => { sel.value = atual; };
  } else {
    const botoes = opcoes.map(([v, t]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = t; b.dataset.valor = v;
      b.addEventListener('click', () => escolher(v));
      area.appendChild(b); return b;
    });
    controles = () => botoes.forEach(b => b.classList.toggle('ativo', b.dataset.valor === atual));
  }

  function escolher(tipo) {
    atual = tipo; controles(); erro.textContent = '';
    if (tipo === 'personalizado') { custom.hidden = false; return; }
    custom.hidden = true;
    aoMudar(resolverPeriodo(tipo));
  }
  container.querySelector('.f-aplicar').addEventListener('click', () => {
    const ini = container.querySelector('.f-ini').value, fim = container.querySelector('.f-fim').value;
    if (!ini || !fim) { erro.textContent = 'Preencha a data inicial e a data final.'; return; }
    if (ini > fim) { erro.textContent = 'A data inicial deve ser anterior ou igual à data final.'; return; }
    erro.textContent = '';
    aoMudar(resolverPeriodo('personalizado', ini, fim));
  });
  controles();
  aoMudar(resolverPeriodo('hoje'));
}
