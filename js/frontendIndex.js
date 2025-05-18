let config = {
  apiUrl: 'http://localhost:3002',
  fallbackImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5OTkiPk5lbmh1bWEgSW1hZ2VtPC90ZXh0Pjwvc3ZnPg=='
};

// Cache de elementos DOM
const elementos = {
  carrossel: document.getElementById('carousel-imagens'),
  carrosselContainer: document.getElementById('carousel-index'),
  produtosContainer: document.getElementById('container-produtos'),
  iconeUsuario: document.getElementById('icone-usuario')
};

// Estado da aplicação
const estado = {
  imagensCarrossel: [],
  produtos: [],
  carregando: false
};

// Inicialização
document.addEventListener("DOMContentLoaded", inicializarApp);

async function inicializarApp() {
  try {
    estado.carregando = true;
    await Promise.all([
      carregarCarrossel(),
      carregarProdutosPromocao(),
    ]);
  } catch (erro) {
    console.error('Erro na inicialização:', erro);
    mostrarFeedback('Opa, algo deu errado! Tente recarregar.', 'danger');
  } finally {
    estado.carregando = false;
  }
}

// Carregamento de dados
async function carregarCarrossel() {
  try {
    const response = await fetch('/json/carousel-index.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const dados = await response.json();
    estado.imagensCarrossel = Array.isArray(dados) ? dados : [];
    renderizarCarrossel();
  } catch (erro) {
    console.error('Erro no carrossel:', erro);
    mostrarFeedback('Não foi possível carregar o carrossel', 'warning');
  }
}

async function carregarProdutosPromocao() {
  try {
    mostrarLoader();

    const response = await fetch(`${config.apiUrl}/produtos`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const resposta = await response.json();
    console.log(resposta);

    // Extrai os produtos da resposta (considerando a nova estrutura)
    if (Array.isArray(resposta)) {
      estado.produtos = resposta.map(sanitizarProduto);
    } else {
      throw new Error('Dados inválidos recebidos da API');
    }

    estado.produtos = produtos;
    renderizarProdutos();

  } catch (erro) {
    console.error('Erro nos produtos:', erro);
    mostrarErroCarregamento();
  }
}
function sanitizarProduto(produto) {
  return {
    ...produto,
    preco: Number(produto.preco) || 0,
    avaliacoes: Number(produto.avaliacoes) || 0,
    estoque: Boolean(produto.estoque),
    promocao: Boolean(produto.promocao)
  };
}

// Renderização
function renderizarCarrossel() {
  if (!estado.imagensCarrossel.length) return;

  elementos.carrossel.innerHTML = '';
  const indicators = document.createElement('div');
  indicators.className = 'carousel-indicators';

  estado.imagensCarrossel.forEach((img, index) => {
    // Criar indicadores
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.bsTarget = '#carousel-index';
    button.dataset.bsSlideTo = index;
    button.className = index === 0 ? 'active' : '';
    indicators.appendChild(button);

    // Criar itens do carrossel
    const item = document.createElement('div');
    item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
    item.innerHTML = `
      <img src="/img/index_carousel/${img.nomeImagem || 'default.jpg'}" 
           class="d-block w-100" 
           style="height: px; object-fit: cover;" 
           alt="${img.alt || 'Imagem do carrossel'}"
           loading="lazy"
           onerror="this.src='${config.fallbackImage}'">
    `;
    elementos.carrossel.appendChild(item);
  });

  elementos.carrosselContainer.prepend(indicators);
}

function renderizarProdutos() {
  elementos.produtosContainer.innerHTML = '';

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

  estado.produtos.forEach(produto => {
    const card = criarCardProduto(produto);
    fragment.appendChild(card);
  });

  elementos.produtosContainer.appendChild(fragment);
}

function criarCardProduto(produto) {
  const card = document.createElement('div');
  card.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-4';

  const dados = {
    nome: produto.produto || 'Produto',
    descricao: produto.descricao || 'Descrição não disponível',
    preco: Number(produto.preco) || 0,
    imagem: produto.imagem_1 || config.fallbackImage,
    categoria: produto.categoria || 'Geral',
    promocao: Boolean(produto.promocao),
    avaliacao: Math.min(Math.max(Number(produto.avaliacao) || 0, 5), 5), // Corrigido
    avaliacoes: Math.max(Number(produto.quantidade_avaliacoes) || 0, 0)
  };

  const precoFormatado = dados.promocao
    ? `<span style="text-decoration: line-through; font-size: 0.9rem;">R$ ${dados.preco.toFixed(2)}</span>
       <span class="fs-5 ms-2 text-danger">R$ ${(dados.preco * 0.8).toFixed(2)}</span>`
    : `<span class="fs-5">R$ ${dados.preco.toFixed(2)}</span>`;

  const dadosEscapados = escapeHtml(JSON.stringify(dados));

  card.innerHTML = `
    <div class="card h-100" style="width:350px" onclick="abrirModalProduto('${dadosEscapados}')">
      <img src="${dados.imagem}" 
           class="card-img-top" 
           alt="${dados.nome}"
           loading="lazy"
           style="height: 200px; object-fit: contain;"
           onerror="this.src='${config.fallbackImage}'">
      <div class="card-body">
        <h6 class="card-title">${dados.nome}</h6>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="text-warning">${gerarEstrelas(dados.avaliacao)}</span>
          <small class="text-muted">${dados.avaliacoes} av.</small>
        </div>
        <p class="card-text text-muted small">${dados.descricao.substring(0, 60)}...</p>
        <p class="fw-bold mb-0 ${dados.promocao ? 'text-dark' : ''}">
          ${precoFormatado}
        </p>
      </div>
    </div>
  `;

  return card;
}


// Função auxiliar para escape de HTML
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Utilitários
function gerarEstrelas(nota) {
  const estrelasCheias = Math.floor(nota);
  const temMeia = nota % 1 >= 0.5;
  return '★'.repeat(estrelasCheias) + (temMeia ? '½' : '') + '☆'.repeat(5 - estrelasCheias - (temMeia ? 1 : 0));
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

function mostrarFeedback(mensagem, tipo = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${tipo} border-0 position-fixed bottom-0 end-0 m-3`;
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

// Modal do produto
function abrirModalProduto(dadosProduto) {
  let produto;
  try {
    produto = typeof dadosProduto === 'string'
      ? JSON.parse(dadosProduto)
      : dadosProduto;
  } catch (e) {
    console.error('JSON inválido:', e);
    return;
  }

  // Título
  document.getElementById('produtoModalLabel').textContent = produto.produto || 'Produto sem nome';

  // Imagem
  const imgEl = document.getElementById('produtoModalImagem');
  if (produto.imagem_1) {
    imgEl.src = produto.imagem_1;
    imgEl.onerror = () => {
      imgEl.src = 'data:image/svg+xml;base64,...'; // placeholder
    };
  } else {
    imgEl.src = 'data:image/svg+xml;base64,...';
  }
  // Descrição, Marca, Categoria e Estoque
  document.getElementById('produtoModalDescricao').textContent = produto.descricao || 'Descrição não disponível.';
  document.getElementById('produtoModalMarca').textContent     = produto.marca    || 'Marca não especificada';

  const catEl = document.getElementById('produtoModalCategoria');
  if (catEl) {
    catEl.textContent = produto.categoria || 'Geral';
    catEl.className   = `badge mb-2 bg-${produto.promocao ? 'danger' : 'success'}`;
  }
  const estoqueEl = document.getElementById('produtoModalEstoque');
  if (estoqueEl) {
    estoqueEl.textContent = produto.estoque ? 'Disponível' : 'Fora de estoque';
    estoqueEl.className   = `badge bg-${produto.estoque ? 'success' : 'secondary'}`;
  }

  // Preço e promoção
  const precoContainer = document.getElementById('produtoModalPreco');
  const precoBase = (produto.preco || 0).toFixed(2);
  if (produto.promocao) {
    const precoProm = (produto.preco * 0.8).toFixed(2);
    precoContainer.innerHTML = `
      <p class="font-bold text-sm mb-1">
        <span class="line-through text-gray-500 ">R$ ${precoBase}</span>
        <span class="text-green-600 ms-2">R$ ${precoProm}</span>
      </p>
    `;
  } else {
    precoContainer.innerHTML = `<p class="font-bold text-sm">R$ ${precoBase}</p>`;
  }

  // Avaliação
  const stars = document.getElementById('produtoModalAvaliacao');
  stars.innerHTML = '';
  if (produto.avaliacao != null) {
    const fullStars   = Math.floor(produto.avaliacao);
    const halfStar    = produto.avaliacao % 1 >= 0.5;
    const emptyStars  = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < fullStars; i++)   stars.innerHTML += '<i class="fas fa-star text-yellow-400 text-xs"></i>';
    if (halfStar)                         stars.innerHTML += '<i class="fas fa-star-half-alt text-yellow-400 text-xs"></i>';
    for (let i = 0; i < emptyStars; i++)  stars.innerHTML += '<i class="far fa-star text-yellow-400 text-xs"></i>';
    stars.innerHTML += `<span class="text-xs text-gray-600 ml-1">(${produto.numAvaliacoes || 0})</span>`;
  }

  // Exibe o modal
  new bootstrap.Modal(document.getElementById('produtoModal')).show();
}