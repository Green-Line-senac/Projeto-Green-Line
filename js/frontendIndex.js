// Configurações globais
const config = {
  online: "https://green-line-web.onrender.com",
  produtos: "http://localhost:3003",
  index: "http://localhost:3002",
  fallbackImage:
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5OTkiPk5lbmh1bWEgSW1hZ2VtPC90ZXh0Pjwvc3ZnPg==",
};
// Inicialização
document.addEventListener("DOMContentLoaded", inicializarApp);

// Cache de elementos DOM
const elementos = {
  carrosselImagem: document.getElementById("carrosel-imagem"),
  produtosContainer: document.getElementById("container-produtos"),
  iconeUsuario: document.getElementById("icone-usuario"),
  produtoModal: new bootstrap.Modal("#produtoModal"),
  modalAlert: document.getElementById("modal-alert"),
};

// Estado da aplicação
let estado = {
  produtos: [],
  carregando: false,
  id_pessoa: null || sessionStorage.getItem("id_pessoa"),
  id_produto: null,
  quantidadeProdutos: 1,
};
const caminho = window.location.pathname.includes("green_line_web")
          ? "/green_line_web/public"
          : "/public";

// ==================== FUNÇÕES PRINCIPAIS ====================

async function inicializarApp() {
  try {
    estado.carregando = true;
    await Promise.all([carregarProdutosPromocao()]);
  } catch (erro) {
    console.error("Erro na inicialização:", erro);
    mostrarFeedback("Opa, algo deu errado! Tente recarregar.", "danger");
  } finally {
    estado.carregando = false;
  }
}


// ==================== FUNÇÕES DE CARREGAMENTO ====================
async function carregarProdutosPromocao() {
  try {
    // Mostrar loading enquanto carrega produtos
    showLoading(LoadingPresets.carregandoProdutos);
    mostrarLoader();

    const response = await fetch(`${config.online}/produtos`);
    const { success, data, message } = await response.json();

    if (!success || !Array.isArray(data)) {
      throw new Error(message || "Dados inválidos");
    }

    estado.produtos = data.map(sanitizarProduto);
    renderizarProdutos();
  } catch (erro) {
    console.error("Erro:", erro);
    mostrarErroCarregamento();
  } finally {
    // Esconder loading após carregar produtos
    hideLoading();
  }
}

// ==================== FUNÇÕES DE RENDERIZAÇÃO ====================

function renderizarProdutos() {
  console.log("Renderizando produtos:", estado.produtos);
  elementos.produtosContainer.innerHTML = "";

  if (!estado.produtos.length) {
    elementos.produtosContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-tag fs-1 text-muted"></i>
        <p class="text-muted mt-2">Nenhum produto em promoção no momento</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();

  estado.produtos.forEach((produto) => {
    const card = criarCardProduto(produto);
    fragment.appendChild(card);
  });

  elementos.produtosContainer.appendChild(fragment);
}

function formatarPrecoBR(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function criarCardProduto(produto) {
  const card = document.createElement("div");
  card.className = "col-12 col-sm-6 col-md-4 col-lg-3 mb-4";
  
  // Lógica corrigida para preços
  let precoFormatado;
  if (produto.promocao && produto.preco_promocional > 0) {
    // Produto em promoção com preço promocional válido
    precoFormatado = `<span style="text-decoration: line-through; font-size: 0.9rem;">${formatarPrecoBR(produto.preco)}</span>
       <span class="fs-5 ms-2 text-success">${formatarPrecoBR(produto.preco_promocional)}</span>`;
  } else {
    // Produto sem promoção ou sem preço promocional válido - usa preço normal
    precoFormatado = `<span class="fs-5">${formatarPrecoBR(produto.preco)}</span>`;
  }
  card.innerHTML = `
    <div class="card h-100 cursor point">
      <img src="${
        produto.imagem_1 != null
          ? produto.imagem_1
          : "https://github.com/KauaNca/green_line_desktop/tree/main/imagens/produtos/" +
            produto.imagem_1
      }" 
           class="card-img-top" 
           alt="${escapeHtml(produto.nome)}"
           loading="lazy"
           style="height: 200px; object-fit: contain;"
           onerror="this.src='${config.fallbackImage}'">
      <div class="card-body">
        <h6 class="card-title">${escapeHtml(produto.nome)}</h6>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="text-warning">${gerarEstrelas(Number(produto.avaliacao))}</span>
          <small class="text-muted">${produto.numAvaliacoes} av.</small>
        </div>
        <p class="card-text text-muted small">${escapeHtml(
          produto.descricao_curta.substring(0, 60)
        )}${produto.descricao_curta.length > 60 ? "..." : ""}</p>
        <p class="fw-bold mb-0 ${produto.promocao ? "text-success" : ""}">
          ${precoFormatado}
        </p class="">
        ${(produto.estoque = 0
          ? '<span class="badge bg-secondary mt-2">Fora de estoque</span>'
          : "")}
        <p class="">
          ${
            produto.categoria
              ? `<span class="badge bg-success mt-2">${produto.categoria}</span>`
              : ""
          }
        </p>
      </div>
    </div>
  `;
  // Ao clicar no card, redireciona para a página de detalhes do produto
  card.addEventListener('click', () => {
    window.location.href = `${caminho}/produto.html?id=${produto.id_produto}`;
  });
  return card;
}

// ==================== FUNÇÕES AUXILIARES ====================

function sanitizarProduto(produto) {
  return {
    ...produto,
    id_produto: parseInt(produto.id_produto) || null,
    preco: Number(produto.preco) || 0,
    preco_promocional: produto.preco_promocional || 0,
    promocao: Boolean(produto.promocao),
    avaliacao: Number(produto.avaliacao) || 0,
    numAvaliacoes: Number(produto.numAvaliacoes) || 0,
    estoque: Number(produto.estoque),
    nome: produto.produto || produto.nome || "Produto sem nome",
    descricao: produto.descricao || "Sem descrição",
    categoria: produto.categoria || "Geral",
    marca: produto.marca || "Sem marca",
    imagem_1: produto.imagem_1 || config.fallbackImage,
  };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function gerarEstrelas(nota) {
  if (!nota) return "☆☆☆☆☆";
  const estrelasCheias = Math.round(nota);
  return "★".repeat(estrelasCheias) + "☆".repeat(5 - estrelasCheias);
}

function mostrarLoader() {
  elementos.produtosContainer.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-success"></div>
      <p class="text-muted mt-2">Carregando produtos...</p>
    </div>
  `;
}

function mostrarErroCarregamento() {
  elementos.produtosContainer.innerHTML = `
    <div class="col-12 text-center py-5">
      <i class="bi bi-emoji-frown fs-1 text-danger"></i>
      <p class="text-muted mt-2">Erro ao carregar produtos</p>
      <button class="btn btn-sm btn-outline-success" onclick="carregarProdutosPromocao()">
        <i class="bi bi-arrow-repeat"></i> Tentar novamente
      </button>
    </div>
  `;
}

function mostrarFeedback(mensagem, tipo = "success") {
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-white bg-${tipo} border-0 position-fixed bottom-0 end-0 m-3`;
  toast.style.zIndex = 1050;
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${mensagem}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  document.body.appendChild(toast);
  new bootstrap.Toast(toast).show();
  setTimeout(() => toast.remove(), 5000);
}

// ==================== EVENT LISTENERS ====================

document.addEventListener("DOMContentLoaded", () => {
  // Controle de quantidade
  document
    .querySelectorAll('[data-action="increase"]')
    .forEach((btn) =>
      btn.addEventListener("click", () => adjustQuantity("quantidadeModal", 1))
    );
  document
    .querySelectorAll('[data-action="decrease"]')
    .forEach((btn) =>
      btn.addEventListener("click", () => adjustQuantity("quantidadeModal", -1))
    );

  // Botão "Comprar Agora"
  document
    .getElementById("btnComprarAgora")
    .addEventListener("click", async () => {
      if (!estado.id_pessoa) {
        mostrarFeedback(
          "Por favor, faça login ou cadastro para prosseguir",
          "danger"
        );
        return;
      }
      // Obter quantidade
      const qtdInput = document.getElementById("quantidadeModal");
      const qtd = parseInt(qtdInput.value, 10);

      // Validar quantidade
      if (isNaN(qtd) || qtd <= 0 || qtd > 100) {
        mostrarFeedback(
          "Quantidade inválida! Por favor, insira um valor entre 1 e 1F00.",
          "danger"
        );
        return;
      }
      console.log("Quantidade selecionada:", qtd);

      // Obter nome do produto
      const nome_produto = document
        .getElementById("produtoModalLabel")
        .textContent.trim();

      // Obter elementos de preço
      const originalPriceEl = document.querySelector(
        "#produtoModalPreco .original-price"
      );
      const discountPriceEl = document.querySelector(
        "#produtoModalPreco .discount-price"
      );

      if (!originalPriceEl) {
        mostrarFeedback("Erro ao obter preço do produto.", "danger");
        return;
      }

      // Extrair preço de forma segura
      function extrairPreco(elemento) {
        if (!elemento) return null;

        const precoTexto = elemento.textContent.trim();
        const precoNumerico = parseFloat(
          precoTexto.replace(/[^\d,]/g, "").replace(",", ".")
        );

        return isNaN(precoNumerico) ? null : precoNumerico;
      }

      let preco_final;
      const isPromocao = window
        .getComputedStyle(originalPriceEl)
        .textDecoration.includes("line-through");

      if (isPromocao && discountPriceEl) {
        preco_final = extrairPreco(discountPriceEl);
      } else {
        preco_final = extrairPreco(originalPriceEl);
      }

      // Validar preço
      if (preco_final === null || preco_final <= 0) {
        mostrarFeedback("Preço do produto inválido.", "danger");
        return;
      }

      console.log("Preço final:", preco_final);

      // Calcular subtotal com arredondamento
      const subtotal = Math.round(preco_final * qtd * 100) / 100;
      console.log("Subtotal:", subtotal.toFixed(2));

      const dadosCompra = {
        nome_produto,
        preco_final,
        quantidade: qtd,
        subtotal,
        id_pessoa: estado.id_pessoa,
        data: new Date().toISOString(),
      };

      console.log("Dados da compra:", dadosCompra);
      sessionStorage.setItem("dadosCompra", JSON.stringify(dadosCompra));
      window.location.href = `${caminho}/vendas.html`;
    });

  // Botão "Adicionar ao Carrinho"
  document
    .getElementById("btnAddCarrinho")
    .addEventListener("click", async () => {
      if (!estado.id_pessoa) {
        mostrarFeedback(
          "Por favor, faça login ou cadastro para prosseguir",
          "danger"
        );
        return;
      }

      const quantidade = parseInt(
        document.getElementById("quantidadeModal").value,
        10
      );
      if (isNaN(quantidade) || quantidade <= 0) {
        mostrarFeedback("Quantidade inválida!", "danger");
        return;
      }

      try {
        const requisicao = await fetch(`${config.online}/carrinho`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_pessoa: estado.id_pessoa,
            id_produto: estado.id_produto,
            quantidade,
          }),
        });
        const resposta = await requisicao.json();

        if (resposta.codigo === 1 || resposta.mensagem === "ITEM_DUPLICADO") {
          mostrarFeedback("Este item já está no carrinho!", "warning");
        } else if (resposta.sucesso) {
          let badge = document.getElementById("badge-carrinho");
          badge.textContent = parseInt(badge.textContent || "0") + 1;
          mostrarFeedback("Item adicionado ao carrinho!", "success");
        } else {
          mostrarFeedback(
            "Erro ao adicionar item ao carrinho: " + resposta.mensagem,
            "danger"
          );
        }
      } catch (erro) {
        console.error("Erro ao adicionar ao carrinho:", erro);
        mostrarFeedback(
          "Erro ao adicionar item ao carrinho. Tente novamente.",
          "danger"
        );
      }
    });
});

// Função auxiliar para ajustar quantidade
function adjustQuantity(id, change) {
  const input = document.getElementById(id);
  let value = parseInt(input.value) || 0;
  value += change;
  if (value < 1) value = 1;
  input.value = value;
}

document.querySelectorAll("[data-categoria]").forEach((categoria) => {
  categoria.addEventListener("click", async (e) => {
    try {
      console.log("Categoria selecionada:", categoria.dataset.categoria);
      const categoriaSelecionada = encodeURIComponent(
        categoria.dataset.categoria
      ); //devido a presença de espaços e caracteres especiais, tem que codificar a categoria
      sessionStorage.setItem("categoriaSelecionada", categoriaSelecionada);
    } catch (error) {
      console.error("Falha ao enviar a outra página:", error);
      mostrarFeedback("Erro ao carregar produtos. Tente novamente.", "danger");
    }
  });
});
