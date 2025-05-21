produtos.forEach((item) => {
    const divProduto = document.createElement("div");
    divProduto.className = "produto-carrinho d-flex button";

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
                    <span class="text-muted">Quantidade: ${item.quantidade}</span>
                </div>
                <div class="text-end">
                    ${!item.promocao ? `<div class="">R$ ${item.preco_unitario}</div>` : `<div class="preco-original">R$ ${item.preco_unitario}</div>`}
                    ${item.promocao ? `<div class="preco-promocao">R$ ${item.preco_promocional}</div>` : ''}
                </div>
            </div>
        </div>
    `;

    // Definindo um método para a div
    divProduto.atualizarQuantidade = function (novaQuantidade) {
        const quantidadeSpan = this.querySelector(".text-muted");
        if (quantidadeSpan) {
            quantidadeSpan.textContent = `Quantidade: ${novaQuantidade}`;
        }
    };

    container.appendChild(divProduto); // Adiciona ao container

    // Exemplo de chamada do método
    setTimeout(() => {
        divProduto.atualizarQuantidade(item.quantidade + 1); // Atualiza a quantidade após 3 segundos
    }, 3000);
});