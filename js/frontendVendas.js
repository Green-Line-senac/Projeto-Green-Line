import { criarPedido } from './api/pedidosApi.js';

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

                  const dadosCompra = JSON.parse(sessionStorage.getItem("dadosCompra"));
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
        const response = await fetch(`${api.online}/checar-cep?cep=${cep}`);
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
    let dadosCompra = sessionStorage.getItem("dadosCompra");

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
        let valorTotal = 0;

        dadosCompra.forEach(element => {
            const precoFormatado = parseFloat(element.preco_final).toFixed(2).replace(".", ",");
            const subtotalFormatado = parseFloat(element.subtotal).toFixed(2).replace(".", ",");
            valorTotal += parseFloat(element.subtotal);

            htmlContent += `
            <hr>
                <p><strong>Produto:</strong> ${element.nome_produto}</p>
                <p><strong>Preço unitário:</strong> R$ ${precoFormatado}</p>
                <p><strong>Quantidade:</strong> ${element.quantidade}</p>
            `;
        });

        containerProdutos.innerHTML = htmlContent;
        
        // Atualiza os totais
        const valorTotalFormatado = valorTotal.toFixed(2).replace(".", ",");
        document.getElementById("contador-subtotal").textContent = `R$ ${valorTotalFormatado}`;
        document.getElementById("contador-total").textContent = `R$ ${valorTotalFormatado}`;
    } else {
        containerProdutos.innerHTML = "<p>Nenhum produto selecionado.</p>";
    }
});

// Função para validar dados do cartão
function validarCartao(dadosCartao) {
    const { numeroCartao, nomeCartao, validadeCartao, cvv } = dadosCartao;
    
    // Valida número do cartão (usando algoritmo de Luhn)
    function validarNumeroCartao(numero) {
        numero = numero.replace(/\D/g, '');
        if (numero.length < 13 || numero.length > 19) return false;
        
        let soma = 0;
        let dobro = false;
        
        for (let i = numero.length - 1; i >= 0; i--) {
            let digito = parseInt(numero.charAt(i));
            
            if (dobro) {
                digito *= 2;
                if (digito > 9) digito -= 9;
            }
            
            soma += digito;
            dobro = !dobro;
        }
        
        return soma % 10 === 0;
    }
    
    // Valida data de validade
    function validarValidade(validade) {
        const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
        if (!regex.test(validade)) return false;
        
        const [mes, ano] = validade.split('/');
        const dataAtual = new Date();
        const anoAtual = dataAtual.getFullYear() % 100;
        const mesAtual = dataAtual.getMonth() + 1;
        
        const anoValidade = parseInt(ano);
        const mesValidade = parseInt(mes);
        
        if (anoValidade < anoAtual) return false;
        if (anoValidade === anoAtual && mesValidade < mesAtual) return false;
        
        return true;
    }
    
    // Valida CVV
    function validarCVV(cvv) {
        return /^[0-9]{3,4}$/.test(cvv);
    }
    
    // Valida nome
    function validarNome(nome) {
        return /^[a-zA-ZÀ-ÿ\s]{3,}$/.test(nome);
    }
    
    const erros = [];
    
    if (!validarNumeroCartao(numeroCartao)) {
        erros.push("Número do cartão inválido");
    }
    
    if (!validarNome(nomeCartao)) {
        erros.push("Nome no cartão inválido");
    }
    
    if (!validarValidade(validadeCartao)) {
        erros.push("Data de validade inválida");
    }
    
    if (!validarCVV(cvv)) {
        erros.push("CVV inválido");
    }
    
    return erros;
}

// Função para validar endereço
function validarEndereco(endereco) {
    const erros = [];
    
    if (!endereco.cep || !/^\d{5}-?\d{3}$/.test(endereco.cep)) {
        erros.push("CEP inválido");
    }
    
    if (!endereco.bairro || endereco.bairro.length < 3) {
        erros.push("Bairro inválido");
    }
    
    if (!endereco.endereco || endereco.endereco.length < 3) {
        erros.push("Endereço inválido");
    }
    
    if (!endereco.cidade || endereco.cidade.length < 3) {
        erros.push("Cidade inválida");
    }
    
    if (!endereco.estado || !/^[A-Z]{2}$/.test(endereco.estado)) {
        erros.push("Estado inválido");
    }
    
    if (!endereco.numeroCasa || !/^\d+$/.test(endereco.numeroCasa)) {
        erros.push("Número da casa inválido");
    }
    
    return erros;
}

// Função para mostrar erros
function mostrarErros(erros) {
    const alertaErro = document.createElement('div');
    alertaErro.className = 'alert alert-danger alert-dismissible fade show';
    alertaErro.innerHTML = `
        <h4 class="alert-heading">Por favor, corrija os seguintes erros:</h4>
        <ul class="mb-0">
            ${erros.map(erro => `<li>${erro}</li>`).join('')}
        </ul>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertaErro, container.firstChild);
}

// Event listener para finalizar compra
document.getElementById("FinalizarCompra").addEventListener("click", async (event) => {
    event.preventDefault();
    console.log('Iniciando processo de finalização da compra...');
    
    // Verifica se existem dados da compra
    const dadosCompraStr = sessionStorage.getItem("dadosCompra");
    if (!dadosCompraStr) {
        console.error("Dados da compra não encontrados");
        mostrarErros(["Não foi possível encontrar os dados da sua compra. Por favor, tente novamente."]);
        return;
    }
    
    try {
        // Coleta dados do endereço
        const dadosEndereco = {
            cep: document.getElementById('cep').value,
            endereco: document.getElementById('endereco').value,
            numeroCasa: document.getElementById('numeroCasa').value,
            complementoCasa: document.getElementById('complementoCasa').value,
            bairro: document.getElementById('bairro').value,
            cidade: document.getElementById('cidade').value,
            estado: document.getElementById('estado').value
        };

        // Coleta dados do pagamento
        const metodoPagamento = document.getElementById('pagamento').value;
        let dadosPagamento = { metodoPagamento };

        if (metodoPagamento === 'CC') {
            dadosPagamento = {
                ...dadosPagamento,
                numeroCartao: document.getElementById('numero-cartao').value,
                nomeCartao: document.getElementById('nome-cartao').value,
                validadeCartao: document.getElementById('validade-cartao').value,
                cvv: document.getElementById('cvv').value,
                parcelas: document.getElementById('parcelas').value
            };
        }

        // Combina todos os dados do formulário
        const dadosFormulario = {
            ...dadosEndereco,
            ...dadosPagamento
        };

        // Salva os dados no sessionStorage
        sessionStorage.setItem('dadosFormulario', JSON.stringify(dadosFormulario));
        
        // Redireciona para a página de confirmação
        window.location.href = '../public/pedido_confirmado.html'
    } catch (error) {
        console.error('Erro detalhado ao processar pedido:', error);
        mostrarErros(["Ocorreu um erro ao processar seu pedido. Por favor, tente novamente."]);
    }
});

  document.getElementById("Cancelar").addEventListener("click", function() {
    window.location.href = "produtos.html";
  });

let somar = 0;
function total(valor) {
    somar += parseFloat(valor) || 0; 
    return somar.toFixed(2).replace(".", ",");
}

