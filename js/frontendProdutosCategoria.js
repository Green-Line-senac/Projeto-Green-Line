// == Configurações e Estado Inicial ==

// Endpoints da API
const apiProduto = {
  online: "https://green-line-web.onrender.com",
  index: "http://localhost:3002",
  produto: "http://localhost:3003",
  carrinho: "http://localhost:3006",
  vendas: "http://localhost:3009",
  perfil: "http://localhost:3008",
  login: "http://localhost:3001",
  cadastro_produto: "http://localhost:3005",
  cadastro: "http://localhost:3000",
};

// Configurações globais
const config = {
  fallbackImage:
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5OTkiPk5lbmh1bWEgSW1hZ2VtPC90ZXh0Pjwvc3ZnPg==",
};
const caminho = window.location.pathname.includes("green_line_web")
  ? "/green_line_web/public"
  : "/public";

// Elementos DOM
const elementos = {
  produtosContainer: document.getElementById("container-produtos"),
  produtoModal: new bootstrap.Modal("#produtoModal"),
  modalAlert: document.getElementById("modal-alert"),
  carroselImagem: document.getElementById("carrosel-imagem"),
  categoriaBadge: document.getElementById("categoria-badge"),
  categoriaTitulo: document.getElementById("categoria-titulo"),
  categoriaDescricao: document.getElementById("categoria-descricao"),
};

// Estado da aplicação
let estado = {
  produtos: [],
  id_pessoa: null || sessionStorage.getItem("id_pessoa"),
  id_produto: null,
  quantidadeProduto: null,
  carregando: false,
};

// == Utilitários ==

/**
 * Escapa caracteres HTML para prevenir XSS.
 * @param {string} str - String a ser escapada.
 * @returns {string} String com caracteres HTML escapados.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Gera representação visual de estrelas com base na nota.
 * @param {number} nota - Nota do produto (0 a 5).
 * @returns {string} String com estrelas (★, ☆).
 */
function gerarEstrelas(nota) {
  if (!nota) return "☆☆☆☆☆";
  const estrelasCheias = Math.round(nota);
  return "★".repeat(estrelasCheias) + "☆".repeat(5 - estrelasCheias);
}

/**
 * Exibe um toast de feedback ao usuário.
 * @param {string} mensagem - Mensagem a ser exibida.
 * @param {string} [tipo='success'] - Tipo do toast (success, danger, etc.).
 */
function mostrarFeedback(mensagem, tipo = "success") {
  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-white bg-${tipo} border-0 position-fixed bottom-0 end-0 m-3`;
  toast.style.zIndex = 1050;
  toast.style.position = "fixed"; // Redundante, mas para garantir
  toast.innerHTML = `
      <div class="d-flex">
          <div class="toast-body">${escapeHtml(mensagem)}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
  `;
  document.body.appendChild(toast);
  new bootstrap.Toast(toast).show();
  setTimeout(() => toast.remove(), 5000);
}

/**
 * Exibe um loader enquanto os produtos são carregados.
 */
function mostrarLoader() {
  elementos.produtosContainer.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-primary"></div>
      <p class="text-muted mt-2">Carregando produtos...</p>
    </div>
  `;
}

/**
 * Exibe uma mensagem de erro quando o carregamento de produtos falha.
 */
function mostrarErroCarregamento() {
  elementos.produtosContainer.innerHTML = `
    <div class="col-12 text-center py-5">
      <i class="bi bi-emoji-frown fs-1 text-danger"></i>
      <p class="text-muted mt-2">Erro ao carregar produtos</p>
      <button class="btn btn-sm btn-outline-primary" onclick="carregarProdutos()">
        <i class="bi bi-arrow-repeat"></i> Tentar novamente
      </button>
    </div>
  `;
}

// == Manipulação de Produtos ==

/**
 * Sanitiza os dados de um produto, garantindo valores padrão e tipos corretos.
 * @param {object} produto - Dados brutos do produto.
 * @returns {object} Produto sanitizado.
 */
function sanitizarProduto(produto) {
  return {
    id_produto: parseInt(produto.id_produto) || null,
    preco: Number(produto.preco) || 0,
    preco_promocional: Number(produto.preco_promocional) || 0,
    promocao: Boolean(produto.promocao),
    avaliacao: Number(produto.avaliacao) || 0,
    numAvaliacoes: Number(produto.numAvaliacoes) || 0,
    estoque: Number(produto.estoque) || 0,
    nome: produto.produto || produto.nome || "Produto sem nome",
    descricao: produto.descricao || "Sem descrição",
    descricao_curta: produto.descricao_curta || "Sem descrição curta",
    categoria: produto.categoria || "Geral",
    marca: produto.marca || "Sem marca",
    imagem_1: produto.imagem_1 || config.fallbackImage,
  };
}

/**
 * Carrega produtos da API, sanitiza e renderiza.
 */
async function carregarProdutos() {
  try {
    mostrarLoader();

    // Recuperando a categoria armazenada
    let categoriaSelecionada = sessionStorage.getItem("categoriaSelecionada");

    if (!categoriaSelecionada) {
      throw new Error("Nenhuma categoria foi selecionada.");
    }

    // Construindo a URL corretamente para passar a categoria como query string
    const url = `${
      apiProduto.online
    }/produtosEspecificos?categoria=${encodeURIComponent(
      categoriaSelecionada
    )}`;
    console.log("URL da requisição:", url);
    // Fazendo a requisição
    const response = await fetch(url);
    let categoria = decodeURIComponent(categoriaSelecionada);
    // Atualizando a imagem e conteúdo do carrossel
    elementos.carroselImagem.src = `../img/index_categorias/${categoria}.jpg`;
    elementos.carroselImagem.alt = `Produtos da categoria ${categoria}`;
    
    // Atualizando o conteúdo textual do carrossel
    if (elementos.categoriaBadge) {
      elementos.categoriaBadge.textContent = `🌱 ${categoria}`;
    }
    if (elementos.categoriaTitulo) {
      elementos.categoriaTitulo.textContent = `${categoria}`;
    }
    if (elementos.categoriaDescricao) {
      elementos.categoriaDescricao.textContent = `Explore nossa seleção especial de produtos da categoria ${categoria}`;
    }
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      renderizarProdutos();
      return;
    }

    // Atualizando os produtos na interface
    estado.produtos = data.map(sanitizarProduto);
    renderizarProdutos();
  } catch (erro) {
    console.error("Erro ao carregar produtos:", erro);
    mostrarErroCarregamento();
  }
}

/**
 * Renderiza todos os produtos no container.
 */
function renderizarProdutos() {
  elementos.produtosContainer.innerHTML = "";
  if (estado.produtos.length === 0) {
    elementos.produtosContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <p class="text-muted">Nenhum produto encontrado.</p>
      </div>
    `;
    return;
  }
  estado.produtos.forEach((produto) => {
    const card = criarCardProduto(produto);
    elementos.produtosContainer.appendChild(card);
  });
}

/**
 * Atualiza o estoque de um produto específico na interface
 * @param {number} idProduto - ID do produto
 * @param {number} novoEstoque - Novo valor do estoque
 */
function atualizarEstoqueInterface(idProduto, novoEstoque) {
  // Atualizar no array de produtos
  const produto = estado.produtos.find(p => p.id_produto === idProduto);
  if (produto) {
    produto.estoque = novoEstoque;
  }
  
  // Atualizar cards na tela
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    const cardIdProduto = card.getAttribute('data-produto-id');
    if (cardIdProduto == idProduto) {
      const estoqueSpan = card.querySelector('.badge-estoque');
      if (estoqueSpan) {
        if (novoEstoque <= 0) {
          estoqueSpan.className = 'badge bg-secondary mt-2 badge-estoque';
          estoqueSpan.textContent = 'Fora de estoque';
        } else {
          estoqueSpan.className = 'badge bg-success mt-2 badge-estoque';
          estoqueSpan.textContent = `Estoque: ${novoEstoque}`;
        }
      }
    }
  });
}

// == Renderização ==

/**
 * Cria um card de produto para exibição na grade.
 * @param {object} produto - Dados do produto.
 * @returns {HTMLElement} Elemento do card.
 */
function criarCardProduto(produto) {
  const card = document.createElement("div");
  card.className = "col-12 col-sm-6 col-md-4 col-lg-3 mb-4";
  
  // Lógica corrigida para preços
  let precoFormatado;
  if (produto.promocao && produto.preco_promocional > 0) {
    // Produto em promoção com preço promocional válido
    precoFormatado = `<span style="text-decoration: line-through; font-size: 0.9rem;">R$ ${produto.preco.toFixed(2)}</span>
       <span class="fs-5 ms-2 text-success">R$ ${produto.preco_promocional.toFixed(2)}</span>`;
  } else {
    // Produto sem promoção ou sem preço promocional válido - usa preço normal
    precoFormatado = `<span class="fs-5">R$ ${produto.preco.toFixed(2)}</span>`;
  }
  card.innerHTML = `
    <div class="card h-100 cursor point" data-produto-id="${produto.id_produto}">
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
          <span class="text-warning">${gerarEstrelas(
            Number(produto.avaliacao)
          )}</span>
          <small class="text-muted">${produto.numAvaliacoes} av.</small>
        </div>
        <p class="card-text text-muted small">${escapeHtml(
          produto.descricao_curta.substring(0, 60)
        )}${produto.descricao_curta.length > 60 ? "..." : ""}</p>
        <p class="fw-bold mb-0 ${produto.promocao ? "text-success" : ""}">
          ${precoFormatado}
        </p class="">
        ${produto.estoque <= 0
          ? '<span class="badge bg-secondary mt-2 badge-estoque">Fora de estoque</span>'
          : produto.estoque <= 5
          ? `<span class="badge bg-warning mt-2 badge-estoque">Últimas ${produto.estoque} unidades</span>`
          : `<span class="badge bg-success mt-2 badge-estoque">Estoque: ${produto.estoque}</span>`
        }
        <p class="">
          ${
            produto.categoria
              ? `<span class="badge bg-info mt-2">${produto.categoria}</span>`
              : ""
          }
        </p>
      </div>
    </div>
  `;
  // Ao clicar no card, redireciona para a página de detalhes do produto
  card.addEventListener("click", () => {
    window.location.href = `${caminho}/produto.html?id=${produto.id_produto}`;
  });
  return card;
}

// == Modal de Produto ==

/**
 * Ajusta a quantidade de um produto no input do modal.
 * @param {string} elementId - ID do input de quantidade.
 * @param {number} change - Valor a adicionar ou subtrair.
 */
function adjustQuantity(elementId, change) {
  const input = document.getElementById(elementId);
  let value = parseInt(input.value, 10) || 1;
  value = Math.max(1, value + change);
  input.value = value;
}

/**
 * Abre o modal com os detalhes de um produto.
 * @param {object|string} dadosProduto - Dados do produto (objeto ou JSON string).
 */
function abrirModalProduto(dadosProduto) {
  let produto;
  try {
    produto =
      typeof dadosProduto === "string"
        ? JSON.parse(dadosProduto)
        : dadosProduto;
  } catch (e) {
    console.error("JSON inválido:", e);
    mostrarFeedback("Erro ao abrir produto", "danger");
    return;
  }

  console.log("Abrindo modal para produto:", produto);
  estado.id_produto = produto.id_produto;

  // Preencher informações do modal
  const label = document.getElementById("produtoModalLabel");
  if (label) label.textContent = produto.nome;

  const imgEl = document.getElementById("produtoModalImagem");
  if (imgEl) {
    imgEl.src = produto.imagem_1 || config.fallbackImage;
    imgEl.onerror = () => (imgEl.src = config.fallbackImage);
  }

  const descEl = document.getElementById("produtoModalDescricao");
  if (descEl) descEl.textContent = produto.descricao;

  const marcaEl = document.getElementById("produtoModalMarca");
  if (marcaEl) marcaEl.textContent = produto.marca;

  const catEl = document.getElementById("produtoModalCategoria");
  if (catEl) {
    catEl.textContent = produto.categoria;
    catEl.className = `badge mb-2 bg-${
      produto.promocao ? "danger" : "success"
    }`;
  }

  const estoqueEl = document.getElementById("produtoModalEstoque");
  if (produto.estoque === 0) {
    estoqueEl.innerHTML = `<span class="badge bg-secondary">Fora de estoque</span>`;
    const botaoComprar = document.querySelector("#btnComprarAgora");
    const botaoCarrinho = document.querySelector("#btnAddCarrinho");
    if (botaoComprar) {
      botaoComprar.disabled = true;
      botaoComprar.classList.add("text-bg-secondary");
    }
    if (botaoCarrinho) {
      botaoCarrinho.disabled = true;
      botaoCarrinho.classList.add("text-bg-secondary");
    }
  } else {
    estoqueEl.innerHTML = `<span class="badge bg-success">Em estoque</span>`;
    const botaoComprar = document.querySelector("#btnComprarAgora");
    const botaoCarrinho = document.querySelector("#btnAddCarrinho");
    if (botaoComprar) {
      botaoComprar.disabled = false;
      botaoComprar.classList.remove("text-bg-secondary");
    }
    if (botaoCarrinho) {
      botaoCarrinho.disabled = false;
      botaoCarrinho.classList.remove("text-bg-secondary");
    }
  }

  // Preços - Lógica corrigida
  const precoContainer = document.getElementById("produtoModalPreco");
  const precoBase = produto.preco.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  
  if (precoContainer) {
    // Verifica se está em promoção E tem preço promocional válido (maior que 0)
    if (produto.promocao && produto.preco_promocional > 0) {
      const precoPromo = produto.preco_promocional.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      const desconto = Math.round(100 - (produto.preco_promocional / produto.preco) * 100);
      
      precoContainer.innerHTML = `
        <div class="price-container">
          <span class="original-price">${precoBase}</span>
          <span class="discount-price">${precoPromo}</span>
          <span class="discount-badge">
            ${desconto}% OFF
          </span>
        </div>
      `;
    } else {
      // Produto sem promoção ou sem preço promocional válido - mostra preço normal
      precoContainer.innerHTML = `
        <div class="price-container">
          <span class="current-price">${precoBase}</span>
        </div>
      `;
    }
  }

  // Avaliação
  const stars = document.getElementById("produtoModalAvaliacao");
  if (stars) {
    stars.innerHTML = "";
    if (produto.avaliacao) {
      const fullStars = Math.round(Number(produto.avaliacao));
      const emptyStars = 5 - fullStars;
      for (let i = 0; i < fullStars; i++)
        stars.innerHTML +=
          '<i class="fas fa-star text-yellow-400 text-xs"></i>';
      for (let i = 0; i < emptyStars; i++)
        stars.innerHTML +=
          '<i class="far fa-star text-yellow-400 text-xs"></i>';
      stars.innerHTML += `<span class="text-xs text-gray-600 ml-1">(${produto.numAvaliacoes})</span>`;
    }
  }

  // Mostrar o modal
  if (elementos.produtoModal) {
    elementos.produtoModal.show();
  } else {
    console.error("Modal não inicializado corretamente");
    mostrarFeedback("Erro ao abrir o modal", "danger");
  }
}
function configurarEventos() {
  // Eventos do modal
  const produtoModal = document.getElementById("produtoModal");
  produtoModal.addEventListener("hidden.bs.modal", () => {
    const inputQuantidade = document.getElementById("quantidadeModal");
    inputQuantidade.value = 1;
    estado.id_produto = null;
  });

  // Eventos de quantidade
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

  // Eventos de compra/carrinho
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
      const currentPriceEl = document.querySelector(
        "#produtoModalPreco .current-price"
      );

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

      // Lógica corrigida para obter o preço final
      if (discountPriceEl) {
        // Se existe preço promocional, usa ele
        preco_final = extrairPreco(discountPriceEl);
      } else if (currentPriceEl) {
        // Se não há promoção, usa o preço atual
        preco_final = extrairPreco(currentPriceEl);
      } else if (originalPriceEl) {
        // Fallback para preço original
        preco_final = extrairPreco(originalPriceEl);
      }

      // Validar preço
      if (preco_final === null || preco_final <= 0) {
        mostrarFeedback("Erro ao obter preço do produto.", "danger");
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
      window.location.href = "vendas.html";
    });

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
        // Primeiro, verificar se há estoque suficiente
        const estoqueResponse = await fetch(`${apiProduto.online}/verificar-estoque/${estado.id_produto}`);
        
        if (estoqueResponse.ok) {
          const estoqueData = await estoqueResponse.json();
          
          if (estoqueData.estoque < quantidade) {
            mostrarFeedback(
              `❌ Estoque insuficiente! Disponível: ${estoqueData.estoque} unidade(s)`,
              "danger"
            );
            return;
          }
          
          if (estoqueData.estoque === 0) {
            mostrarFeedback("❌ Produto fora de estoque!", "danger");
            return;
          }
        }

        const requisicao = await fetch(`${apiProduto.online}/carrinho`, {
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
          mostrarFeedback("⚠️ Este item já está no seu carrinho", "warning");
        } else if (resposta.sucesso) {
          let badge = document.getElementById("badge-carrinho");
          badge.textContent = parseInt(badge.textContent || "0") + 1;
          mostrarFeedback(
            "✅ Item adicionado ao carrinho com sucesso!",
            "success"
          );
        } else {
          mostrarFeedback("❌ Falha ao adicionar item ao carrinho", "danger");
        }
      } catch (erro) {
        console.error("Erro ao adicionar ao carrinho:", erro);
        mostrarFeedback(
          "❌ Ocorreu um erro ao adicionar o item ao carrinho",
          "danger"
        );
      }
    });
}





// == Inicialização ==

/**
 * Inicializa a aplicação, carregando produtos e verificando login.
 */
async function inicializarApp() {
  try {
    estado.carregando = true;
    const storedId = sessionStorage.getItem("id_pessoa");
    if (storedId) {
      estado.id_pessoa = parseInt(storedId);
    }
    configurarEventos();
    await Promise.all([carregarProdutos()]);
  } catch (erro) {
    console.error("Erro na inicialização:", erro);
    mostrarFeedback("Opa, algo deu errado! Tente recarregar.", "danger");
  } finally {
    estado.carregando = false;
  }
}

// Inicia a aplicação
document.addEventListener("DOMContentLoaded", inicializarApp);
