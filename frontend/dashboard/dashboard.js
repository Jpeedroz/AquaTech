/* dashboard.js — situação ATUAL da propriedade (hoje). */
document.addEventListener('DOMContentLoaded', async () => {
  if (!exigirLogin()) return;
  montarLayout('dashboard');
  definirTopo(`${saudacao()}, ${primeiroNome(getSessao().nome)}!`, 'Carregando propriedade...');
  try {
    renderizar(await getDashboardData());          // futuramente: GET /api/dashboard
  } catch (e) { mostrarMensagem(e.message, 'erro'); }
});

function renderizar({ resumo, leituras_umidade, eventos }) {
  // usuário logado sem propriedade → termina o cadastro (etapa 2)
  if (resumo.propriedade_id == null) { window.location.replace('../propriedade/propriedade.html'); return; }
  // Topo: nome do usuário e dados da propriedade vêm do cadastro (nada fixo no HTML)
  definirTopo(`${saudacao()}, ${primeiroNome(resumo.nome_usuario)}!`,
              `Propriedade: ${resumo.nome_propriedade} - Cultura: ${resumo.cultura || 'não informada'}`);

  const semLeitura = resumo.umidade_atual == null;
  // 1) umidade do solo
  document.getElementById('umidade').textContent = semLeitura ? '—' : `${formatarNumero(resumo.umidade_atual)}%`;
  const seco = !semLeitura && resumo.umidade_atual < resumo.limite_umidade;   // abaixo do limite de irrigação
  document.getElementById('cardSolo').classList.toggle('seco', seco);
  document.getElementById('soloStatus').textContent = semLeitura ? 'Sem leituras' : seco ? 'Solo seco' : 'Solo adequado';
  // 2) status da irrigação (dispositivos.irrigacao_ligada)
  const ligada = resumo.irrigacao_ligada === true;
  document.getElementById('pontoIrrig').classList.toggle('ligada', ligada);
  document.getElementById('irrigStatus').textContent = resumo.dispositivo_id == null ? 'Sem dispositivo' : ligada ? 'Ligada' : 'Desligada';
  document.getElementById('irrigNota').textContent = ligada ? 'Irrigação em andamento' : 'Irrigação não necessária';
  // 3) temperatura e 4) consumo
  document.getElementById('temperatura').textContent = resumo.temperatura_atual == null ? '—' : `${formatarNumero(resumo.temperatura_atual)}°C`;
  document.getElementById('consumoHoje').textContent = formatarLitros(resumo.consumo_agua_hoje);

  desenharGraficoUmidade(document.getElementById('grafico'), leituras_umidade, eventos,
                         resumo.limite_umidade, resumo.limite_umidade_desliga);
}

/* Gráfico de linhas em SVG puro (sem biblioteca): umidade x horário,
   faixas verdes = irrigação ativa, linhas tracejadas = limites. */
function desenharGraficoUmidade(el, leituras, eventos, liga, desliga) {
  if (!leituras.length) { el.innerHTML = '<p class="vazio">Não há leituras de umidade registradas hoje.</p>'; return; }
  const L = 900, A = 300, m = { e: 50, d: 16, t: 14, b: 32 };
  const w = L - m.e - m.d, h = A - m.t - m.b;
  const pts = leituras.map(l => ({ hora: new Date(l.hora_leitura), v: Number(l.valor) }));
  const t0 = pts[0].hora.getTime(), t1 = pts[pts.length - 1].hora.getTime(), span = Math.max(t1 - t0, 1);
  const vmax = Math.max(40, Math.ceil(Math.max(...pts.map(p => p.v), desliga || 0) / 10) * 10);
  const X = t => m.e + ((t - t0) / span) * w;
  const Y = v => m.t + h - (v / vmax) * h;
  let s = `<svg viewBox="0 0 ${L} ${A}" role="img" aria-label="Umidade do solo hoje">`;

  for (let v = 0; v <= vmax; v += 10) {                                  // grade horizontal
    s += `<line x1="${m.e}" x2="${L - m.d}" y1="${Y(v)}" y2="${Y(v)}" stroke="#e8edf2"/>
          <text x="${m.e - 8}" y="${Y(v) + 3}" font-size="10" fill="#8a96a8" text-anchor="end">${v}%</text>`;
  }
  eventos.forEach(e => {                                                 // faixas de irrigação
    const ini = new Date(e.iniciado_em).getTime();
    const fim = e.encerrado_em ? new Date(e.encerrado_em).getTime() : t1;
    const a = Math.max(ini, t0), b = Math.min(fim, t1);
    if (b > a) s += `<rect x="${X(a)}" y="${m.t}" width="${X(b) - X(a)}" height="${h}" fill="#c9f2c7" opacity=".8"/>`;
  });
  if (desliga != null) s += `<line x1="${m.e}" x2="${L - m.d}" y1="${Y(desliga)}" y2="${Y(desliga)}" stroke="#1c8a4a" stroke-dasharray="5 4"/>
    <text x="${m.e + 6}" y="${Y(desliga) - 5}" font-size="10" font-weight="600" fill="#1c6b3a">Desliga irrigação — ${formatarNumero(desliga)}%</text>`;
  if (liga != null) s += `<line x1="${m.e}" x2="${L - m.d}" y1="${Y(liga)}" y2="${Y(liga)}" stroke="#9aa5b3" stroke-dasharray="5 4"/>
    <text x="${m.e + 6}" y="${Y(liga) + 13}" font-size="10" font-weight="600" fill="#c4570c">Liga irrigação — ${formatarNumero(liga)}%</text>`;

  s += `<polyline fill="none" stroke="#0b86d1" stroke-width="2.2" points="${pts.map(p => `${X(p.hora.getTime())},${Y(p.v)}`).join(' ')}"/>`;
  pts.forEach(p => {
    s += `<circle cx="${X(p.hora.getTime())}" cy="${Y(p.v)}" r="3.6" fill="#0b86d1"/>
          <text x="${X(p.hora.getTime())}" y="${A - 10}" font-size="10" fill="#8a96a8" text-anchor="middle">${horaBR(p.hora)}</text>`;
  });
  el.innerHTML = s + '</svg>';
}
