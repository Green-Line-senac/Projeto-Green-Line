// Integração do frontend com o backend - GreenLine
const API_BASE_URL = "http://localhost:3000/api"
const bootstrap = window.bootstrap // Assuming bootstrap is available globally

document.addEventListener("DOMContentLoaded", () => {
  // Elementos do formulário
  const formCheckout = document.getElementById("form-checkout")
  const cepInput = document.getElementById("cep")
  const freteContainer = document.getElementById("frete-info")
  const totalContainer = document.getElementById("contador-total")

  // Inicializar funcionalidades
  initializeCEPValidation()
  initializeFormSubmission()
  updateOrderSummary()
})

// Validação e preenchimento automático do CEP
function initializeCEPValidation() {
  const cepInput = document.getElementById("cep")

  if (cepInput) {
    cepInput.addEventListener("blur", async function () {
      const cep = this.value.replace(/\D/g, "")

      if (cep.length === 8) {
        await validarCEP(cep)
        await calcularFrete()
      }
    })
  }
}

// Validar CEP com a API
async function validarCEP(cep) {
  try {
    const response = await fetch(`${API_BASE_URL}/cep/${cep}`)
    const data = await response.json()

    if (data.sucesso) {
      // Preencher campos automaticamente
      const ruaInput = document.getElementById("rua")
      const bairroInput = document.getElementById("bairro")
      const cidadeInput = document.getElementById("cidade")
      const estadoInput = document.getElementById("estado")

      if (ruaInput && !ruaInput.value) ruaInput.value = data.dados.logradouro
      if (bairroInput && !bairroInput.value) bairroInput.value = data.dados.bairro
      if (cidadeInput) cidadeInput.value = data.dados.cidade
      if (estadoInput) estadoInput.value = data.dados.uf

      // Mostrar feedback positivo
      mostrarFeedback("CEP válido! Endereço preenchido automaticamente.", "success")
    } else {
      mostrarFeedback("CEP não encontrado.", "warning")
    }
  } catch (error) {
    console.error("Erro ao validar CEP:", error)
    mostrarFeedback("Erro ao validar CEP.", "error")
  }
}

// Calcular frete
async function calcularFrete() {
  try {
    const cep = document.getElementById("cep").value.replace(/\D/g, "")
    const dadosCompra = JSON.parse(localStorage.getItem("dadosCompra") || "[]")

    let subtotal = 0
    if (Array.isArray(dadosCompra)) {
      subtotal = dadosCompra.reduce((total, item) => total + Number.parseFloat(item.subtotal || 0), 0)
    } else if (dadosCompra.subtotal) {
      subtotal = Number.parseFloat(dadosCompra.subtotal)
    }

    const response = await fetch(`${API_BASE_URL}/calcular-frete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cep, subtotal }),
    })

    const data = await response.json()

    if (data.sucesso) {
      // Atualizar display do frete
      const freteElement = document.getElementById("contador-frete")
      if (freteElement) {
        if (data.frete === 0) {
          freteElement.textContent = "GRÁTIS"
          freteElement.className = "text-success fw-bold"
        } else {
          freteElement.textContent = `R$ ${data.frete.toFixed(2).replace(".", ",")}`
          freteElement.className = ""
        }
      }

      // Atualizar total
      atualizarTotal(subtotal, data.frete)

      if (data.frete_gratis) {
        mostrarFeedback("🎉 Você ganhou frete grátis!", "success")
      }
    }
  } catch (error) {
    console.error("Erro ao calcular frete:", error)
  }
}

// Atualizar total do pedido
function atualizarTotal(subtotal, frete = 0, desconto = 0) {
  const total = subtotal + frete - desconto

  const subtotalElement = document.getElementById("contador-subtotal")
  const totalElement = document.getElementById("contador-total")

  if (subtotalElement) {
    subtotalElement.textContent = `R$ ${subtotal.toFixed(2).replace(".", ",")}`
  }

  if (totalElement) {
    totalElement.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`
  }

  return total
}

// Inicializar submissão do formulário
function initializeFormSubmission() {
  const formCheckout = document.getElementById("form-checkout")

  if (formCheckout) {
    formCheckout.addEventListener("submit", async (e) => {
      e.preventDefault()
      await processarCheckout()
    })
  }
}

// Processar checkout
async function processarCheckout() {
  try {
    // Mostrar loading
    mostrarLoading(true)

    // Coletar dados do formulário
    const dadosCheckout = coletarDadosFormulario()

    // Validar dados
    if (!validarDadosCheckout(dadosCheckout)) {
      mostrarLoading(false)
      return
    }

    // Enviar para API
    const response = await fetch(`${API_BASE_URL}/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dadosCheckout),
    })

    const data = await response.json()

    if (data.sucesso) {
      // Sucesso - redirecionar para página de confirmação
      localStorage.setItem("ultimoPedido", JSON.stringify(data.pedido))

      // Limpar carrinho
      localStorage.removeItem("dadosCompra")

      // Mostrar modal de sucesso ou redirecionar
      if (data.pagamento.metodo === "pix") {
        mostrarModalPIX(data.pix)
      } else if (data.pagamento.metodo === "boleto") {
        mostrarModalBoleto(data.boleto)
      } else {
        window.location.href = data.redirect_url
      }
    } else {
      // Erro - mostrar mensagem
      mostrarFeedback(data.erro, "error")
    }
  } catch (error) {
    console.error("Erro no checkout:", error)
    mostrarFeedback("Erro ao processar pedido. Tente novamente.", "error")
  } finally {
    mostrarLoading(false)
  }
}

// Coletar dados do formulário
function coletarDadosFormulario() {
  // Dados do cliente
  const cliente = {
    nome: document.getElementById("nome").value,
    email: document.getElementById("email").value,
    telefone: document.getElementById("telefone").value,
    cpf: document.getElementById("cpf")?.value,
  }

  // Dados do endereço
  const endereco = {
    cep: document.getElementById("cep").value,
    rua: document.getElementById("rua").value,
    numero: document.getElementById("numero").value,
    complemento: document.getElementById("complemento")?.value,
    bairro: document.getElementById("bairro").value,
    cidade: document.getElementById("cidade").value,
    estado: document.getElementById("estado").value,
  }

  // Dados do pagamento
  const metodoPagamento = document.getElementById("pagamento").value
  const pagamento = {
    metodo: metodoPagamento,
  }

  // Dados específicos do cartão de crédito
  if (metodoPagamento === "CC") {
    pagamento.numero_cartao = document.getElementById("numero-cartao").value.replace(/\s/g, "")
    pagamento.nome_cartao = document.getElementById("nome-cartao").value
    pagamento.validade = document.getElementById("validade-cartao").value
    pagamento.cvv = document.getElementById("cvv").value
    pagamento.parcelas = document.getElementById("parcelas").value
  }

  // Produtos do localStorage
  const dadosCompra = JSON.parse(localStorage.getItem("dadosCompra") || "[]")
  const produtos = Array.isArray(dadosCompra) ? dadosCompra : [dadosCompra]

  return {
    cliente,
    endereco,
    pagamento,
    produtos: produtos.map((item) => ({
      id: item.id || item.produto_id,
      quantidade: Number.parseInt(item.quantidade),
      preco_unitario: Number.parseFloat(item.preco_final || item.preco),
    })),
  }
}

// Validar dados do checkout
function validarDadosCheckout(dados) {
  const erros = []

  // Validar cliente
  if (!dados.cliente.nome) erros.push("Nome é obrigatório")
  if (!dados.cliente.email) erros.push("Email é obrigatório")
  if (!dados.cliente.telefone) erros.push("Telefone é obrigatório")

  // Validar endereço
  if (!dados.endereco.cep) erros.push("CEP é obrigatório")
  if (!dados.endereco.rua) erros.push("Endereço é obrigatório")
  if (!dados.endereco.cidade) erros.push("Cidade é obrigatória")

  // Validar pagamento
  if (!dados.pagamento.metodo) erros.push("Método de pagamento é obrigatório")

  if (dados.pagamento.metodo === "CC") {
    if (!dados.pagamento.numero_cartao) erros.push("Número do cartão é obrigatório")
    if (!dados.pagamento.nome_cartao) erros.push("Nome no cartão é obrigatório")
    if (!dados.pagamento.validade) erros.push("Validade é obrigatória")
    if (!dados.pagamento.cvv) erros.push("CVV é obrigatório")
    if (!dados.pagamento.parcelas) erros.push("Parcelas são obrigatórias")
  }

  // Validar produtos
  if (!dados.produtos || dados.produtos.length === 0) {
    erros.push("Nenhum produto selecionado")
  }

  if (erros.length > 0) {
    mostrarFeedback(erros.join("<br>"), "error")
    return false
  }

  return true
}

// Mostrar modal PIX
function mostrarModalPIX(dadosPIX) {
  const modal = document.createElement("div")
  modal.className = "modal fade"
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Pagamento PIX</h5>
        </div>
        <div class="modal-body text-center">
          <h6>Escaneie o QR Code ou copie o código PIX</h6>
          <img src="${dadosPIX.qr_code}" alt="QR Code PIX" class="img-fluid mb-3">
          <div class="input-group">
            <input type="text" class="form-control" value="${dadosPIX.codigo}" readonly>
            <button class="btn btn-success" onclick="copiarPIX('${dadosPIX.codigo}')">Copiar</button>
          </div>
          <small class="text-muted">Válido até: ${new Date(dadosPIX.validade).toLocaleString()}</small>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-success" onclick="window.location.href='/pedido-confirmado.html'">
            Continuar
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)
  new bootstrap.Modal(modal).show()
}

// Mostrar modal Boleto
function mostrarModalBoleto(dadosBoleto) {
  const modal = document.createElement("div")
  modal.className = "modal fade"
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Boleto Bancário</h5>
        </div>
        <div class="modal-body">
          <h6>Linha digitável:</h6>
          <div class="input-group mb-3">
            <input type="text" class="form-control" value="${dadosBoleto.linha_digitavel}" readonly>
            <button class="btn btn-success" onclick="copiarBoleto('${dadosBoleto.linha_digitavel}')">Copiar</button>
          </div>
          <p><strong>Vencimento:</strong> ${new Date(dadosBoleto.vencimento).toLocaleDateString()}</p>
          <div class="text-center">
            <button class="btn btn-outline-success" onclick="imprimirBoleto('${dadosBoleto.codigo}')">
              <i class="bi bi-printer"></i> Imprimir Boleto
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-success" onclick="window.location.href='/pedido-confirmado.html'">
            Continuar
          </button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(modal)
  new bootstrap.Modal(modal).show()
}

// Funções auxiliares
function copiarPIX(codigo) {
  navigator.clipboard.writeText(codigo)
  mostrarFeedback("Código PIX copiado!", "success")
}

function copiarBoleto(linha) {
  navigator.clipboard.writeText(linha)
  mostrarFeedback("Linha digitável copiada!", "success")
}

function imprimirBoleto(codigo) {
  window.open(`/api/boleto/${codigo}/pdf`, "_blank")
}

function mostrarLoading(show) {
  const button = document.querySelector('button[type="submit"]')
  if (button) {
    if (show) {
      button.disabled = true
      button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processando...'
    } else {
      button.disabled = false
      button.innerHTML = "Finalizar Pedido"
    }
  }
}

function mostrarFeedback(mensagem, tipo) {
  // Criar toast ou alert
  const alert = document.createElement("div")
  alert.className = `alert alert-${tipo === "success" ? "success" : tipo === "error" ? "danger" : "warning"} alert-dismissible fade show`
  alert.innerHTML = `
    ${mensagem}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `

  // Inserir no topo da página
  const container = document.querySelector(".container") || document.body
  container.insertBefore(alert, container.firstChild)

  // Remover automaticamente após 5 segundos
  setTimeout(() => {
    if (alert.parentNode) {
      alert.remove()
    }
  }, 5000)
}

function updateOrderSummary() {
  // Atualizar resumo do pedido na inicialização
  const dadosCompra = JSON.parse(localStorage.getItem("dadosCompra") || "[]")

  if (Array.isArray(dadosCompra) && dadosCompra.length > 0) {
    const subtotal = dadosCompra.reduce((total, item) => total + Number.parseFloat(item.subtotal || 0), 0)
    atualizarTotal(subtotal)
  }
}
