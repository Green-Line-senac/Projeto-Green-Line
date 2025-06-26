let elementosHTML = {
  iconeUsuario: document.getElementById("icone-usuario"),
  badgeCarrinho: document.getElementById("badge-carrinho"),
  link_usuario: document.getElementById("link-usuario"),
  administracao: document.getElementById("admDropdown")
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
// Função para verificar estado de login
async function verificarEstadoLogin() {
  if (
    !elementosHTML.iconeUsuario ||
    !elementosHTML.badgeCarrinho ||
    !elementosHTML.link_usuario
  )
    return;

  try {
    let response = await fetch(`${api.online}/loginDados`);

    if (!response.ok) {
      // Se houver erro, limpa o localStorage (usuário não está logado)
      localStorage.removeItem("id_pessoa");
      console.error("Erro na resposta do servidor:", response.statusText);
      return;
    }

    let dados = await response.json();
    console.log("Dados do login:", dados);

    // SÓ armazena no localStorage se houver um usuário válido logado
    if (dados.id_pessoa) {
      localStorage.setItem("id_pessoa", dados.id_pessoa);
    } else {
      localStorage.removeItem("id_pessoa"); // Limpa se não estiver logado
    }

    // Restante da sua lógica...
    if (dados?.trocarDeConta === 1 || dados?.trocar === 1) {
      elementosHTML.iconeUsuario.className = "bi bi-person-check text-success";
      elementosHTML.iconeUsuario.title = "Usuário logado";
      elementosHTML.link_usuario.href = "/green_line_web/public/perfil.html" || "../public/perfil.html";
    } else {
      // Reseta para estado não logado
      elementosHTML.iconeUsuario.className = "bi bi-person";
      elementosHTML.iconeUsuario.title = "Fazer login";
      elementosHTML.link_usuario.href = "/green_line_web/public/login.html" || "../public/login.html";
    }

    // Atualiza carrinho
    elementosHTML.badgeCarrinho.innerText =
      dados?.quantidade_produtos > 0 ? dados.quantidade_produtos : "";

      let tipo_usuario = Number(dados?.tipo_usuario || 2);
    // Administração
    if (elementosHTML.administracao) {
      if (tipo_usuario === 1) {
        elementosHTML.administracao.classList.remove("d-none");
      } else {
        elementosHTML.administracao.classList.add("d-none");
      }
    }
  } catch (erro) {
    localStorage.removeItem("id_pessoa"); // Limpa em caso de erro
    console.error("Erro ao verificar login:", erro.message);
  }
}
async function logout() {
  try {
    //1 - Fazer a requisição de logout
    let requisicao = await fetch(`${api.online}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    //2 - Verificar se a requisição foi bem sucedida
    if (!requisicao.ok) {
      throw new Error("Erro ao fazer logout");
    }
    //3 - Converter a resposta para JSON
    let resposta = await requisicao.json();
    if (resposta.status !== "success") {
        window.location.href = "../index.html";
      throw new Error("Erro ao fazer logout: " + resposta.message);
    } else {
      // Limpar todos os dados de autenticação
      const itemsToRemove = [
        "userToken",
        "id_pessoa",
        "userEmail",
        "userType",
        "usuario",
        "loginTime",
      ];

      itemsToRemove.forEach((item) => localStorage.removeItem(item));
      localStorage.clear();

      // Redirecionar para login
      window.location.href = "login.html?logout=success";
    }
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    window.location.href = "login.html";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await verificarEstadoLogin();
});
window.addEventListener("unload", () => {
  logout();
});
