document.addEventListener('DOMContentLoaded', async () => {
    await verificarEstadoLogin();
});

let elementosHTML = {
    iconeUsuario: document.getElementById('icone-usuario'),
    badgeCarrinho: document.getElementById('badge-carrinho'),
    link_usuario: document.getElementById('link-usuario'),
    administracao: document.getElementById('admDropdown')
};

// Função para verificar estado de login
async function verificarEstadoLogin() {
    // Garante que os elementos HTML necessários existem antes de continuar
    if (!elementosHTML.iconeUsuario || !elementosHTML.badgeCarrinho || !elementosHTML.link_usuario) return;

    try {
        let response = await fetch("http://localhost:3002/loginDados");

        if (!response.ok) {
            console.error("Erro na resposta do servidor:", response.statusText);
            return;
        }

        let dados = await response.json();
        console.log("Dados do login:", dados);
        localStorage.setItem("id_pessoa",dados.id_pessoa);

        // Atualiza ícone do usuário e redirecionamento do perfil
        if (dados?.trocarDeConta === 1 || dados?.trocar === 1) {
            elementosHTML.iconeUsuario.className = "bi bi-person-check text-success";
            elementosHTML.iconeUsuario.title = "Usuário logado";
            elementosHTML.link_usuario.href = "../public/perfil.html";
        }

        // Atualiza quantidade de itens no carrinho
        if (dados?.quantidade_produtos > 0) {
            elementosHTML.badgeCarrinho.innerText = dados.quantidade_produtos || 0;
        } else {
            elementosHTML.badgeCarrinho.innerText = "";
        }

        // Exibe administração se usuário for tipo 1
        if (dados?.tipo_usuario === 1 && elementosHTML.administracao) {
            elementosHTML.administracao.classList.remove("d-none");
        }

    } catch (erro) {
        console.error("Erro ao verificar login:", erro.message);
    }
}