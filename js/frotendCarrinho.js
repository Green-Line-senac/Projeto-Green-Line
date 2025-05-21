let estado = {
    id_pessoa: null,
    produtos: []
};
async function inicializar() {
    try {
        console.log("Iniciando carregamento...");

        const respostaLogin = await fetch("http://localhost:3002/loginDados");
        if (!respostaLogin.ok) throw new Error("Erro na requisição de login");

        const dados = await respostaLogin.json();
        if (!dados.id_pessoa) throw new Error("ID de pessoa não encontrado");

        estado.id_pessoa = dados.id_pessoa;
        console.log("ID Pessoa carregado:", estado.id_pessoa);

        await buscarProdutos();
        await renderizarProdutos(estado.produtos);

    } catch (erro) {
        console.error("Erro na inicialização:", erro);
        // Aqui você poderia mostrar um alerta para o usuário
    }
}

async function buscarProdutos() {
    try {
        console.log("Buscando produtos para ID:", estado.id_pessoa);

        const resposta = await fetch('http://localhost:3006/buscar-produtos', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id_pessoa: estado.id_pessoa })  // Agora enviando como objeto
        });

        if (!resposta.ok) throw new Error("Erro ao buscar produtos");
        let dados = await resposta.json();
        estado.produtos = dados.produtos;
        if (estado.produtos.length === 0) {
            const aviso = document.getElementById('aviso');
            aviso.classList.remove('d-none');
            aviso.innerHTML = "Nenhum produto encontrado"
            setTimeout(aviso.classList.add('d-none'), 5000);
        }
        console.log(estado.produtos);

    } catch (erro) {
        console.error("Erro ao buscar produtos:", erro);
    }
}
async function renderizarProdutos(produtos) {
    const container = document.getElementById('produtos-carrinho');
    container.innerHTML = '';
    if (produtos.promocao == true) {

    }

   produtos.forEach((item, index) => {
    const divProduto = document.createElement("div");
    divProduto.className = "produto-carrinho d-flex";

    divProduto.innerHTML = `
        <div class="flex-shrink-0">
            <img src="${item.imagem_principal}" alt="Produto" class="img-produto">
        </div>
        <div class="flex-grow-1 ms-3">
            <div class="d-flex justify-content-between">
                <div>
                    <h3 class="h6 fw-bold mb-1">${item.nome_produto}</h3>
                    ${item.promocao ? '<span class="badge badge-promocao ms-1">Promoção</span>' : ''}
                </div>
                <button class="btn btn-link text-danger p-0 align-self-start">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            
            <div class="d-flex justify-content-between align-items-center mt-2">
                <div class="d-flex align-items-center">
                    <button class="btn btn-outline-secondary btn-quantidade">-</button>
                    <input type="number" value="2" min="1" class="form-control quantidade-input mx-2">
                    <button class="btn btn-outline-secondary btn-quantidade">+</button>
                </div>
                <div class="text-end">
                    ${!item.promocao ? `<div class="">R$ ${item.preco_unitario}</div>` : `<div class="preco-original">R$ ${item.preco_unitario}</div>`}
                    ${item.promocao ? `<div class="preco-promocao">R$ ${item.preco_promocional}</div>` : ''}
                </div>
            </div>
        </div>
    `;

    container.appendChild(divProduto); // Adiciona ao container
});
}

document.addEventListener("DOMContentLoaded", inicializar);