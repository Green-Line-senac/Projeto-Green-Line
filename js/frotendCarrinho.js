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

    produtos.forEach((item) => {
        const divProduto = document.createElement("div");
        divProduto.className = "produto-carrinho d-flex button";
        divProduto.setAttribute("data-id", item.id_produto);
        divProduto.setAttribute("data-id-carrinho".item.id_carrinho);

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
                    <button class="btn btn-link text-danger p-0 align-self-start excluir-produto">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>

                <div class="d-flex justify-content-between align-items-center mt-2">
                    <div class="d-flex align-items-center">
                        <span class="text-muted">Quantidade: ${item.quantidade}</span>
                    </div>
                    <div class="text-end">
                        ${!item.promocao ? `<div class="">R$ ${item.preco_unitario}</div>` : `<div class="preco-original">R$ ${item.preco_unitario}</div>`}
                        ${item.promocao ? `<div class="preco-promocao">R$ ${item.preco_promocional}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
        divProduto.querySelector(".excluir-produto").addEventListener("click", async () => {
            let id_produto_Excluir = divProduto.getAttribute("data-id");
            let id_carrinho = div.Produto.getAttribute("data-id_carrinho");
            let produtoSelecionado = estado.produtos.find(item => item.id_produto == id_produto);
            const requisicao = await fetch('http://localhost:3006/excluir-produtos', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_pessoa: estado.id_pessoa, id_produto: id_produto_Excluir, id_carrinho: id_carrinho })  // Agora enviando como objeto
            });

            if (!resposta.ok) throw new Error("Erro ao excluir produtos");
            
        });

        container.appendChild(divProduto); // Adiciona ao container
    });
}
function subtotal() {
    let total = document.getElementById('total');
    let quantidade = document.getElementById('quantidade-itens');
    let valor = 0;
    let quant = 0
    estado.produtos.forEach((item) => {
        valor += parseFloat(item.subtotal);
        quant += parseInt(item.quantidade);
    });
    quantidade.innerHTML = Number(quant.toFixed(2)) || 0;
    total.innerHTML = Number(valor.toFixed(2)) || 0;
}

document.addEventListener("DOMContentLoaded", async () => {

    await inicializar();
    await subtotal();
});

