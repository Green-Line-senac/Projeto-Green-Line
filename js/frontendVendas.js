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
                        <option value=" " selected disabled >Parcelas</option>
                    </select>
                    <div class="invalid-feedback">Por favor, escolha as parcelas do pagamento</div>
                </div>
        `;
    } else if (pagamentos === "BB") {
        container_pagamentos.innerHTML = `<p>Você escolheu Boleto Bancário. Após a finalização do pedido, um boleto será gerado.</p>`;
    } else if (pagamentos === "PIX") {
        container_pagamentos.innerHTML = `<p>Você escolheu Pix. Após a finalização do pedido, um QR Code será disponibilizado para pagamento.</p>`;
    }
});

//MÁSCARA

function mascaraCEP(input) {
    let valor = input.value.replace(/\D/g, ''); // Remove caracteres não numéricos
    input.value = valor.replace(/^(\d{5})(\d)/, '$1-$2'); // Adiciona o hífen após o quinto dígito
}
