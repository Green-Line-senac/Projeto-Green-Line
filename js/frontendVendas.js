const api = {
    online: 'https://green-line-web.onrender.com',
    vendas: 'http://localhost:3009'
}
// Alteração dinâmica do método de pagamento
document.getElementById("pagamento").addEventListener("change", function () {
    let pagamentos = this.value;
    let container_pagamentos = document.getElementById("container-pagamentos");

    // Limpa o conteúdo anterior
    container_pagamentos.innerHTML = "";

    if (pagamentos === "CC") {
        container_pagamentos.innerHTML = `
          <div class="row g-3">
    <!-- Número do Cartão -->
    <div class="col-12">
        <div class="form-floating py-2 mb-3">
            <input type="text" name="numero-cartao" class="form-control" id="numero-cartao"
                placeholder="Digite o número do cartão" required maxlength="19">
            <label for="numero-cartao">Número do cartão</label>
            <div class="invalid-feedback">Por favor, insira o número do cartão.</div>
        </div>
    </div>

    <!-- Nome no Cartão -->
    <div class="col-12">
        <div class="form-floating py-2 mb-3">
            <input type="text" name="nome-cartao" class="form-control" id="nome-cartao"
                placeholder="Nome no cartão" maxlength="30" pattern="[a-zA-ZÀ-ÿ\s]+">
            <label for="nome-cartao">Nome no cartão</label>
            <div class="invalid-feedback">Por favor, insira o nome contido no cartão (apenas letras).</div>
        </div>
    </div>

    <!-- Validade e CVV -->
    <div class="col-12">
        <div class="row g-3">
            <!-- Validade (MM/AA) -->
            <div class="col-md-6">
                <div class="form-floating py-2 mb-3">
                    <input type="text" name="validade-cartao" class="form-control" id="validade-cartao"
                        placeholder="MM/AA" required maxlength="5" pattern="\d{2}/\d{2}">
                    <label for="validade-cartao">Validade (MM/AA)</label>
                    <div class="invalid-feedback">Formato: MM/AA (ex: 12/25)</div>
                </div>
            </div>
            
            <!-- CVV -->
            <div class="col-md-6">
                <div class="form-floating py-2 mb-3">
                    <input type="text" name="cvv" class="form-control" id="cvv"
                        placeholder="CVV" required maxlength="4" pattern="\d{3,4}">
                    <label for="cvv">Código de Segurança</label>
                    <div class="invalid-feedback">3 ou 4 dígitos</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Parcelas -->
    <div class="col-12">
        <div class="form-floating py-2 mb-3">
            <select name="parcelas" id="parcelas" class="form-select" required>
                <option value="" selected disabled>Selecione as parcelas</option>
                <!-- Opções serão preenchidas via JavaScript -->
            </select>
            <label for="parcelas">Parcelamento</label>
            <div class="invalid-feedback">Por favor, escolha as parcelas</div>
        </div>
    </div>
</div>
        `;

                  const dadosCompra = JSON.parse(localStorage.getItem("dadosCompra"));
        if (dadosCompra) {
            const selectParcelas = document.getElementById("parcelas");
            
            let valorTotal = 0;
            
            if (Array.isArray(dadosCompra)) {
                dadosCompra.forEach(item => {
                    const preco = typeof item.preco_final === 'string' 
                        ? parseFloat(item.preco_final.replace(',', '.')) 
                        : Number(item.preco_final);
                    valorTotal += isNaN(preco) ? 0 : preco;
                });
            }
            else if (dadosCompra.preco_final) {
                valorTotal = typeof dadosCompra.preco_final === 'string' 
                    ? parseFloat(dadosCompra.preco_final.replace(',', '.')) 
                    : Number(dadosCompra.preco_final);
            }
            console.log("Valor total calculado:", valorTotal);
            selectParcelas.innerHTML = '<option value="" selected disabled>Parcelas</option>';
            
            // Gera as parcelas
            for (let i = 1; i <= 12; i++) {
                const option = document.createElement("option");
                const valorParcela = valorTotal / i;
                
                option.value = `${i}x`;
                option.text = `${i}x de ${valorParcela.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                })}`;
                
                selectParcelas.appendChild(option);
            }
        }

        // Aplica máscaras após renderizar os inputs
setTimeout(() => {
    const validadeInput = document.getElementById("validade-cartao");
    const cvvInput = document.getElementById("cvv");
    const numeroCartaoInput = document.getElementById("numero-cartao");
    const nomeCartaoInput = document.getElementById("nome-cartao");

    // Máscara para o número do cartão
    numeroCartaoInput.addEventListener("input", (e) => {
        e.target.value = e.target.value
            .replace(/\D/g, '') // Remove tudo que não é dígito
            .replace(/(\d{4})(?=\d)/g, '$1 ') // Adiciona espaço a cada 4 dígitos
            .slice(0, 19); // Limita a 16 dígitos + 3 espaços
    });

    nomeCartaoInput.addEventListener("input", (e) => {
        // Permite apenas letras, espaços e acentos
        e.target.value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');
        
        // Limita a 30 caracteres
        if (e.target.value.length > 30) {
            e.target.value = e.target.value.substring(0, 30);
        }
    });

    validadeInput.addEventListener("input", (e) => {
        e.target.value = e.target.value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d{1,2})/, '$1/$2')
            .slice(0, 5);
    });

    cvvInput.addEventListener("input", (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
    }); }, 0);

    } else if (pagamentos === "BB") {
        container_pagamentos.innerHTML = `<p>Você escolheu Boleto Bancário. Após a finalização do pedido, um boleto será gerado.</p>`;
    } else if (pagamentos === "PIX") {
        container_pagamentos.innerHTML = `<p>Você escolheu Pix. Após a finalização do pedido, um QR Code será disponibilizado para pagamento.</p>`;
    }
});

function formatarCEP(input) {
    // Formata em tempo real (ex.: "12345678" → "12345-678")
    let cep = input.value.replace(/\D/g, '');
    if (cep.length > 5) {
        cep = cep.substring(0, 5) + '-' + cep.substring(5, 8);
    }
    input.value = cep;
}

async function validarCEP(input) {
    // Consulta o servidor quando o campo perde o foco
    let cep = input.value.replace(/\D/g, '');
    if (cep.length === 8) {
        await mascaraCEP(); // Sua função original
    }
}

async function mascaraCEP() {
    console.log('Função mascaraCEP iniciada'); 
    
    const cepInput = document.getElementById('cep');
    const bairroInput = document.getElementById('bairro');
    const enderecoInput = document.getElementById('endereco');
    const cidadeInput = document.getElementById('cidade');
    const estadoInput = document.getElementById('estado');
    let cep = cepInput.value.replace(/\D/g, '');
    console.log('CEP formatado:', cep);
    
    try {
        console.log('Iniciando requisição...');
        const response = await fetch(`${api.vendas}/checar-cep?cep=${cep}`);
        console.log('Resposta recebida:', response);
        
        const data = await response.json();
        console.log('Dados JSON:', data); 
        
        if(!response.ok) throw new Error(data.message || 'Erro ao buscar CEP');
        
        bairroInput.value = data.bairro || 'Bairro não informado';
        enderecoInput.value = data.logradouro || 'Endereço não informado';
        cidadeInput.value = data.localidade;
        estadoInput.value = data.uf || 'Estado não informado';
        
    } catch (error) {
        console.error('Erro completo:', error);
    }
}

// Exibe informações do produto selecionado
document.addEventListener("DOMContentLoaded", () => {
    let dadosCompra = localStorage.getItem("dadosCompra");

    if (dadosCompra) {
        dadosCompra = JSON.parse(dadosCompra); // Converte de string para objeto

        // Se for um objeto e não um array, transforma em um array
        if (!Array.isArray(dadosCompra)) {
            dadosCompra = [dadosCompra];
        }
    } else {
        dadosCompra = [];
    }

    const containerProdutos = document.querySelector(".container-produtos-vendas");
    console.log(dadosCompra);

    if (dadosCompra.length > 0) {
        let htmlContent = "";

        dadosCompra.forEach(element => {
            const precoFormatado = parseFloat(element.preco_final).toFixed(2).replace(".", ",");
            const subtotalFormatado = parseFloat(element.subtotal).toFixed(2).replace(".", ",");

            htmlContent += `
            <hr>
                <p><strong>Produto:</strong> ${element.nome_produto}</p>
                <p><strong>Preço unitário:</strong> R$ ${precoFormatado}</p>
                <p><strong>Quantidade:</strong> ${element.quantidade}</p>
            `;
            let totalFinal = total(element.subtotal); // Atualiza o total com o subtotal do produto
            document.getElementById("contador-subtotal").textContent = `R$ ${totalFinal}`;
            document.getElementById("contador-total").textContent = `R$ ${totalFinal}`; // Atualiza o total final
        });

        containerProdutos.innerHTML = htmlContent;
    } else {
        containerProdutos.innerHTML = "<p>Nenhum produto selecionado.</p>";
    }
});


document.getElementById("FinalizarCompra").addEventListener("click", (event) => {
    event.preventDefault();
    let endereco = {
        cep: document.getElementById("cep").value,
        bairro: document.getElementById("bairro").value,
        endereco: document.getElementById("endereco").value,
        cidade: document.getElementById("cidade").value,
        estado: document.getElementById("estado").value,
        numeroCasa: document.getElementById("numero-casa").value,
        complementoCasa: document.getElementById("complemento-casa").value 
    }
    let pagamento = document.getElementById("pagamento").value;
    let dadosPedido;
    
    if (!endereco.cep || !endereco.bairro || !endereco.endereco || !endereco.cidade || !endereco.estado || !endereco.numeroCasa || !endereco.complementoCasa) {
        alert("Por favor, preencha todos os campos obrigatórios do endereço.");
        return;
    } // This closing brace was missing

    if (pagamento == "CC") {
        dadosPedido = {
            numeroCartao: document.getElementById("numero-cartao").value,
            nomeCartao: document.getElementById("nome-cartao").value,
            validadeCartao: document.getElementById("validade-cartao").value,
            cvv: document.getElementById("cvv").value,
            parcelas: document.getElementById("parcelas").value,
            endereco: endereco,
            pagamento: pagamento,
            dadosCompra: lJSON.parse(localStorage.getItem("dadosCompra"))
        };
        if (!dadosPedido.numeroCartao || !dadosPedido.nomeCartao || !dadosPedido.validadeCartao || !dadosPedido.cvv || !dadosPedido.parcelas) {
            alert("Por favor, preencha todos os campos obrigatórios do cartão de crédito.");
            return;
        }
    }

    if (pagamento == "PIX" || pagamento == "BB") {
        dadosPedido = {
            pagamento: document.getElementById("pagamento").value,
            endereco: endereco,
            dadosCompra: JSON.parse(localStorage.getItem("dadosCompra"))
        }
        if (!dadosPedido.pagamento) {
            alert("Por favor, selecione um método de pagamento.");
            return;
        }
    }
    
    console.log(dadosPedido);
    window.location.href = "pedido_confirmado.html"
});

  document.getElementById("Cancelar").addEventListener("click", function() {
    window.location.href = "produtos.html";
  });

let somar = 0;
function total(valor) {
    somar += parseFloat(valor) || 0; 
    return somar.toFixed(2).replace(".", ",");
}

