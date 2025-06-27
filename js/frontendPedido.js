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
          ${dadosCliente.endereco}, ${dadosCliente.numeroCasa}${
    dadosCliente.complementoCasa ? " - " + dadosCliente.complementoCasa : ""
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
            total: pedido.total.toFixed(2),
            previsaoEntrega: pedido.previsaoEntrega,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Falha ao enviar email");
    }

    console.log("Email de confirmação enviado com sucesso");
  } catch (erro) {
    console.error("Erro ao enviar email:", erro);
  }
}

// Função principal para carregar dados do pedido
async function carregarDadosPedido() {
  try {
    console.log("Iniciando carregamento dos dados do pedido...");

    // Carrega dados da compra
    const dadosCompraStr = sessionStorage.getItem("dadosCompra");
    const dadosFormularioStr = sessionStorage.getItem("dadosFormulario");

    if (!dadosCompraStr) {
      console.error("Dados da compra não encontrados no sessionStorage");
      mostrarErro(
        "Dados da compra não encontrados. Redirecionando para a página de vendas..."
      );
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
      mostrarErro("Erro nos dados da compra");
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

    const frete = 19.9; // Valor fixo do frete
    const desconto = subtotal > 100 ? 10.0 : 0; // Desconto eco para compras acima de R$ 100
    const total = subtotal + frete - desconto;

    // Gera informações do pedido
    const numeroPedido = gerarNumeroPedido();
    const dataConfirmacao = formatarDataHora();
    const metodoEntrega = determinarMetodoEntrega(dadosFormulario.cep);
    const previsaoEntrega = calcularPrevisaoEntrega(metodoEntrega);
    const impacto = calcularImpactoSustentavel(dadosCompra);

    // Monta objeto completo do pedido
    const pedido = {
      idPessoa: sessionStorage.getItem("id_pessoa"),
      nomeTitular: sessionStorage.getItem("usuario") || "Cliente",
      numeroPedido,
      dataConfirmacao,
      previsaoEntrega,
      enderecoEntrega: dadosFormulario,
      metodoEntrega,
      produtos: dadosCompra.map((item) => ({
        nome: item.nome_produto || "Produto",
        quantidade: parseInt(item.quantidade) || 1,
        preco: parseFloat(item.preco_final) || 0,
        subtotal: parseFloat(item.subtotal) || 0,
      })),
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
          : [
              dadosFormulario.numeroCartao,
              dadosFormulario.nomeCartao,
              dadosFormulario.validadeCartao,
              dadosFormulario.cvv,
              dadosFormulario.parcelas ? `${dadosFormulario.parcelas}x` : "1x",
            ],
      email: dadosFormulario.email,
    };
    await salvarPedido(pedido);

    // Preenche a página com os dados
    await preencherPaginaConfirmacao(pedido);

    // Salva dados do pedido para uso futuro
    sessionStorage.setItem("ultimoPedido", JSON.stringify(pedido));

    // Envia email de confirmação
    await enviarEmailConfirmacao(pedido);
  } catch (error) {
    console.error("Erro geral ao carregar dados do pedido:", error);
    mostrarErro("Erro inesperado ao carregar dados do pedido");
  }
}
async function salvarPedido(pedido) {
  try {
    const response = await fetch(`${apiPedido.online}/salvar-pedido`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pedido),
    });

    if (!response.ok) {
      throw new Error("Erro ao salvar pedido");
    }

    const resultado = await response.json();
    console.log("Pedido salvo com sucesso:", resultado);
  } catch (error) {
    console.error("Erro ao salvar pedido:", error);
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
      enderecoEntregaEl.innerHTML = `
      ${sessionStorage.getItem("usuario") || "Cliente"}<br>
          ${pedido.enderecoEntrega.endereco}, ${
        pedido.enderecoEntrega.numeroCasa
      }${
        pedido.enderecoEntrega.complementoCasa
          ? " - " + pedido.enderecoEntrega.complementoCasa
          : ""
      }<br>
          ${pedido.enderecoEntrega.bairro}<br>
          ${pedido.enderecoEntrega.cidade} - ${
        pedido.enderecoEntrega.estado
      }, ${pedido.enderecoEntrega.cep}`;
    } else {
      `Endereço não informado<br>
            Complete seus dados na próxima compra<br>
            para uma experiência melhor`;
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
        const produtoHTML = `
          <div class="order-item d-flex justify-content-between align-items-center py-3 ${
            index < pedido.produtos.length - 1 ? "border-bottom" : ""
          }">
            <div class="item-info">
              <h5 class="item-name mb-1">${produto.nome}</h5>
              <p class="item-details text-muted mb-0">
                Quantidade: ${produto.quantidade} × R$ ${produto.preco
          .toFixed(2)
          .replace(".", ",")}
              </p>
            </div>
            <div class="item-total">
              <strong>R$ ${produto.subtotal
                .toFixed(2)
                .replace(".", ",")}</strong>
            </div>
          </div>
        `;
        produtosContainer.insertAdjacentHTML("beforeend", produtoHTML);
      });
    }

    // Resumo financeiro
    const subtotalEl = document.getElementById("subtotal");
    if (subtotalEl) {
      subtotalEl.textContent = `R$ ${pedido.subtotal
        .toFixed(2)
        .replace(".", ",")}`;
    }

    const freteEl = document.getElementById("frete");
    if (freteEl) {
      freteEl.textContent = `R$ ${pedido.frete.toFixed(2).replace(".", ",")}`;
    }

    const descontoEl = document.getElementById("desconto");
    if (descontoEl) {
      descontoEl.textContent = `-R$ ${pedido.desconto
        .toFixed(2)
        .replace(".", ",")}`;
      // Oculta linha de desconto se for zero
      if (pedido.desconto === 0) {
        const descontoRow = descontoEl.closest(".summary-row");
        if (descontoRow) descontoRow.style.display = "none";
      }
    }

    const totalEl = document.getElementById("total");
    if (totalEl) {
      totalEl.textContent = `R$ ${pedido.total.toFixed(2).replace(".", ",")}`;
    }

    // Forma de pagamento
    const formaPagamentoEl = document.getElementById("formaPagamento");
    if (formaPagamentoEl) {
      formaPagamentoEl.innerHTML = pedido.formaPagamento;
    }

    // Impacto sustentável
    const ecoTextEl = document.querySelector(".eco-text");
    if (ecoTextEl) {
      const ecoText = `Com esta compra, você evitou <strong>${
        pedido.impactoCO2
      }</strong> de CO₂ 
                       e contribuiu para o plantio de <strong>${
                         pedido.arvores
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
  mostrarInfo("Redirecionando para a página de produtos...");
  setTimeout(() => {
    window.location.href = "/public/produtos.html";
  }, 1000);
}

async function acompanharPedido() {
  const numeroPedido = document.getElementById("numeroPedido").textContent;
  const dataConfirmacao =
    document.getElementById("dataConfirmacao").textContent;

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
    mostrarErro("Por favor, faça login para receber atualizações por email.");
    return;
  }

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

    if (response.ok) {
      mostrarSucesso("Você receberá atualizações sobre seu pedido por email!");
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
    mostrarErro(
      "Não foi possível configurar as atualizações por email. Tente novamente mais tarde."
    );
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

// Inicialização do módulo
document.addEventListener("DOMContentLoaded", () => {
  // Carrega dados do pedido
  carregarDadosPedido();

  // Event listeners para os botões
  document
    .getElementById("btnContinuarComprando")
    .addEventListener("click", continuarComprando);
  document
    .getElementById("btnAcompanharPedido")
    .addEventListener("click", acompanharPedido);
  document
    .getElementById("btnBaixarComprovante")
    .addEventListener("click", baixarComprovante);
  document
    .getElementById("btnEntrarContato")
    .addEventListener("click", entrarContato);
  document
    .getElementById("btnEnviarAtualizacoes")
    .addEventListener("click", enviarAtualizacoes);

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
