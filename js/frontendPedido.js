// JavaScript para página de pedido confirmado - GreenLine
document.addEventListener("DOMContentLoaded", () => {
  // Inicializar página
  initializePage()
  loadOrderData()
  loadRelatedProducts()

  console.log("Página de pedido confirmado carregada com sucesso!")
})

// Dados simulados do pedido (normalmente viriam do backend)
const orderData = {
  numero: "#GL-2025-001234",
  dataConfirmacao: new Date().toLocaleString("pt-BR"),
  previsaoEntrega: "3-5 dias úteis",
  status: "confirmado",
  cliente: {
    nome: "João Silva",
    endereco: {
      rua: "Rua das Flores, 123 - Apt 45",
      bairro: "Jardim Sustentável",
      cidade: "Brasília",
      estado: "DF",
      cep: "70000-000",
    },
  },
  produtos: [
    
  ]
}

// Produtos relacionados simulados
const relatedProducts = [
  {
    id: 101,
    nome: "Escova de Dente de Bambu",
    preco: 12.9,
    imagem: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 102,
    nome: "Detergente Ecológico",
    preco: 18.5,
    imagem: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 103,
    nome: "Sacola Reutilizável",
    preco: 22.0,
    imagem: "/placeholder.svg?height=200&width=200",
  },
  {
    id: 104,
    nome: "Canudo de Inox",
    preco: 8.9,
    imagem: "/placeholder.svg?height=200&width=200",
  },
]

// Inicializar página
function initializePage() {
  // Atualizar número do pedido na URL se disponível
  const urlParams = new URLSearchParams(window.location.search)
  const orderNumber = urlParams.get("pedido")

  if (orderNumber) {
    orderData.numero = orderNumber
    document.getElementById("numeroPedido").textContent = orderNumber
  }

  // Configurar data de confirmação
  document.getElementById("dataConfirmacao").textContent = orderData.dataConfirmacao
  document.getElementById("previsaoEntrega").textContent = `Previsão: ${orderData.previsaoEntrega}`
}

// Carregar dados do pedido
function loadOrderData() {
  // Carregar produtos do pedido
  loadOrderItems()

  // Carregar informações de entrega
  loadDeliveryInfo()

  // Carregar resumo do pedido
  loadOrderSummary()

  // Atualizar impacto ecológico
  updateEcoImpact()
}

// Carregar itens do pedido
function loadOrderItems() {
  const container = document.getElementById("produtosPedido")
  container.innerHTML = ""

  orderData.produtos.forEach((produto) => {
    const itemElement = createOrderItem(produto)
    container.appendChild(itemElement)
  })
}

// Criar elemento de item do pedido
function createOrderItem(produto) {
  const item = document.createElement("div")
  item.className = "order-item"

  item.innerHTML = `
        <img src="${produto.imagem}" alt="${produto.nome}" class="item-image">
        <div class="item-details">
            <div class="item-name">${produto.nome}</div>
            <div class="item-description">${produto.descricao}</div>
            <div class="item-quantity">Quantidade: ${produto.quantidade}</div>
        </div>
        <div class="item-price">R$ ${(produto.preco * produto.quantidade).toFixed(2).replace(".", ",")}</div>
    `

  return item
}

// Carregar informações de entrega
function loadDeliveryInfo() {
  const enderecoElement = document.getElementById("enderecoEntrega")
  const metodoElement = document.getElementById("metodoEntrega")

  enderecoElement.innerHTML = `
        ${orderData.cliente.nome}<br>
        ${orderData.cliente.endereco.rua}<br>
        ${orderData.cliente.endereco.bairro}<br>
        ${orderData.cliente.endereco.cidade} - ${orderData.cliente.endereco.estado}, ${orderData.cliente.endereco.cep}
    `

  metodoElement.innerHTML = `
        <i class="bi bi-truck me-2"></i>
        ${orderData.entrega.metodo} (${orderData.entrega.prazo})
    `
}

// Carregar resumo do pedido
function loadOrderSummary() {
  document.getElementById("subtotal").textContent = `R$ ${orderData.resumo.subtotal.toFixed(2).replace(".", ",")}`
  document.getElementById("frete").textContent = `R$ ${orderData.resumo.frete.toFixed(2).replace(".", ",")}`
  document.getElementById("desconto").textContent = `-R$ ${orderData.resumo.desconto.toFixed(2).replace(".", ",")}`
  document.getElementById("total").textContent = `R$ ${orderData.resumo.total.toFixed(2).replace(".", ",")}`

  document.getElementById("formaPagamento").innerHTML = `
        <i class="bi bi-credit-card me-2"></i>
        ${orderData.pagamento.metodo} ${orderData.pagamento.cartao}
    `
}

// Atualizar impacto ecológico
function updateEcoImpact() {
  const ecoText = document.querySelector(".eco-text")
  ecoText.innerHTML = `
        Com esta compra, você evitou <strong>${orderData.impactoEco.co2Evitado}kg</strong> de CO₂ 
        e contribuiu para o plantio de <strong>${orderData.impactoEco.arvoresPlantadas} árvore</strong>!
    `
}

// Carregar produtos relacionados
function loadRelatedProducts() {
  const container = document.getElementById("produtosRelacionados")
  container.innerHTML = ""

  relatedProducts.forEach((produto) => {
    const productElement = createRelatedProduct(produto)
    container.appendChild(productElement)
  })
}

// Criar elemento de produto relacionado
function createRelatedProduct(produto) {
  const col = document.createElement("div")
  col.className = "col-6 col-md-3 mb-3"

  col.innerHTML = `
        <div class="related-product-card">
            <div class="related-product-image">
                <img src="${produto.imagem}" alt="${produto.nome}">
            </div>
            <div class="related-product-info">
                <div class="related-product-title">${produto.nome}</div>
                <div class="related-product-price">R$ ${produto.preco.toFixed(2).replace(".", ",")}</div>
                <button class="btn btn-success btn-sm w-100" onclick="addToCart(${produto.id})">
                    <i class="bi bi-cart-plus me-1"></i>
                    Adicionar
                </button>
            </div>
        </div>
    `

  return col
}

// Funções de ação dos botões
function continuarComprando() {
  window.location.href = "produtos.html"
}

function acompanharPedido() {
  // Simular redirecionamento para página de acompanhamento
  alert(`Redirecionando para acompanhamento do pedido ${orderData.numero}`)
  // window.location.href = `acompanhar-pedido.html?pedido=${orderData.numero}`;
}

function baixarComprovante() {
  // Simular download do comprovante
  const blob = new Blob([generateReceiptText()], { type: "text/plain" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `comprovante-${orderData.numero.replace("#", "")}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

function entrarContato() {
  // Simular abertura do chat de suporte
  alert("Redirecionando para o chat de suporte...")
  // window.location.href = 'contato.html';
}

function addToCart(productId) {
  // Simular adição ao carrinho
  const produto = relatedProducts.find((p) => p.id === productId)
  if (produto) {
    // Atualizar badge do carrinho
    const badge = document.getElementById("badge-carrinho")
    const currentCount = Number.parseInt(badge.textContent) || 0
    badge.textContent = currentCount + 1

    // Feedback visual
    const button = event.target.closest("button")
    const originalText = button.innerHTML
    button.innerHTML = '<i class="bi bi-check me-1"></i>Adicionado!'
    button.classList.add("btn-outline-success")
    button.classList.remove("btn-success")

    setTimeout(() => {
      button.innerHTML = originalText
      button.classList.remove("btn-outline-success")
      button.classList.add("btn-success")
    }, 2000)

    console.log(`Produto ${produto.nome} adicionado ao carrinho`)
  }
}

// Gerar texto do comprovante
function generateReceiptText() {
  return `
GREENLINE - COMPROVANTE DE PEDIDO
==================================

Número do Pedido: ${orderData.numero}
Data: ${orderData.dataConfirmacao}

PRODUTOS:
${orderData.produtos
  .map((p) => `- ${p.nome} (${p.quantidade}x) - R$ ${(p.preco * p.quantidade).toFixed(2).replace(".", ",")}`)
  .join("\n")}

RESUMO:
Subtotal: R$ ${orderData.resumo.subtotal.toFixed(2).replace(".", ",")}
Frete: R$ ${orderData.resumo.frete.toFixed(2).replace(".", ",")}
Desconto: -R$ ${orderData.resumo.desconto.toFixed(2).replace(".", ",")}
TOTAL: R$ ${orderData.resumo.total.toFixed(2).replace(".", ",")}

ENTREGA:
${orderData.cliente.nome}
${orderData.cliente.endereco.rua}
${orderData.cliente.endereco.bairro}
${orderData.cliente.endereco.cidade} - ${orderData.cliente.endereco.estado}, ${orderData.cliente.endereco.cep}

Método: ${orderData.entrega.metodo}
Prazo: ${orderData.entrega.prazo}

PAGAMENTO:
${orderData.pagamento.metodo} ${orderData.pagamento.cartao}

IMPACTO SUSTENTÁVEL:
CO₂ evitado: ${orderData.impactoEco.co2Evitado}kg
Árvores plantadas: ${orderData.impactoEco.arvoresPlantadas}

Obrigado por escolher produtos sustentáveis!
GreenLine - Sustentabilidade e Qualidade
    `.trim()
}

// Simular atualização em tempo real do status
function simulateStatusUpdate() {
  setTimeout(() => {
    // Simular mudança de status após 5 segundos
    const preparingStep = document.querySelector(".status-step:nth-child(2)")
    preparingStep.classList.add("active")

    // Atualizar texto
    const preparingText = preparingStep.querySelector("p")
    preparingText.textContent = "Agora"

    console.log("Status atualizado: Preparando pedido")
  }, 5000)
}

// Iniciar simulação de atualização de status
simulateStatusUpdate()

// Função para integração com backend (exemplo)
async function fetchOrderData(orderNumber) {
  try {
    // Exemplo de chamada para API
    const response = await fetch(`/api/orders/${orderNumber}`)
    if (response.ok) {
      const data = await response.json()
      return data
    } else {
      throw new Error("Pedido não encontrado")
    }
  } catch (error) {
    console.error("Erro ao carregar dados do pedido:", error)
    // Usar dados simulados como fallback
    return orderData
  }
}

// Função para salvar dados no localStorage (para persistência local)
function saveOrderToLocalStorage() {
  localStorage.setItem("lastOrder", JSON.stringify(orderData))
}

// Função para carregar dados do localStorage
function loadOrderFromLocalStorage() {
  const saved = localStorage.getItem("lastOrder")
  if (saved) {
    return JSON.parse(saved)
  }
  return null
}

// Salvar pedido atual
saveOrderToLocalStorage()
