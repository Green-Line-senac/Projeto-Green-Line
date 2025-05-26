// Alteração dinâmica do método de pagamento
document.getElementById("pagamento").addEventListener("change", function () {
    let pagamentos = this.value;
    let container_pagamentos = document.getElementById("container-pagamentos");

    // Limpa o conteúdo anterior
    container_pagamentos.innerHTML = "";

    if (pagamentos === "CC") {
        container_pagamentos.innerHTML = `
            <div class="form-floating mb-3 flex-grow-1">
                <input type="text" name="numero-cartao" class="form-control" id="numero-cartao"
                    placeholder="Digite o número do cartão" required maxlength="16">
                <label for="numero-cartao">Número do cartão</label>
                <div class="invalid-feedback">Por favor, insira o número do cartão.</div>
            </div>
            <div class="form-floating mb-3 flex-grow-1">
                <input type="text" name="nome-cartao" class="form-control" id="nome-cartao"
                    placeholder="Nome no cartão" maxlength="30">
                <label for="nome-cartao">Nome no cartão</label>
                <div class="invalid-feedback">Por favor, insira o nome contido no cartão.</div>
            </div>
            <div class="d-flex gap-3">
                <div class="form-floating mb-3 flex-grow-1">
                    <input type="text" name="validade-cartao" class="form-control" id="validade-cartao"
                        placeholder="Validade do cartão" required maxlength="5">
                    <label for="validade-cartao">Validade do cartão (MM/AA)</label>
                    <div class="invalid-feedback">Por favor, insira a validade do cartão.</div>
                </div>
                <div class="form-floating mb-3 flex-grow-1">
                    <input type="text" name="cvv" class="form-control" id="cvv"
                        placeholder="Código de segurança" required maxlength="4">
                    <label for="cvv">CVV</label>
                    <div class="invalid-feedback">Por favor, insira o código de segurança.</div>
                </div>
            </div>
            <div class="form-floating mb-3 flex-grow-0">
                <select name="parcelas" id="parcelas" class="form-select" required>
                    <option value="" selected disabled>Parcelas</option>
                </select>
                <div class="invalid-feedback">Por favor, escolha as parcelas do pagamento</div>
            </div>
        `;

        // Aplica máscaras após renderizar os inputs
        setTimeout(() => {
            const validadeInput = document.getElementById("validade-cartao");
            const cvvInput = document.getElementById("cvv");

            validadeInput.addEventListener("input", () => {
                validadeInput.value = validadeInput.value
                    .replace(/\D/g, '')
                    .replace(/(\d{2})(\d{1,2})/, '$1/$2')
                    .slice(0, 5);
            });

            cvvInput.addEventListener("input", () => {
                cvvInput.value = cvvInput.value.replace(/\D/g, '').slice(0, 4);
            });

            // Preenche parcelas com base no preço
            const dadosCompra = JSON.parse(localStorage.getItem("dadosCompra"));
            if (dadosCompra && dadosCompra.preco) {
                const selectParcelas = document.getElementById("parcelas");
                const preco = parseFloat(dadosCompra.preco);

                for (let i = 1; i <= 12; i++) {
                    const option = document.createElement("option");
                    const valorParcela = (preco / i).toFixed(2).replace('.', ',');
                    option.value = `${i}x`;
                    option.text = `${i}x de R$ ${valorParcela}`;
                    selectParcelas.appendChild(option);
                }
            }
        }, 0);

    } else if (pagamentos === "BB") {
        container_pagamentos.innerHTML = `<p>Você escolheu Boleto Bancário. Após a finalização do pedido, um boleto será gerado.</p>`;
    } else if (pagamentos === "PIX") {
        container_pagamentos.innerHTML = `<p>Você escolheu Pix. Após a finalização do pedido, um QR Code será disponibilizado para pagamento.</p>`;
    }
});

// Máscara para CEP
function mascaraCEP(input) {
    let valor = input.value.replace(/\D/g, '');
    input.value = valor.replace(/^(\d{5})(\d)/, '$1-$2');
}

// Exibe informações do produto selecionado
document.addEventListener("DOMContentLoaded", () => {
    const dadosCompra = JSON.parse(localStorage.getItem("dadosCompra"));
    const containerProdutos = document.querySelector(".container-produtos-vendas");

    if (dadosCompra) {
        console.log("Compra carregada:", dadosCompra); // <--- debug útil

        const precoFormatado = parseFloat(dadosCompra.preco).toFixed(2).replace(".", ",");
        const subtotalFormatado = parseFloat(dadosCompra.subtotal).toFixed(2).replace(".", ",");

        containerProdutos.innerHTML = `
            <p><strong>Produto:</strong> ${dadosCompra.nomeProduto}</p>
            <p><strong>Preço unitário:</strong> R$ ${precoFormatado}</p>
            <p><strong>Quantidade:</strong> ${dadosCompra.quantidade}</p>
        `;

        // Atualiza os contadores de valores no resumo
        document.getElementById("contador-subtotal").textContent = `R$ ${subtotalFormatado}`;
        document.getElementById("contador-total").textContent = `R$ ${subtotalFormatado}`; // sem frete por enquanto
    } else {
        containerProdutos.innerHTML = "<p>Nenhum produto selecionado.</p>";
    }
});



