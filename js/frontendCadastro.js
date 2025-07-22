import { Usuario } from "./classeUsuario.js";

// Variáveis
const api = {
  online: "https://green-line-web.onrender.com",
  cadastro: "http://localhost:3000",
};

const formularioCadastro = document.getElementById("formularioCadastro");
formularioCadastro.addEventListener("submit", async function (e) {
  e.preventDefault();

  const btEnviar = document.getElementById("cadastrar-usuario");
  const originalText = btEnviar.innerHTML;

  try {
    // Mostra loading
    btEnviar.disabled = true;
    btEnviar.innerHTML = `
      <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
    `;

    // Obtém valores
    const nome = document.getElementById("username").value.trim();
    const cpf = removePunctuationAndSpaces(
      document.getElementById("cpf").value.trim()
    );
    const email = document.getElementById("email").value.trim();
    const telefone = removePunctuationAndSpaces(
      document.getElementById("telefone").value.trim()
    );
    const senha = document.getElementById("password").value;

    // Cria e salva usuário (note a ordem correta dos parâmetros)
    const usuario = new Usuario(nome, email, telefone, cpf, senha);
    await usuario.salvarUsuario();
  } catch (error) {
    console.error("Erro no cadastro:", error);
    alert(error.message || "Erro ao cadastrar usuário");
  } finally {
    // Restaura o botão
    btEnviar.disabled = false;
    btEnviar.innerHTML = originalText;
  }
});
function removePunctuationAndSpaces(text) {
  if (text == null) {
    return null;
  }
  return text.replace(/[.\-\s()]/g, "");
}

document.getElementById("username").addEventListener("input", function (e) {
  const value = e.target.value;

  const maskedValue = value.replace(/[^a-zA-Z\s\u00C0-\u00FF]/g, "");
  e.target.value = maskedValue;
});

// Máscaras (melhoradas)
document.getElementById("cpf").addEventListener("input", function (e) {
  let value = e.target.value.replace(/\D/g, "");

  if (value.length > 11) value = value.substring(0, 11);

  value = value
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

  e.target.value = value;
});

document.getElementById("telefone").addEventListener("input", function (e) {
  let value = e.target.value.replace(/\D/g, "");

  // Limita a 11 dígitos (DDD + 9 dígitos)
  if (value.length > 11) value = value.substring(0, 11);

  value = value
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");

  e.target.value = value;
});
