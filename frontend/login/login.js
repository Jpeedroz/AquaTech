/* login.js — validação do formulário e chamada de login() (api.js). */
document.getElementById('icMail').innerHTML = icone('mail');
document.getElementById('icLock').innerHTML = icone('lock');

const alerta = document.getElementById('alerta');
function mostrarAlerta(texto, tipo) { alerta.textContent = texto; alerta.className = 'alerta alerta-' + tipo; alerta.hidden = false; }

// Aviso deixado pela tela anterior (ex.: cadastro concluído)
const aviso = lerAviso();
if (aviso) mostrarAlerta(aviso, 'ok');

document.getElementById('formLogin').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;
  alerta.hidden = true;
  if (!email || !senha) { mostrarAlerta('Informe e-mail e senha.', 'erro'); return; }
  if (!validarEmail(email)) { mostrarAlerta('Informe um e-mail válido.', 'erro'); return; }
  try {
    const dados = await login(email, senha);          // futuramente: POST /api/login
    if (!dados.propriedade_id) {                      // conta criada, mas cadastro da propriedade não concluído
      salvarCadastroPendente(dados);
      window.location.href = '../propriedade/propriedade.html';
      return;
    }
    salvarSessao(dados);                              // guarda usuario_id e propriedade_id (nunca a senha)
    window.location.href = '../dashboard/dashboard.html';
  } catch (e) { mostrarAlerta(e.message, 'erro'); }  // ex.: conta não encontrada
});
