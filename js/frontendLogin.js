const api = {
  online: "https://green-line-web.onrender.com",
  login: "http://localhost:3001",
  index: "http://localhost:3002",
};

// Elementos do DOM
const formularioLogin = document.getElementById("formularioLogin");
const botaoEntrar = document.getElementById("entrar-na-conta");
const mensagemUsuario = document.getElementById("mensagem-superior");
const campoUsuario = document.getElementById("usuario");
const campoSenha = document.getElementById("senha");

// Configuração inicial
if (
  formularioLogin &&
  botaoEntrar &&
  mensagemUsuario &&
  campoUsuario &&
  campoSenha
) {
  formularioLogin.addEventListener("submit", handleLogin);
} else {
  console.error(
    "Elementos do DOM não encontrados. Verifique os IDs dos elementos."
  );
}

// Função principal de login
async function handleLogin(e) {
  e.preventDefault();

  // Obter valores dos campos
  const usuario = campoUsuario.value.trim();
  const senha = campoSenha.value.trim();

  // Resetar estados
  resetarEstadoLogin();

  // Validação dos campos
  if (!validarCampos(usuario, senha)) {
    return;
  }

  try {
    // Mostrar loading
    showLoading(LoadingPresets.login);
    showButtonLoading(botaoEntrar, 'Entrar na minha conta', 'spinner-only');

    const resposta = await fazerRequisicaoLogin(usuario, senha);

    if (!resposta.ok) {
      tratarErroResposta(resposta);
      return;
    }

    const dados = await resposta.json();
    console.log("Resposta:", dados);

    await processarRespostaLogin(dados, usuario);
  } catch (erro) {
    console.error("Erro no processo de login:", erro);
    // Garantir que o loading seja escondido em caso de erro de conexão
    hideLoading();
    mostrarMensagem("Falha na conexão. Tente novamente.", "danger");
  } finally {
    // Esconder loading (dupla garantia)
    hideLoading();
    hideButtonLoading(botaoEntrar);
    reativarBotao();
  }
}

// Funções auxiliares
function resetarEstadoLogin() {
  mensagemUsuario.textContent = "";
  mensagemUsuario.className = "d-none";
  botaoEntrar.disabled = true;
  botaoEntrar.classList.replace("btn-success", "btn-secondary");
}

function validarCampos(usuario, senha) {
  if (!usuario || !senha) {
    mostrarMensagem("Preencha todos os campos.", "warning");
    reativarBotao();
    return false;
  }

  if (senha.length < 4) {
    mostrarMensagem("A senha deve ter pelo menos 5 caracteres.", "warning");
    reativarBotao();
    return false;
  }

  return true;
}

async function fazerRequisicaoLogin(usuario, senha) {
  return await fetch(`${api.online}/verificarConta`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ usuario, senha }),
  });
}

function tratarErroResposta(resposta) {
  // Garantir que o loading seja escondido imediatamente quando há erro
  hideLoading();
  
  if (resposta.status === 401) {
    mostrarMensagem("Credenciais inválidas ou conta não encontrada.", "danger");
  } else if (resposta.status === 403) {
    mostrarMensagem(
      "Acesso não autorizado. Conta pendente ou bloqueada.",
      "warning"
    );
  } else if (resposta.status >= 500) {
    mostrarMensagem("Erro no servidor. Tente novamente mais tarde.", "danger");
  } else {
    mostrarMensagem("Erro desconhecido. Tente novamente.", "warning");
  }
}

async function processarRespostaLogin(dados, usuario) {
  switch (dados.dadosValidos) {
    case 0:
      hideLoading(); // Esconder loading em caso de erro
      mostrarMensagem("Conta não encontrada.", "danger");
      break;
    case 1:
      hideLoading(); // Esconder loading em caso de conta não verificada
      await tratarContaNaoVerificada(dados, usuario);
      break;
    case 2:
      // Manter loading até o redirecionamento para login bem-sucedido
      await tratarLoginBemSucedido(dados);
      break;
    case 3:
      hideLoading(); // Esconder loading em caso de credenciais inválidas
      mostrarMensagem("Credenciais inválidas.", "danger");
      break;
    default:
      hideLoading(); // Esconder loading em caso de erro desconhecido
      mostrarMensagem("Erro desconhecido.", "warning");
  }
}

async function tratarContaNaoVerificada(dados, usuario) {
  mostrarMensagem(
    "Email não verificado. Verifique sua caixa de entrada.",
    "warning"
  );

  if (usuario.includes("@")) {
    try {
      await fetch(`${api.online}/enviarEmail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ usuario }),
      });
    } catch (erro) {
      console.error("Erro ao enviar o email: ", erro);
      mostrarMensagem("Erro ao enviar email de verificação.", "warning");
    }
  }
}

async function tratarLoginBemSucedido(dados) {
  try {
    // Armazenar dados do usuário de forma segura
    armazenarDadosUsuario(dados);
    console.log("Dados do usuário armazenados com sucesso:", dados.user.id_pessoa + " " + dados.user.email);
    console.log("TIPO DE USUÁRIO VINDO DO BACKEND:", dados.user.tipo_usuario);
    console.log("Usuário logado:", usuario);
    mostrarMensagem("Login realizado com sucesso!", "success");
    // Redirecionar conforme tipo de usuário
    const redirectUrl = dados.user.isAdmin ? "perfilAdm.html" : "../index.html";
    window.location.href = redirectUrl;
  } catch (erro) {
    console.error("Erro ao processar login:", erro);
    mostrarMensagem("Erro ao processar login.", "danger");
    logout(); // Limpar dados em caso de erro
  }
}

function armazenarDadosUsuario(dados) {
  try {
    console.log("Armazenando dados do usuário:", dados);
    sessionStorage.setItem("usuario", dados.user.nome || dados.user.nome_completo || dados.user.email);
    sessionStorage.setItem("userToken", dados.token);
    sessionStorage.setItem("id_pessoa", dados.user.id_pessoa);
    sessionStorage.setItem("userEmail", dados.user.email);
    sessionStorage.setItem("email", dados.user.email); // Garantir compatibilidade com o restante do sistema
    sessionStorage.setItem("userType", dados.user.id_tipo_usuario);
    sessionStorage.setItem("isAdmin", dados.user.isAdmin);
    sessionStorage.setItem("carrinho", dados.user.carrinho || 0);

    // Armazenar data de login para controle de sessão
    sessionStorage.setItem("loginTime", new Date().getTime());
  } catch (e) {
    console.error("Erro ao armazenar dados no sessionStorage:", e);
    throw new Error("Falha ao armazenar dados do usuário");
  }
}

function mostrarMensagem(texto, tipo) {
  if (window.authModern) {
    // Usar o sistema moderno se disponível
    const messageType = tipo === 'danger' ? 'error' : (tipo === 'warning' ? 'error' : 'success');
    window.authModern.showMessage(texto, messageType);
  } else {
    // Fallback para o sistema antigo
    mensagemUsuario.textContent = texto;
    mensagemUsuario.className = `d-block alert text-bg-${tipo} text-center mb-2`;
  }
}

function reativarBotao() {
  botaoEntrar.disabled = false;
  botaoEntrar.classList.replace("btn-secondary", "btn-success");
}

// Função de logout melhorada
function logout() {
  // Limpar todos os dados de autenticação
  const itemsToRemove = [
    "userToken",
    "userId",
    "userEmail",
    "userType",
    "usuario",
    "loginTime",
  ];

  itemsToRemove.forEach((item) => sessionStorage.removeItem(item));

  // Redirecionar para login com parâmetro de logout
  window.location.href = "login.html?logout=success";
}
document.getElementById("senha").addEventListener("input", function (e) {
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

// Verificar parâmetro de logout na URL
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("logout") && urlParams.get("logout") === "success") {
    mostrarMensagem("Você foi desconectado com sucesso.", "success");
  }
});

// Exportar funções para teste (se estiver usando módulos)
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    handleLogin,
    validarCampos,
    armazenarDadosUsuario,
    logout,
  };
}
