/* login.js — validação do formulário e chamada de login() (api.js). */
document.getElementById('icMail').innerHTML = icone('mail');
document.getElementById('icLock').innerHTML = icone('lock');

document.getElementById('linkEsqueci').addEventListener('click', (ev) => {
  ev.preventDefault();
  mostrarMensagem('A recuperação de senha será disponibilizada junto com o back-end.', 'erro');
});

document.getElementById('formLogin').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const erro = document.getElementById('erro');
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;
  erro.textContent = '';
  if (!email || !senha) { erro.textContent = 'Informe e-mail e senha.'; return; }
  if (!validarEmail(email)) { erro.textContent = 'Informe um e-mail válido.'; return; }
  try {
    const dados = await login(email, senha);          // futuramente: POST /api/login
    salvarSessao(dados);                              // guarda usuario_id e propriedade_id (nunca a senha)
    // sem propriedade cadastrada → continua o cadastro (etapa 2)
    window.location.href = dados.propriedade_id ? '../dashboard/dashboard.html' : '../propriedade/propriedade.html';
  } catch (e) { erro.textContent = e.message; }
});
