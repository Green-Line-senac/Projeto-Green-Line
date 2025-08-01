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
    // Limpar mensagens anteriores
    if (window.authModern) {
      window.authModern.hideMessage();
      window.authModern.hideAllValidationMessages();
      window.authModern.setButtonLoading('cadastrar-usuario', true);
    } else {
      // Fallback para sistema antigo
      btEnviar.disabled = true;
      btEnviar.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
      `;
    }

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
    if (window.authModern) {
      window.authModern.showMessage(error.message || "Erro ao cadastrar usuário", "error");
    } else {
      alert(error.message || "Erro ao cadastrar usuário");
    }
  } finally {
    // Restaura o botão
    if (window.authModern) {
      window.authModern.setButtonLoading('cadastrar-usuario', false);
    } else {
      btEnviar.disabled = false;
      btEnviar.innerHTML = originalText;
    }
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
document.getElementById("password").addEventListener("input", function (e) {
  const value = e.target.value;
  const erroElement = document.getElementById("erro");

  // Impede mais de 5 caracteres
  if (value.length > 5) {
    e.target.value = value.substring(0, 5);
    return;
  }

  // Valida quando tiver 5 caracteres
  if (value.length === 5) {
    const hasLetter = /[a-zA-Z]/.test(value);
    const hasNumber = /\d/.test(value);

    if (!hasLetter || !hasNumber) {
      erroElement.style.display = "block";
      e.target.value = ""; // Limpa se não for válido
    } else {
      erroElement.style.display = "none";
    }
  } else {
    erroElement.style.display = "none";
  }
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
