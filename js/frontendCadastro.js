import { Usuario } from "./teste.js";
//Variáveis
const api = {
  online: "https://green-line-web.onrender.com",
  cadastro: "http://localhost:3000",
};

const formularioCadastro = document.getElementById("formularioCadastro");
formularioCadastro.addEventListener("submit", function (e) {
  e.preventDefault();

  let btEnviar = document.getElementById("cadastrar-usuario");
    btEnviar.disabled = true;
    btEnviar.innerHTML =
      '<span class="spinner-border spinner-border-sm" role:"status" aria-hidden:"true"></span>';

  const nome = document.getElementById("username").value;
  const cpf = document.getElementById("cpf").value;
  const email = document.getElementById("email").value;
  const telefone = document.getElementById("telefone").value;
  const senha = document.getElementById("password").value;

  let usuario = new Usuario(
    nome,cpf, email, telefone, senha
  );
  usuario.salvarUsuario();

});


//MÁSCARAS
//CPF
document.getElementById("cpf").addEventListener("input", function (e) {
  let value = e.target.value.replace(/\D/g, "");
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d)/, "$1.$2");
  value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  e.target.value = value;
});
//TELEFONE
document.getElementById("telefone").addEventListener("input", function (e) {
  let value = e.target.value.replace(/\D/g, ""); // Remove caracteres não numéricos
  value = value.replace(/(\d{2})(\d)/, "($1) $2"); // Adiciona parênteses e espaço após DDD
  value = value.replace(/(\d{5})(\d)/, "$1-$2"); // Adiciona hífen no meio do número
  e.target.value = value;
});
