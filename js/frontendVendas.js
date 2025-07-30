import { criarPedido } from './api/pedidosApi.js';
import { showSuccess, showError, showWarning, showInfo, showValidationError, showLoading, hideNotification } from './notifications.js';

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

function aplicarMascaraCEP(input) {
    let cep = input.value.replace(/\D/g, '');
    if (cep.length > 5) {
        cep = cep.substring(0, 5) + '-' + cep.substring(5, 8);
    }
    input.value = cep;
}

// Exibe informações do produto selecionado
document.addEventListener("DOMContentLoaded", () => {
    // Preencher endereço automaticamente se houver no sessionStorage
    const enderecoSalvo = sessionStorage.getItem("enderecoUsuario");
    if (enderecoSalvo) {
        try {
            const endereco = JSON.parse(enderecoSalvo);
            if (endereco) {
                if (document.getElementById('cep')) document.getElementById('cep').value = endereco.cep || '';
                if (document.getElementById('endereco')) document.getElementById('endereco').value = endereco.endereco || '';
                if (document.getElementById('complemento')) document.getElementById('complemento').value = endereco.complemento || '';
                if (document.getElementById('bairro')) document.getElementById('bairro').value = endereco.bairro || '';
                if (document.getElementById('cidade')) document.getElementById('cidade').value = endereco.cidade || '';
                if (document.getElementById('estado')) document.getElementById('estado').value = endereco.uf || endereco.estado || '';
            }
        } catch (e) {
            console.warn('Endereço salvo no perfil está corrompido ou inválido.');
        }
    }

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
            const precoFormatado = formatarPrecoBR(element.preco_final);
            const subtotalFormatado = formatarPrecoBR(element.subtotal);
            valorTotal += parseFloat(element.subtotal);

            htmlContent += `
            <hr>
                <p><strong>Produto:</strong> ${element.nome_produto || element.nome || 'Produto'}</p>
                <p><strong>Preço unitário:</strong> ${precoFormatado}</p>
                <p><strong>Quantidade:</strong> ${element.quantidade}</p>
            `;
        });

        containerProdutos.innerHTML = htmlContent;
        
        // Atualiza os totais
        const valorTotalFormatado = formatarPrecoBR(valorTotal);
        document.getElementById("contador-subtotal").textContent = valorTotalFormatado;
        document.getElementById("contador-total").textContent = valorTotalFormatado;
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

// Função para mostrar erros usando o novo sistema de notificações
function mostrarErros(erros) {
    showValidationError(erros, {
        actions: [
            {
                text: 'Entendi',
                type: 'primary',
                handler: () => {
                    // Focar no primeiro campo com erro
                    const firstErrorField = document.querySelector('.is-invalid, .campo-invalido');
                    if (firstErrorField) {
                        firstErrorField.focus();
                        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }
        ]
    });
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

    // Validação dos campos obrigatórios
    const erros = [];
    // Endereço
    const cep = document.getElementById('cep').value;
    const logradouro = document.getElementById('logradouro').value;
    const numeroCasa = document.getElementById('numeroCasa').value;
    const bairro = document.getElementById('bairro').value;
    const cidade = document.getElementById('cidade').value;
    const uf = document.getElementById('uf').value;
    if (!cep || !/^\d{5}-?\d{3}$/.test(cep)) erros.push('CEP inválido ou não preenchido');
    if (!logradouro || logradouro.length < 3) erros.push('Endereço inválido ou não preenchido');
    if (!numeroCasa || !/^\d+$/.test(numeroCasa)) erros.push('Número da casa inválido ou não preenchido');
    if (!bairro || bairro.length < 3) erros.push('Bairro inválido ou não preenchido');
    if (!cidade || cidade.length < 3) erros.push('Cidade inválida ou não preenchida');
    if (!uf || !/^[A-Z]{2}$/.test(uf)) erros.push('Estado inválido ou não preenchido');

    // Pagamento
    const metodoPagamento = document.getElementById('pagamento').value;
    if (!metodoPagamento) {
      erros.push('Selecione a forma de pagamento.');
    }
    let dadosPagamento = { metodoPagamento };
    if (metodoPagamento === 'CC') {
      const numeroCartao = document.getElementById('numero-cartao').value;
      const nomeCartao = document.getElementById('nome-cartao').value;
      const validadeCartao = document.getElementById('validade-cartao').value;
      const cvv = document.getElementById('cvv').value;
      const parcelas = document.getElementById('parcelas').value;
      if (!numeroCartao || numeroCartao.replace(/\s/g, '').length < 16) erros.push('Número do cartão inválido ou não preenchido');
      if (!nomeCartao || nomeCartao.length < 3) erros.push('Nome no cartão inválido ou não preenchido');
      if (!validadeCartao || !/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(validadeCartao)) erros.push('Validade do cartão inválida ou não preenchida');
      if (!cvv || !/^[0-9]{3,4}$/.test(cvv)) erros.push('CVV inválido ou não preenchido');
      if (!parcelas) erros.push('Selecione o número de parcelas');
      dadosPagamento = {
        ...dadosPagamento,
        numeroCartao,
        nomeCartao,
        validadeCartao,
        cvv,
        parcelas
      };
    }

    if (erros.length > 0) {
      mostrarErros(erros);
      return;
    }

    try {
        // Mostrar loading durante o processamento
        const loadingId = showLoading('Processando pedido...', 'Finalizando sua compra');

        // Coleta dados do endereço
        const dadosEndereco = {
            cep,
            logradouro,
            numeroCasa,
            complementoCasa: document.getElementById('complementoCasa').value,
            bairro,
            cidade,
            uf
        };

        // Combina todos os dados do formulário
        const dadosFormulario = {
            ...dadosEndereco,
            ...dadosPagamento
        };

        // Salva os dados no sessionStorage
        sessionStorage.setItem('dadosFormulario', JSON.stringify(dadosFormulario));
        
        // Simular um pequeno delay para mostrar o loading
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Esconder loading
        hideNotification(loadingId);
        
        // Mostrar sucesso antes de redirecionar
        showSuccess('Pedido processado!', 'Redirecionando para confirmação...', { duration: 2000 });
        
        // Redirecionar após um pequeno delay
        setTimeout(() => {
            window.location.href = '../public/pedido_confirmado.html';
        }, 2000);
        
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

document.addEventListener('DOMContentLoaded', function() {
  // Função para atualizar o resumo do pedido com o frete
  function atualizarResumoFrete() {
    const subtotalEl = document.getElementById('contador-subtotal');
    const freteEl = document.getElementById('contador-frete');
    const totalEl = document.getElementById('contador-total');
    let subtotal = 0;
    let frete = 0;
    if (subtotalEl) {
      // Parsing correto do valor do subtotal brasileiro
      const subtotalText = subtotalEl.textContent || '0';
      // Remove R$ e espaços, depois trata pontos e vírgulas corretamente
      let valorLimpo = subtotalText.replace(/[R$\s]/g, '');
      
      // Se tem vírgula, é o separador decimal brasileiro
      if (valorLimpo.includes(',')) {
        // Remove pontos (separadores de milhares) e substitui vírgula por ponto
        valorLimpo = valorLimpo.replace(/\./g, '').replace(',', '.');
      }
      
      subtotal = parseFloat(valorLimpo) || 0;
      console.log('Subtotal parseado:', subtotal, 'de:', subtotalText);
    }
    const freteInput = document.getElementById('frete');
    if (freteInput && freteInput.value) {
      // Garante conversão correta
      frete = Number(freteInput.value.replace(/[^0-9,\.]/g, '').replace(',', '.')) || 0;
      if (freteEl) freteEl.textContent = frete.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else {
      if (freteEl) freteEl.textContent = 'R$ 0,00';
    }
    if (totalEl) {
      const total = subtotal + frete;
      console.log('Total calculado:', total, '(subtotal:', subtotal, '+ frete:', frete, ')');
      totalEl.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
  }

  // Atualiza o resumo sempre que o campo frete mudar
  const freteInput = document.getElementById('frete');
  if (freteInput) {
    freteInput.addEventListener('input', atualizarResumoFrete);
    // Atualiza também ao carregar a página
    atualizarResumoFrete();
  }
});

// Função para formatar preço no padrão brasileiro
function formatarPrecoBR(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Máscara de CEP em tempo real
const cepInput = document.getElementById('cep');
if (cepInput) {
    cepInput.addEventListener('input', function() {
        let cep = this.value.replace(/\D/g, '');
        if (cep.length > 5) {
            cep = cep.substring(0, 5) + '-' + cep.substring(5, 8);
        }
        this.value = cep;
    });
    
    // Validar CEP quando o usuário sair do campo
    cepInput.addEventListener('blur', function() {
        const cep = this.value.replace(/\D/g, '');
        if (cep.length > 0 && cep.length < 8) {
            showWarning('CEP incompleto', 'Digite um CEP válido com 8 dígitos', { duration: 3000 });
        }
    });
}

// Adicionar notificação de boas-vindas quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar notificação informativa sobre o processo
    setTimeout(() => {
        showInfo('Finalize sua compra', 'Preencha os dados de entrega e pagamento para concluir seu pedido', { 
            duration: 4000,
            compact: true 
        });
    }, 1000);
});

