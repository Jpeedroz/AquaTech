/* cadastro.js — Etapa 1: dados do proprietário (tabela usuarios). */
aplicarMascaraTelefone(document.getElementById('telefone'));

document.getElementById('formCadastro').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const erro = document.getElementById('erro');
  const name = document.getElementById('nome').value.trim();
  const email = document.getElementById('email').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const senha = document.getElementById('senha').value;
  const confirmar = document.getElementById('confirmar').value;

  if (!name || !email || !telefone || !senha || !confirmar) { erro.textContent = 'Preencha todos os campos obrigatórios.'; return; }
  if (!validarEmail(email)) { erro.textContent = 'Informe um e-mail válido.'; return; }
  if (senha.length < 6) { erro.textContent = 'A senha deve ter pelo menos 6 caracteres.'; return; }
  if (senha !== confirmar) { erro.textContent = 'A confirmação de senha não confere com a senha.'; return; }
  erro.textContent = '';

  try {
    // A senha vai SOMENTE para a API, que gera o hash. Não é guardada no navegador.
    const dados = await cadastrarUsuario({ name, email, telefone, senha });
    salvarSessao(dados);
    window.location.href = '../propriedade/propriedade.html';   // etapa 2
  } catch (e) { erro.textContent = e.message; }
});
