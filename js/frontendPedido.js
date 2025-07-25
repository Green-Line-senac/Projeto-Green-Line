import { buscarPedido, atualizarStatusPedido } from "./api/pedidosApi.js";

const apiPedido = {
  online: "https://green-line-web.onrender.com",
  vendas: "http://localhost:3009",
};

// Função para gerar número do pedido
function gerarNumeroPedido() {
  const ano = new Date().getFullYear();
  const numero = String(Math.floor(Math.random() * 999999)).padStart(6, "0");
  return `#GL-${ano}-${numero}`;
}

// Função para formatar data e hora
function formatarDataHora() {
  const agora = new Date();
  const hoje = agora.toLocaleDateString("pt-BR");
  const hora = agora.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${hoje}, ${hora}`;
}

// Função para formatar endereço completo
function formatarEndereco(dadosCliente) {
  if (!dadosCliente || !dadosCliente.endereco) {
    return `Endereço não informado<br>
            Complete seus dados na próxima compra<br>
            para uma experiência melhor`;
  }

  return `${dadosCliente.nome || "Cliente"}<br>
          ${dadosCliente.endereco}, ${dadosCliente.numeroCasa}${dadosCliente.complementoCasa ? " - " + dadosCliente.complementoCasa : ""
    }<br>
          ${dadosCliente.bairro}<br>
          ${dadosCliente.cidade} - ${dadosCliente.estado}, ${dadosCliente.cep}`;
}

// Função para determinar método de entrega baseado no CEP
function determinarMetodoEntrega(cep) {
  if (!cep) return "Entrega Padrão (3-5 dias úteis)";

  const cepNumerico = cep.replace(/\D/g, "");

  // Simulação baseada em regiões do Brasil
  if (
    cepNumerico.startsWith("01") ||
    cepNumerico.startsWith("04") ||
    cepNumerico.startsWith("05") ||
    cepNumerico.startsWith("08")
  ) {
    return "Entrega Expressa (1-2 dias úteis)";
  } else if (
    cepNumerico.startsWith("2") ||
    cepNumerico.startsWith("3") ||
    cepNumerico.startsWith("7")
  ) {
    return "Entrega Padrão (3-5 dias úteis)";
  } else {
    return "Entrega Estendida (5-7 dias úteis)";
  }
}

// Função para calcular previsão de entrega
function calcularPrevisaoEntrega(metodoEntrega) {
  const dataBase = new Date();
  let diasUteis;

  if (metodoEntrega.includes("Expressa")) {
    diasUteis = 2;
  } else if (metodoEntrega.includes("Padrão")) {
    diasUteis = 5;
  } else {
    diasUteis = 7;
  }

  // Adiciona dias úteis
  let diasAdicionados = 0;
  while (diasAdicionados < diasUteis) {
    dataBase.setDate(dataBase.getDate() + 1);
    if (dataBase.getDay() !== 0 && dataBase.getDay() !== 6) {
      // Não conta sábados e domingos
      diasAdicionados++;
    }
  }

  return `Previsão: ${dataBase.toLocaleDateString("pt-BR")}`;
}

// Função para formatar forma de pagamento
function formatarFormaPagamento(dadosFormulario) {
  if (!dadosFormulario || !dadosFormulario.metodoPagamento) {
    return '<i class="bi bi-credit-card me-2"></i>Não informado';
  }

  switch (dadosFormulario.metodoPagamento) {
    case "CC":
      const ultimosDigitos = dadosFormulario.numeroCartao
        ? dadosFormulario.numeroCartao.slice(-4)
        : "0000";
      return `<i class="bi bi-credit-card me-2"></i>Cartão de Crédito ****${ultimosDigitos}`;
    case "PIX":
      return '<i class="bi bi-qr-code me-2"></i>PIX';
    case "BB":
      return '<i class="bi bi-file-earmark-text me-2"></i>Boleto Bancário';
    default:
      return '<i class="bi bi-credit-card me-2"></i>Não informado';
  }
}

// Função para calcular impacto sustentável
function calcularImpactoSustentavel(produtos) {
  const totalProdutos = produtos.reduce(
    (total, produto) => total + produto.quantidade,
    0
  );
  const co2Evitado = (totalProdutos * 1.2).toFixed(1); // 1.2kg por produto
  const arvores = Math.ceil(totalProdutos / 2); // 1 árvore a cada 2 produtos

  return {
    co2: `${co2Evitado}kg`,
    arvores: arvores,
  };
}

// Função para enviar email de confirmação
async function enviarEmailConfirmacao(pedido) {
  if (!pedido.email || !pedido.email.includes('@')) {
    console.error('E-mail do pedido está vazio ou inválido:', pedido.email);
    showError('Email inválido', 'E-mail do usuário não encontrado ou inválido. Faça login novamente.');
    return;
  }

  const loadingId = showLoading('Enviando confirmação...', 'Enviando email de confirmação do pedido');

  try {
    const response = await fetch(
      "https://green-line-web.onrender.com/enviar-email",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: pedido.email,
          assunto: `Pedido ${pedido.numeroPedido} Confirmado - GreenLine`,
          tipo: "compra-concluida",
          pedido: {
            numeroPedido: pedido.numeroPedido,
            dataConfirmacao: pedido.dataConfirmacao,
            total: pedido.total,
            previsaoEntrega: pedido.previsaoEntrega,
            produtos: pedido.produtos || []
          },
        }),
      }
    );

    hideNotification(loadingId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resposta do backend ao tentar enviar email:', errorText);
      throw new Error("Falha ao enviar email");
    }

    console.log("Email de confirmação enviado com sucesso");
    showSuccess('Email enviado!', 'Confirmação do pedido enviada para seu email', { duration: 4000 });

  } catch (erro) {
    hideNotification(loadingId);
    console.error("Erro ao enviar email:", erro);
    showWarning('Email não enviado', 'Não foi possível enviar o email de confirmação, mas seu pedido foi processado com sucesso', {
      duration: 6000,
      actions: [
        {
          text: 'Tentar novamente',
          type: 'primary',
          handler: () => enviarEmailConfirmacao(pedido)
        }
      ]
    });
  }
}

// Função principal para carregar dados do pedido
async function carregarDadosPedido() {
  const loadingId = showLoading('Processando pedido...', 'Carregando informações da sua compra');

  try {
    console.log("Iniciando carregamento dos dados do pedido...");

    // Carrega dados da compra
    const dadosCompraStr = sessionStorage.getItem("dadosCompra");
    const dadosFormularioStr = sessionStorage.getItem("dadosFormulario");

    if (!dadosCompraStr) {
      console.error("Dados da compra não encontrados no sessionStorage");
      hideNotification(loadingId);
      showError('Dados não encontrados', 'Dados da compra não encontrados. Redirecionando para a página de vendas...');
      setTimeout(() => {
        window.location.href = "vendas.html";
      }, 3000);
      return;
    }

    // Parse dos dados da compra
    let dadosCompra;
    try {
      dadosCompra = JSON.parse(dadosCompraStr);
      if (!Array.isArray(dadosCompra)) {
        dadosCompra = [dadosCompra];
      }
      console.log("Dados da compra carregados:", dadosCompra);
    } catch (error) {
      console.error("Erro ao fazer parse dos dados da compra:", error);
      hideNotification(loadingId);
      showError('Erro nos dados', 'Erro ao processar dados da compra');
      return;
    }

    // Parse dos dados do formulário
    let dadosFormulario = {};
    if (dadosFormularioStr) {
      try {
        dadosFormulario = JSON.parse(dadosFormularioStr);
        console.log("Dados do formulário carregados:", dadosFormulario);
      } catch (error) {
        console.error("Erro ao fazer parse dos dados do formulário:", error);
        console.log("Continuando sem dados do formulário...");
      }
    }

    // Calcula valores financeiros
    const subtotal = dadosCompra.reduce((total, item) => {
      const preco =
        typeof item.preco_final === "string"
          ? parseFloat(item.preco_final.replace(",", "."))
          : Number(item.preco_final);
      const quantidade = Number(item.quantidade) || 1;
      return total + preco * quantidade;
    }, 0);

    // Frete dinâmico: pega do sessionStorage se existir, senão usa valor fixo
    let frete = 0.0;
    const freteSalvo = sessionStorage.getItem("frete");
    if (freteSalvo && !isNaN(parseFloat(freteSalvo))) {
      frete = parseFloat(freteSalvo);
    }

    const desconto = subtotal > 100 ? 10.0 : 0; // Desconto eco para compras acima de R$ 100
    const total = subtotal + frete - desconto;

    // Gera informações do pedido
    const numeroPedido = gerarNumeroPedido();
    const dataConfirmacao = formatarDataHora();
    const metodoEntrega = determinarMetodoEntrega(dadosFormulario.cep);
    const previsaoEntrega = calcularPrevisaoEntrega(metodoEntrega);
    const impacto = calcularImpactoSustentavel(dadosCompra);

    // Recupera idPessoa e email do sessionStorage
    const idPessoa = sessionStorage.getItem("id_pessoa");
    const email = sessionStorage.getItem("email");
    if (!idPessoa) {
      hideNotification(loadingId);
      showError('Login necessário', 'Você precisa estar logado para finalizar a compra. Redirecionando para o login...');
      setTimeout(() => {
        window.location.href = "/public/login.html";
      }, 2000);
      return;
    }

    // Monta objeto completo do pedido
    const pedido = {
      numeroPedido,
      idPessoa,
      email,
      nomeTitular: sessionStorage.getItem("usuario") || "Cliente",
      metodoEntrega,
      previsaoEntrega,
      produtos: dadosCompra.map((item) => ({
        nome: item.nome_produto || item.nome || 'Produto',
        quantidade: parseInt(item.quantidade) || 1,
        preco: parseFloat(item.preco_final) || 0,
        subtotal: (parseFloat(item.preco_final) || 0) * (parseInt(item.quantidade) || 1),
        imagem_principal: item.imagem_principal,
        imagem_1: item.imagem_1,
        imagem: item.imagem
      })).filter(p => p.nome && p.quantidade > 0),
      subtotal,
      frete,
      desconto,
      total,
      formaPagamento: formatarFormaPagamento(dadosFormulario),
      formaPagamentoVendas:
        dadosFormulario.metodoPagamento === "PIX" ||
          dadosFormulario.metodoPagamento === "DEB" ||
          dadosFormulario.metodoPagamento === "BB"
          ? dadosFormulario.metodoPagamento
          : {
            metodoPagamento: dadosFormulario.metodoPagamento,
            numeroCartao: dadosFormulario.numeroCartao,
            nomeCartao: dadosFormulario.nomeCartao,
            validadeCartao: dadosFormulario.validadeCartao,
            cvv: dadosFormulario.cvv,
            parcelas: dadosFormulario.parcelas ? `${dadosFormulario.parcelas}x` : "1x",
          },
      impactoCO2: impacto.co2,
      arvores: impacto.arvores,
      dataConfirmacao // <-- garantir que a data está presente
    };
    console.log('Pedido enviado para backend:', pedido);
    await salvarPedido(pedido);

    // Preenche a página com os dados
    await preencherPaginaConfirmacao(pedido);

    // Salva dados do pedido para uso futuro
    sessionStorage.setItem("ultimoPedido", JSON.stringify(pedido));

    // Esconder loading principal
    hideNotification(loadingId);

    // Mostrar sucesso do processamento
    showSuccess('Pedido processado!', 'Seu pedido foi confirmado com sucesso', { duration: 3000 });

    // Envia email de confirmação
    await enviarEmailConfirmacao(pedido);
  } catch (error) {
    console.error("Erro geral ao carregar dados do pedido:", error);
    hideNotification(loadingId);
    showError('Erro no processamento', 'Erro inesperado ao carregar dados do pedido');
  }
}
async function salvarPedido(pedido) {
  const loadingId = showLoading('Salvando pedido...', 'Registrando seu pedido no sistema');

  try {
    console.log('Tentando salvar pedido:', pedido);
    console.log('URL da API:', `${apiPedido.online}/salvar-pedido`);

    const response = await fetch(`${apiPedido.online}/salvar-pedido`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pedido),
    });

    console.log('Resposta do servidor:', response.status, response.statusText);
    hideNotification(loadingId);

    if (!response.ok) {
      let errorData;
      let errorText = '';

      try {
        const responseText = await response.text();
        console.log('Texto da resposta de erro:', responseText);

        if (responseText) {
          try {
            errorData = JSON.parse(responseText);
          } catch (jsonError) {
            console.error('Resposta não é JSON válido:', jsonError);
            errorText = responseText;
          }
        }
      } catch (parseError) {
        console.error('Erro ao ler resposta de erro:', parseError);
      }

      // Tratamento específico para erro de estoque
      if (errorData && errorData.codigo === -4) {
        showError('Estoque insuficiente!',
          `${errorData.produto}: apenas ${errorData.estoqueDisponivel} unidade(s) disponível(is)`, {
          duration: 8000,
          actions: [
            {
              text: 'Ajustar quantidade',
              type: 'primary',
              handler: () => {
                window.location.href = '/public/carrinho.html';
              }
            }
          ]
        });
        return;
      }

      // Tratamento para diferentes tipos de erro
      let errorMessage = 'Erro desconhecido';
      if (errorData && errorData.error) {
        errorMessage = errorData.error;
      } else if (errorText) {
        errorMessage = errorText;
      } else if (response.status === 404) {
        errorMessage = 'Servidor não encontrado. Verifique se o backend está rodando.';
      } else if (response.status === 500) {
        errorMessage = 'Erro interno do servidor. Verifique os logs do backend.';
      } else {
        errorMessage = `Erro do servidor (${response.status}): ${response.statusText}`;
      }

      throw new Error(errorMessage);
    }

    const resultado = await response.json();
    console.log("Pedido salvo com sucesso:", resultado);
    showSuccess('Pedido salvo!', 'Seu pedido foi registrado com sucesso no sistema', { duration: 3000 });

  } catch (error) {
    hideNotification(loadingId);
    console.error("Erro detalhado ao salvar pedido:", error);

    // Tratamento específico para erro de rede
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      showError('Erro de conexão', 'Não foi possível conectar ao servidor. Verifique se o backend está rodando e tente novamente.', {
        duration: 10000,
        actions: [
          {
            text: 'Tentar novamente',
            type: 'primary',
            handler: () => salvarPedido(pedido)
          }
        ]
      });
    } else {
      showError('Erro ao salvar pedido', error.message || 'Houve um problema ao processar seu pedido');
    }
  }
}

// Função para preencher a página de confirmação
async function preencherPaginaConfirmacao(pedido) {
  try {
    console.log("Preenchendo página com dados do pedido...");

    // Número do pedido
    const numeroPedidoEl = document.getElementById("numeroPedido");
    if (numeroPedidoEl) {
      numeroPedidoEl.textContent = pedido.numeroPedido;
    }

    // Data de confirmação
    const dataConfirmacaoEl = document.getElementById("dataConfirmacao");
    if (dataConfirmacaoEl) {
      dataConfirmacaoEl.textContent = pedido.dataConfirmacao;
    }

    // Previsão de entrega
    const previsaoEntregaEl = document.getElementById("previsaoEntrega");
    if (previsaoEntregaEl) {
      previsaoEntregaEl.textContent = pedido.previsaoEntrega;
    }

    // Endereço de entrega
    const enderecoEntregaEl = document.getElementById("enderecoEntrega");
    if (enderecoEntregaEl) {
      const endereco = JSON.parse(sessionStorage.getItem('enderecoEntrega') || '{}');
      if (endereco && endereco.logradouro) {
        enderecoEntregaEl.innerHTML = `
        ${sessionStorage.getItem("usuario") || "Cliente"}<br>
        ${endereco.logradouro}, ${endereco.numeroCasa || ''}${endereco.complementoCasa ? ' - ' + endereco.complementoCasa : ''}<br>
        ${endereco.bairro}<br>
        ${endereco.cidade} - ${endereco.uf}, ${endereco.cep}`;
      } else {
        enderecoEntregaEl.innerHTML = `Endereço não informado<br>Complete seus dados na próxima compra<br>para uma experiência melhor`;
      }
    }

    // Método de entrega
    const metodoEntregaEl = document.getElementById("metodoEntrega");
    if (metodoEntregaEl) {
      metodoEntregaEl.innerHTML = `<i class="bi bi-truck me-2"></i>${pedido.metodoEntrega}`;
    }

    // Produtos do pedido
    const produtosContainer = document.getElementById("produtosPedido");
    if (produtosContainer) {
      produtosContainer.innerHTML = ""; // Limpa conteúdo anterior

      pedido.produtos.forEach((produto, index) => {
        // Tenta pegar a imagem do produto com múltiplos fallbacks
        let imagem = '../img/imagem-nao-disponivel.png'; // Fallback padrão

        // Verifica diferentes possíveis nomes de propriedades de imagem
        if (produto.imagem_principal && produto.imagem_principal !== '') {
          imagem = produto.imagem_principal;
        } else if (produto.imagem_1 && produto.imagem_1 !== '') {
          imagem = produto.imagem_1;
        } else if (produto.imagem && produto.imagem !== '') {
          imagem = produto.imagem;
        } else if (produto.imagem_2 && produto.imagem_2 !== '') {
          imagem = produto.imagem_2;
        } else if (produto.foto && produto.foto !== '') {
          imagem = produto.foto;
        }

        // Garante que a imagem tenha o caminho correto
        if (imagem && !imagem.startsWith('http') && !imagem.startsWith('../') && !imagem.startsWith('/')) {
          imagem = '../img/produtos/' + imagem;
        }

        console.log('Produto:', produto.nome, 'Imagem:', imagem); // Debug

        const produtoHTML = `
          <div class="order-item d-flex justify-content-between align-items-center py-3 ${index < pedido.produtos.length - 1 ? "border-bottom" : ""
          }">
            <div class="item-info d-flex align-items-center">
              <img src="${imagem}" 
                   alt="${produto.nome}" 
                   class="rounded me-3 product-image" 
                   style="width: 56px; height: 56px; object-fit: cover; background: #f8f9fa; border: 1px solid #eee;"
                   onerror="this.src='../img/imagem-nao-disponivel.png'; this.onerror=null;">
              <div>
                <h5 class="item-name mb-1">${produto.nome}</h5>
                <p class="item-details text-muted mb-0">
                  Quantidade: ${produto.quantidade} × ${formatarPrecoBR(produto.preco)}
                </p>
              </div>
            </div>
            <div class="item-total">
              <strong>${formatarPrecoBR(produto.subtotal)}</strong>
            </div>
          </div>
        `;
        produtosContainer.insertAdjacentHTML("beforeend", produtoHTML);
      });
    }

    // Resumo financeiro
    const subtotalEl = document.getElementById("subtotal");
    if (subtotalEl) {
      subtotalEl.textContent = `${formatarPrecoBR(pedido.subtotal)}`;
    }

    const freteEl = document.getElementById("frete");
    if (freteEl) {
      freteEl.textContent = `${formatarPrecoBR(pedido.frete)}`;
    }

    const descontoEl = document.getElementById("desconto");
    if (descontoEl) {
      descontoEl.textContent = `-${formatarPrecoBR(pedido.desconto)}`;
      // Oculta linha de desconto se for zero
      if (pedido.desconto === 0) {
        const descontoRow = descontoEl.closest(".summary-row");
        if (descontoRow) descontoRow.style.display = "none";
      }
    }

    const totalEl = document.getElementById("total");
    if (totalEl) {
      totalEl.textContent = `${formatarPrecoBR(pedido.total)}`;
    }

    // Forma de pagamento
    const formaPagamentoEl = document.getElementById("formaPagamento");
    if (formaPagamentoEl) {
      formaPagamentoEl.innerHTML = pedido.formaPagamento;
    }

    // Impacto sustentável
    const ecoTextEl = document.querySelector(".eco-text");
    if (ecoTextEl) {
      const ecoText = `Com esta compra, você evitou <strong>${pedido.impactoCO2
        }</strong> de CO₂ 
                       e contribuiu para o plantio de <strong>${pedido.arvores
        } árvore${pedido.arvores > 1 ? "s" : ""}</strong>!`;
      ecoTextEl.innerHTML = ecoText;
    }

    // Gera QR Code para PIX se for o método de pagamento
    if (pedido.formaPagamento.includes("PIX")) {
      const qrCodeContainer = document.createElement("div");
      qrCodeContainer.className = "mt-3 text-center";
      qrCodeContainer.innerHTML = `
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://www.google.com.br/?hl=pt-BR" alt="QR Code de teste"> 
        <p class="small text-muted">Escaneie o QR Code para pagar</p>
      `; //Add IMG
      formaPagamentoEl.parentNode.appendChild(qrCodeContainer);
    }

    // Gera código de barras para boleto se for o método de pagamento
    if (pedido.formaPagamento.includes("Boleto")) {
      const boletoContainer = document.createElement("div");
      boletoContainer.className = "mt-3";
      boletoContainer.innerHTML = `
        <div class="d-flex align-items-center justify-content-between p-3 bg-light rounded">
          <code class="me-3">34191.79001 01043.510047 91020.150008 4 89110000099999</code>
          <button class="btn btn-sm btn-outline-success" onclick="navigator.clipboard.writeText('34191790010104351004791020150008489110000099999')">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
        <p class="small text-muted mt-2">Copie o código para pagar o boleto</p>
      `;
      formaPagamentoEl.parentNode.appendChild(boletoContainer);
    }

    console.log("Página preenchida com sucesso!");
  } catch (error) {
    console.error("Erro ao preencher página de confirmação:", error);
    mostrarErro("Erro ao exibir dados do pedido");
  }
}

// Função para mostrar toast
function mostrarToast(tipo, titulo, mensagem) {
  const toast = document.getElementById("liveToast");
  const toastTitle = document.getElementById("toastTitle");
  const toastMessage = document.getElementById("toastMessage");
  const iconElement = toast.querySelector(".toast-header i");

  // Configura o ícone e cores baseado no tipo
  switch (tipo) {
    case "success":
      iconElement.className = "bi bi-check-circle-fill text-success me-2";
      toast.classList.remove("bg-danger", "text-white");
      toast
        .querySelector(".toast-header")
        .classList.remove("bg-danger", "text-white");
      break;
    case "error":
      iconElement.className = "bi bi-exclamation-circle-fill text-danger me-2";
      toast.classList.add("bg-danger", "text-white");
      toast
        .querySelector(".toast-header")
        .classList.add("bg-danger", "text-white");
      break;
    case "info":
      iconElement.className = "bi bi-info-circle-fill text-primary me-2";
      toast.classList.remove("bg-danger", "text-white");
      toast
        .querySelector(".toast-header")
        .classList.remove("bg-danger", "text-white");
      break;
  }

  toastTitle.textContent = titulo;
  toastMessage.textContent = mensagem;

  const bsToast = new bootstrap.Toast(toast, {
    animation: true,
    autohide: true,
    delay: 5000,
  });
  bsToast.show();
}

// Função para mostrar erro
function mostrarErro(mensagem) {
  mostrarToast("error", "Erro", mensagem);
}

// Função para mostrar sucesso
function mostrarSucesso(mensagem) {
  mostrarToast("success", "Sucesso", mensagem);
}

// Função para mostrar informação
function mostrarInfo(mensagem) {
  mostrarToast("info", "Informação", mensagem);
}

// Funções para os botões de ação
function continuarComprando() {
  showSuccess('Obrigado pela compra!', 'Redirecionando para mais produtos sustentáveis...', {
    duration: 2000,
    actions: [
      {
        text: 'Ver ofertas',
        type: 'primary',
        handler: () => {
          window.location.href = "/public/produtos.html?categoria=ofertas";
        }
      }
    ]
  });

  setTimeout(() => {
    window.location.href = "/public/produtos.html";
  }, 2000);
}

async function acompanharPedido() {
  const numeroPedido = document.getElementById("numeroPedido").textContent;
  let dataConfirmacao = document.getElementById("dataConfirmacao").textContent;
  // Se a data estiver vazia, tenta buscar do sessionStorage ou mostra mensagem padrão
  if (!dataConfirmacao || dataConfirmacao.trim() === "") {
    const ultimoPedido = sessionStorage.getItem("ultimoPedido");
    if (ultimoPedido) {
      try {
        const pedido = JSON.parse(ultimoPedido);
        dataConfirmacao = pedido.dataConfirmacao || "Data não disponível";
      } catch (e) {
        dataConfirmacao = "Data não disponível";
      }
    } else {
      dataConfirmacao = "Data não disponível";
    }
  }
  // Atualiza informações básicas no modal
  document.getElementById("modalNumeroPedido").textContent = numeroPedido;
  document.getElementById("modalDataPedido").textContent = dataConfirmacao;

  // Monta a timeline de status
  const timelineTracking = document.querySelector(".timeline-tracking");
  const statusList = [
    {
      status: "Pedido Confirmado",
      data: dataConfirmacao,
      icon: "bi-check-circle-fill",
      active: true,
    },
    {
      status: "Em Preparação",
      data: "Em breve",
      icon: "bi-box-seam",
      active: false,
    },
    {
      status: "Em Transporte",
      data: "Em breve",
      icon: "bi-truck",
      active: false,
    },
    {
      status: "Entregue",
      data: document.getElementById("previsaoEntrega").textContent,
      icon: "bi-house-door",
      active: false,
    },
  ];

  // Limpa a timeline atual
  timelineTracking.innerHTML = "";

  // Cria os elementos da timeline
  statusList.forEach((item, index) => {
    const statusElement = document.createElement("div");
    statusElement.className = `status-step ${item.active ? "active" : ""}`;
    statusElement.innerHTML = `
          <div class="step-icon">
              <i class="bi ${item.icon}"></i>
          </div>
          <div class="step-content">
              <h4>${item.status}</h4>
              <p>${item.data}</p>
          </div>
      `;
    timelineTracking.appendChild(statusElement);

    // Adiciona linha conectora entre os status (exceto o último)
    if (index < statusList.length - 1) {
      const connector = document.createElement("div");
      connector.className = "status-connector";
      timelineTracking.appendChild(connector);
    }
  });

  // Abre o modal
  const modal = new bootstrap.Modal(
    document.getElementById("modalAcompanhamento")
  );
  modal.show();
}

function baixarComprovante() {
  mostrarInfo("Gerando seu comprovante...");
  const numeroPedido = document.getElementById("numeroPedido").textContent;
  const dataConfirmacao =
    document.getElementById("dataConfirmacao").textContent;
  const total = document.getElementById("total").textContent;

  // Cria o conteúdo do comprovante
  const comprovante = `
COMPROVANTE DE COMPRA - GREENLINE
================================

Número do Pedido: ${numeroPedido}
Data: ${dataConfirmacao}

RESUMO DO PEDIDO
+---------------
${document.getElementById("produtosPedido").innerText}

VALORES
+-------
Subtotal: ${document.getElementById("subtotal").textContent}
Frete: ${document.getElementById("frete").textContent}
Desconto: ${document.getElementById("desconto").textContent}
Total: ${total}

ENDEREÇO DE ENTREGA
------------------
${document.getElementById("enderecoEntrega").innerText}

FORMA DE PAGAMENTO
+----------------
${document.getElementById("formaPagamento").innerText}

================================
Obrigado por escolher produtos sustentáveis!
    `;

  // Cria o blob e faz o download
  const blob = new Blob([comprovante], { type: "text/plain" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comprovante_${numeroPedido.replace("#", "")}.txt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);

  // Após o download
  mostrarSucesso("Comprovante gerado com sucesso!");
}

function entrarContato() {
  mostrarInfo("Redirecionando para a página de contato...");
  setTimeout(() => {
    window.location.href = "/public/contato.html";
  }, 1000);
}

// Função para enviar solicitação de atualizações por email
async function enviarAtualizacoes() {
  const email = sessionStorage.getItem("email");
  const numeroPedido = document.getElementById("modalNumeroPedido").textContent;

  if (!email) {
    showError('Login necessário', 'Por favor, faça login para receber atualizações por email.');
    return;
  }

  const loadingId = showLoading('Configurando atualizações...', 'Registrando seu email para receber notificações');

  try {
    const response = await fetch(
      "https://green-line-web.onrender.com/solicitar-atualizacoes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          numeroPedido: numeroPedido,
        }),
      }
    );

    hideNotification(loadingId);

    if (response.ok) {
      showSuccess('Atualizações configuradas!', 'Você receberá atualizações sobre seu pedido por email!');
      // Fecha o modal após sucesso
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("modalAcompanhamento")
      );
      if (modal) modal.hide();
    } else {
      throw new Error("Falha ao solicitar atualizações");
    }
  } catch (erro) {
    console.error("Erro ao solicitar atualizações:", erro);
    hideNotification(loadingId);
    showError('Erro nas atualizações', 'Não foi possível configurar as atualizações por email. Tente novamente mais tarde.');
  }
}

// Função para carregar produtos relacionados
// async function carregarProdutosRelacionados() {
//   const produtosContainer = document.getElementById("produtosRelacionados");
//   if (!produtosContainer) return;

//   try {
//     // Busca produtos da mesma categoria
//     const ultimoPedido = sessionStorage.getItem("ultimoPedido");
//     if (!ultimoPedido) return;

//     const pedido = JSON.parse(ultimoPedido);
//     const categorias = pedido.produtos.map(p => p.categoria).filter(Boolean);

//     if (categorias.length === 0) return;

//     const response = await fetch(`${api.online}/produtos/categoria/${categorias[0]}`);
//     if (!response.ok) throw new Error('Falha ao buscar produtos relacionados');

//     const produtos = await response.json();
//     const produtosRelacionados = produtos.slice(0, 3); // Limita a 3 produtos

//     produtosRelacionados.forEach(produto => {
//       const produtoHTML = `
//         <div class="col-md-4 mb-3">
//           <div class="card h-100">
//             <img src="${produto.imagem_1}" class="card-img-top" alt="${produto.nome}" style="height: 200px; object-fit: cover;">
//             <div class="card-body d-flex flex-column">
//               <h5 class="card-title">${produto.nome}</h5>
//               <p class="card-text text-success fw-bold mt-auto">R$ ${produto.preco.toFixed(2).replace('.', ',')}</p>
//               <button class="btn btn-outline-success btn-sm" onclick="window.location.href='produtos.html?id=${produto.id}'">
//                 Ver Produto
//               </button>
//             </div>
//           </div>
//         </div>
//       `;
//       produtosContainer.insertAdjacentHTML('beforeend', produtoHTML);
//     });
//   } catch (erro) {
//     console.error('Erro ao carregar produtos relacionados:', erro);
//   }
// }

// Função para formatar preço no padrão brasileiro
function formatarPrecoBR(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Inicialização do módulo
document.addEventListener("DOMContentLoaded", () => {
  // Carrega dados do pedido
  carregarDadosPedido();

  // Event listeners para os botões
  const btnContinuar = document.getElementById("btnContinuarComprando");
  if (btnContinuar) btnContinuar.addEventListener("click", continuarComprando);
  const btnAcompanhar = document.getElementById("btnAcompanharPedido");
  if (btnAcompanhar) btnAcompanhar.addEventListener("click", acompanharPedido);
  const btnBaixar = document.getElementById("btnBaixarComprovante");
  if (btnBaixar) btnBaixar.addEventListener("click", baixarComprovante);
  const btnContato = document.getElementById("btnEntrarContato");
  if (btnContato) btnContato.addEventListener("click", entrarContato);
  const btnAtualizacoes = document.getElementById("btnEnviarAtualizacoes");
  if (btnAtualizacoes) btnAtualizacoes.addEventListener("click", enviarAtualizacoes);

  // Carrega produtos relacionados
  //carregarProdutosRelacionados();
});

// Função para limpar dados após confirmação
window.addEventListener("beforeunload", function () {
  // Mantém dados do último pedido, mas limpa dados temporários após um tempo
  setTimeout(() => {
    sessionStorage.removeItem("dadosCompra");
    sessionStorage.removeItem("dadosFormulario");
  }, 300000); // Remove após 5 minutos
});
