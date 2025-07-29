// Configuração da API
const api = {
  online: "https://green-line-web.onrender.com",
};

// Elementos do DOM
const formularioRecuperar = document.getElementById("formularioRecuperar");
const botaoEnviar = document.getElementById("enviar-recuperacao");
const campoEmail = document.getElementById("email");

// Configuração inicial
if (formularioRecuperar && botaoEnviar && campoEmail) {
  formularioRecuperar.addEventListener("submit", handleRecuperacao);
} else {
  console.error(
    "Elementos do DOM não encontrados. Verifique os IDs dos elementos."
  );
}

// Função principal de recuperação de senha
async function handleRecuperacao(e) {
  e.preventDefault();

  // Obter valor do email
  const email = campoEmail.value.trim();

  // Limpar mensagens anteriores
  if (window.authModern) {
    window.authModern.hideMessage();
  }

  // Validação do email
  if (!validarEmail(email)) {
    return;
  }

  try {
    // Mostrar loading no botão
    if (window.authModern) {
      window.authModern.setButtonLoading(
        "enviar-recuperacao",
        true,
        "spinner-only"
      );
    } else {
      botaoEnviar.disabled = true;
      botaoEnviar.textContent = "Enviando...";
    }

    const resposta = await fazerRequisicaoRecuperacao(email);

    if (!resposta.ok) {
      tratarErroResposta(resposta);
      return;
    }

    const dados = await resposta.json();
    console.log("Resposta:", dados);

    processarRespostaRecuperacao(dados, email);
  } catch (erro) {
    console.error("Erro no processo de recuperação:", erro);
    mostrarMensagem("Falha na conexão. Tente novamente.", "error");
  } finally {
    // Esconder loading
    if (window.authModern) {
      window.authModern.setButtonLoading("enviar-recuperacao", false);
    } else {
      botaoEnviar.disabled = false;
      botaoEnviar.textContent = "Enviar instruções";
    }
  }
}

// Funções auxiliares
function validarEmail(email) {
  if (!email) {
    mostrarMensagem("Por favor, digite seu email.", "error");
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    mostrarMensagem("Por favor, digite um email válido.", "error");
    return false;
  }

  return true;
}

async function fazerRequisicaoRecuperacao(email) {
  return await fetch(`${api.online}/recuperar-senha`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email }),
  });
}

function tratarErroResposta(resposta) {
  if (resposta.status === 404) {
    mostrarMensagem("Email não encontrado em nossa base de dados.", "error");
  } else if (resposta.status >= 500) {
    mostrarMensagem("Erro no servidor. Tente novamente mais tarde.", "error");
  } else {
    mostrarMensagem("Erro desconhecido. Tente novamente.", "error");
  }
}

function processarRespostaRecuperacao(dados, email) {
  // Sempre mostrar a mesma mensagem, independente do email existir ou não
  if (dados.conclusao === 2) {
    mostrarMensagemHTML(email); // Mantém a mesma aparência
    campoEmail.value = "";
    iniciarRedirecionamentoReset();
  } else {
    mostrarMensagem(
      "Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.",
      "error"
    );
  }
}

function mostrarMensagem(texto, tipo) {
  if (window.authModern) {
    // Usar o sistema moderno se disponível
    window.authModern.showMessage(texto, tipo);
  } else {
    // Fallback para o sistema antigo
    console.log(`${tipo}: ${texto}`);
  }
}

function mostrarMensagemHTML(email) {
  if (window.authModern) {
    // Criar elementos DOM ao invés de string HTML
    const container = document.createElement("div");
    container.style.textAlign = "center";

    const titulo = document.createElement("h4");
    titulo.style.color = "#28a745";
    titulo.style.marginBottom = "15px";
    titulo.textContent = "📧 Instruções enviadas!";

    const paragrafo1 = document.createElement("p");
    paragrafo1.style.marginBottom = "10px";
    paragrafo1.textContent = "Enviamos um link para redefinir sua senha para:";

    const emailParagrafo = document.createElement("p");
    emailParagrafo.style.fontWeight = "bold";
    emailParagrafo.style.color = "#28a745";
    emailParagrafo.style.marginBottom = "15px";
    emailParagrafo.textContent = email;

    const paragrafo2 = document.createElement("p");
    paragrafo2.style.marginBottom = "10px";
    paragrafo2.textContent =
      "🔑 Verifique sua caixa de entrada e clique no link para criar uma nova senha.";

    const paragrafo3 = document.createElement("p");
    paragrafo3.style.fontSize = "0.9rem";
    paragrafo3.style.color = "#6c757d";
    paragrafo3.style.marginBottom = "15px";
    paragrafo3.textContent =
      "Não encontrou o email? Verifique a pasta de spam.";

    const divContador = document.createElement("div");
    divContador.style.background = "#e8f5e8";
    divContador.style.padding = "10px";
    divContador.style.borderRadius = "8px";
    divContador.style.marginBottom = "15px";

    const paragrafoContador = document.createElement("p");
    paragrafoContador.style.margin = "0";
    paragrafoContador.style.fontSize = "0.9rem";
    paragrafoContador.innerHTML =
      '⏰ Você será redirecionado para o login em <span id="countdown-reset">10</span> segundos';

    divContador.appendChild(paragrafoContador);

    container.appendChild(titulo);
    container.appendChild(paragrafo1);
    container.appendChild(emailParagrafo);
    container.appendChild(paragrafo2);
    container.appendChild(paragrafo3);
    container.appendChild(divContador);

    // Usar o sistema authModern diretamente com o elemento DOM
    window.authModern.showMessage(container, "success");
  } else {
    // Fallback simples
    console.log("Instruções enviadas para:", email);
  }
}

// Limpar mensagens quando o usuário começar a digitar
campoEmail.addEventListener("input", function () {
  if (window.authModern) {
    window.authModern.hideMessage();
  }
});

// Formatação e validação em tempo real
campoEmail.addEventListener("blur", function () {
  const email = this.value.trim();
  if (email && !window.authModern.isValidEmail(email)) {
    mostrarMensagem("Por favor, digite um email válido.", "error");
  }
});

// Função para iniciar contagem regressiva e redirecionamento para reset de senha
function iniciarRedirecionamentoReset() {
  let contador = 10;

  // Atualizar contador a cada segundo
  const intervalo = setInterval(() => {
    const elementoContador = document.getElementById("countdown-reset");
    if (elementoContador) {
      elementoContador.textContent = contador;
    }

    contador--;

    // Quando chegar a 0, redirecionar
    if (contador < 0) {
      clearInterval(intervalo);
      redirecionarParaLogin();
    }
  }, 1000);

  // Permitir que o usuário cancele o redirecionamento clicando em qualquer lugar
  const cancelarRedirecionamento = () => {
    clearInterval(intervalo);
    document.removeEventListener("click", cancelarRedirecionamento);

    // Atualizar mensagem para mostrar que foi cancelado
    mostrarMensagemCancelada();
  };

  // Adicionar listener para cancelar redirecionamento
  setTimeout(() => {
    document.addEventListener("click", cancelarRedirecionamento, {
      once: true,
    });
  }, 1000); // Aguardar 1 segundo antes de permitir cancelamento
}

function mostrarMensagemCancelada() {
  if (window.authModern) {
    // Criar elementos DOM para mensagem cancelada
    const container = document.createElement("div");
    container.style.textAlign = "center";

    const titulo = document.createElement("h4");
    titulo.style.color = "#28a745";
    titulo.style.marginBottom = "15px";
    titulo.textContent = "📧 Instruções enviadas!";

    const paragrafo1 = document.createElement("p");
    paragrafo1.style.marginBottom = "10px";
    paragrafo1.textContent =
      "Enviamos um link para redefinir sua senha para seu email.";

    const paragrafo2 = document.createElement("p");
    paragrafo2.style.marginBottom = "10px";
    paragrafo2.textContent =
      "🔑 Verifique sua caixa de entrada e clique no link para criar uma nova senha.";

    const paragrafo3 = document.createElement("p");
    paragrafo3.style.fontSize = "0.9rem";
    paragrafo3.style.color = "#6c757d";
    paragrafo3.style.marginBottom = "15px";
    paragrafo3.textContent =
      "Não encontrou o email? Verifique a pasta de spam.";

    const divCancelado = document.createElement("div");
    divCancelado.style.background = "#fff3cd";
    divCancelado.style.padding = "10px";
    divCancelado.style.borderRadius = "8px";
    divCancelado.style.marginBottom = "15px";
    divCancelado.style.border = "1px solid #ffeaa7";

    const paragrafoCancelado = document.createElement("p");
    paragrafoCancelado.style.margin = "0";
    paragrafoCancelado.style.fontSize = "0.9rem";
    paragrafoCancelado.style.color = "#856404";
    paragrafoCancelado.textContent = "⏸️ Redirecionamento cancelado. ";

    const linkLogin = document.createElement("a");
    linkLogin.href = "login.html";
    linkLogin.style.color = "#28a745";
    linkLogin.style.textDecoration = "underline";
    linkLogin.textContent = "Clique aqui para ir ao login";

    paragrafoCancelado.appendChild(linkLogin);
    divCancelado.appendChild(paragrafoCancelado);

    container.appendChild(titulo);
    container.appendChild(paragrafo1);
    container.appendChild(paragrafo2);
    container.appendChild(paragrafo3);
    container.appendChild(divCancelado);

    // Usar o sistema authModern diretamente com o elemento DOM
    window.authModern.showMessage(container, "success");
  } else {
    console.log("Redirecionamento cancelado");
  }
}

// Função para redirecionar para a página de login
function redirecionarParaLogin() {
  // Mostrar mensagem final antes do redirecionamento
  if (window.authModern) {
    window.authModern.showMessage("Redirecionando para o login...", "success");
  }

  // Redirecionar após um breve delay
  setTimeout(() => {
    window.location.href = "login.html";
  }, 500);
}
