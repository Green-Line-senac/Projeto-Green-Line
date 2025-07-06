let elementosHTML = {
  iconeUsuario: document.getElementById("icone-usuario"),
  badgeCarrinho: document.getElementById("badge-carrinho"),
  link_usuario: document.getElementById("link-usuario"),
};
const api = {
  online: "https://green-line-web.onrender.com",
  index: "http://localhost:3002",
  produto: "http://localhost:3003",
  carrinho: "http://localhost:3006",
  vendas: "http://localhost:3009",
  perfil: "http://localhost:3008",
  login: "http://localhost:3001",
  cadastro_produto: "http://localhost:3005",
  cadastro: "http://localhost:3000",
};
const basePath = window.location.pathname.includes("green_line_web")
          ? "/green_line_web/public"
          : "/public";

function mostrarFeedback(mensagem, tipo = "success") {
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-white bg-${tipo} border-0 position-fixed bottom-0 end-0`;
  toast.style.zIndex = 1100;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${escapeHtml(mensagem)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  document.body.appendChild(toast);
  new bootstrap.Toast(toast).show();
  setTimeout(() => toast.remove(), 5000);
}
// Função para verificar estado de login
async function verificarEstadoLogin() {
  if (
    !elementosHTML.iconeUsuario ||
    !elementosHTML.badgeCarrinho ||
    !elementosHTML.link_usuario
  )
    return;

  try {
    //1 - Verifica se o usuário está logado por meio do Session Storage
    let dadosUsuario = {
      id_pessoa: sessionStorage.getItem("id_pessoa") || null,
      email: sessionStorage.getItem("userEmail") || null,
      adm: sessionStorage.getItem("isAdmin") || false,
      usuario: sessionStorage.getItem("usuario") || null,
      quantidade_produtos: sessionStorage.getItem("carrinho") || 0,
      logado: false,
    };
    if (dadosUsuario.id_pessoa) {
      dadosUsuario.logado = true;
    }

    if (dadosUsuario?.logado === true) {
      elementosHTML.iconeUsuario.className = "bi bi-person-check text-success";
      elementosHTML.iconeUsuario.title = "Usuário logado";
      if (dadosUsuario?.adm === true) {
        // Se for administrador
        elementosHTML.link_usuario.href = `${basePath}/perfilAdm.html`;
      } else {
        elementosHTML.link_usuario.href = `${basePath}/perfil.html`;
      }
    } else {
      // Reseta para estado não logado
      elementosHTML.iconeUsuario.className = "bi bi-person";
      elementosHTML.iconeUsuario.title = "Fazer login";

      elementosHTML.link_usuario.href = `${basePath}/login.html`;
    }

    // Atualiza carrinho
    elementosHTML.badgeCarrinho.innerText =
      dadosUsuario?.quantidade_produtos > 0
        ? dadosUsuario.quantidade_produtos
        : "";
  } catch (erro) {
    sessionStorage.clear(); // Limpa em caso de erro
    console.error("Erro ao verificar login:", erro.message);
    mostrarFeedback(erro.message, "danger");
    dadosUsuario = {
      id_pessoa: null,
      email: null,
      adm: false,
      usuario: null,
      quantidade_produtos: 0,
      logado: false,
    };
  }
}
function logout() {
  try {
    // Limpar apenas os itens específicos do sessionStorage
    const itemsToRemove = [
      "userToken",
      "id_pessoa",
      "userEmail",
      "userType",
      "usuario",
      "loginTime",
    ];

    itemsToRemove.forEach((item) => sessionStorage.removeItem(item));
    sessionStorage.clear();

    console.log("SessionStorage limpo com sucesso.");
  } catch (error) {
    console.error("Erro ao limpar sessionStorage:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await verificarEstadoLogin();
});
