document.addEventListener("DOMContentLoaded", inicializarApp);

const config = {
  apiUrl: 'http://localhost:3003',
  produtosPorPagina: 8,
  fallbackImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5OTkiPk5lbmh1bWEgSW1hZ2VtPC90ZXh0Pjwvc3ZnPg=='
};

let estado = {
  produtos: [],
  paginaAtual: 1,
  id_pessoa: null,
  id_produto: null,
  quantidadeProduto: null,
  carregando: false,
  filtrosAtivos: {
    textoBusca: '',
    emEstoque: false,
    foraEstoque: false,
    categorias: []
  }
};

const elementos = {
  produtosContainer: document.getElementById('container-produtos'),
  paginacao: document.querySelector('.pagination'),
  filtrosAplicados: document.querySelector('.filter-applied'),
  inputBusca: document.getElementById('inputBusca'),
  statusEstoque: document.getElementById('status-estoque'),
  statusForaEstoque: document.getElementById('status-fora-estoque'),
  categoriaCheckboxes: document.querySelectorAll('input[id^="cat-"]'),
  produtoModal: new bootstrap.Modal('#produtoModal'),
  modalAlert: document.getElementById('modal-alert')
};

async function inicializarApp() {
  try {
    estado.carregando = true;
    // Carrega id_pessoa do localStorage como fallback inicial
    const storedId = localStorage.getItem('id_pessoa');
    if (storedId) {
      estado.id_pessoa = parseInt(storedId);
      console.log('id_pessoa carregado do localStorage:', estado.id_pessoa);
    }
    await Promise.all([carregarProdutos(), verificarEstadoLogin()]);
    configurarEventos();
    console.log('Estado após inicialização:', estado);
  } catch (erro) {
    console.error('Erro na inicialização:', erro);
    mostrarFeedback('Opa, algo deu errado! Tente recarregar.', 'danger');
  } finally {
    estado.carregando = false;
  }
}

async function verificarEstadoLogin() {
  try {
    console.log('Iniciando verificação de login...');
    const response = await fetch('http://localhost:3002/loginDados', {
      credentials: 'include'
    });
    console.log('Status da resposta:', response.status);
    if (!response.ok) {
      throw new Error(`Falha na verificação: HTTP ${response.status}`);
    }

    const dados = await response.json();
    console.log('Dados recebidos:', dados);

    if (dados && dados.id_pessoa) {
      estado.id_pessoa = parseInt(dados.id_pessoa);
      localStorage.setItem('id_pessoa', estado.id_pessoa);
      console.log('id_pessoa atualizado:', estado.id_pessoa);
      return true;
    } else {
      console.log('id_pessoa não encontrado nos dados:', dados);
      return false;
    }
  } catch (erro) {
    console.error('Erro ao verificar login:', erro);
    // Não tenta carregar do localStorage aqui, já feito em inicializarApp
    return false;
  }
}

async function carregarProdutos() {
  try {
    mostrarLoader();
    const response = await fetch(`${config.apiUrl}/produto`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data)) {
      estado.produtos = data.map(sanitizarProduto);
      aplicarFiltros();
    } else {
      throw new Error('Dados inválidos recebidos da API');
    }
  } catch (erro) {
    console.error('Erro ao carregar produtos:', erro);
    mostrarErroCarregamento();
  }
}

function sanitizarProduto(produto) {
  return {
    ...produto,
    id_produto: parseInt(produto.id_produto) || null,
    preco: Number(produto.preco) || 0,
    avaliacao: Number(produto.avaliacao) || 0,
    numAvaliacoes: Number(produto.numAvaliacoes) || 0,
    estoque: Boolean(produto.estoque),
    promocao: Boolean(produto.promocao),
    nome: produto.produto || produto.nome || 'Produto sem nome',
    descricao: produto.descricao || 'Sem descrição',
    categoria: produto.categoria || 'Geral',
    marca: produto.marca || 'Sem marca',
    imagem_1: produto.imagem_1 || config.fallbackImage
  };
}

function renderizarProdutos(produtosFiltrados) {
  elementos.produtosContainer.innerHTML = '';
  if (!produtosFiltrados.length) {
    elementos.produtosContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="bi bi-search fs-1 text-muted"></i>
        <p class="text-muted mt-2">Nenhum produto encontrado com esses filtros</p>
        <button class="btn btn-sm btn-outline-primary" onclick="resetarFiltros()">
          Limpar filtros
        </button>
      </div>
    `;
    return;
  }
  const fragment = document.createDocumentFragment();
  const inicio = (estado.paginaAtual - 1) * config.produtosPorPagina;
  const fim = inicio + config.produtosPorPagina;
  produtosFiltrados.slice(inicio, fim).forEach(produto => {
    const card = criarCardProduto(produto);
    fragment.appendChild(card);
  });
  elementos.produtosContainer.appendChild(fragment);
  criarPaginacao(produtosFiltrados.length);
}

function criarCardProduto(produto) {
  const card = document.createElement('div');
  card.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-4';
  const precoFormatado = produto.promocao
    ? `<span style="text-decoration: line-through; font-size: 0.9rem;">R$ ${produto.preco.toFixed(2)}</span>
       <span class="fs-5 ms-2">R$ ${(produto.preco * 0.8).toFixed(2)}</span>`
    : `<span class="fs-5">R$ ${produto.preco.toFixed(2)}</span>`;
  card.innerHTML = `
    <div class="card h-100" onclick="abrirModalProduto(${JSON.stringify(produto).replace(/"/g, '&quot;')})">
      <img src="${produto.imagem_1}" 
           class="card-img-top" 
           alt="${escapeHtml(produto.nome)}"
           loading="lazy"
           style="height: 200px; object-fit: contain;"
           onerror="this.src='${config.fallbackImage}'">
      <div class="card-body">
        <h6 class="card-title">${escapeHtml(produto.nome)}</h6>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="text-warning">${gerarEstrelas(produto.avaliacao)}</span>
          <small class="text-muted">${produto.numAvaliacoes} av.</small>
        </div>
        <p class="card-text text-muted small">${escapeHtml(produto.descricao.substring(0, 60))}${produto.descricao.length > 60 ? '...' : ''}</p>
        <p class="fw-bold mb-0 ${produto.promocao ? 'text-success' : ''}">
          ${precoFormatado}
        </p>
        ${!produto.estoque ? '<span class="badge bg-secondary mt-2">Fora de estoque</span>' : ''}
      </div>
    </div>
  `;
  return card;
}

function aplicarFiltros(resetarPagina = true) {
  if (resetarPagina) estado.paginaAtual = 1;
  const { textoBusca, emEstoque, foraEstoque, categorias } = estado.filtrosAtivos;
  const produtosFiltrados = estado.produtos.filter(produto => {
    if (textoBusca && !produto.nome.toLowerCase().includes(textoBusca.toLowerCase())) {
      return false;
    }
    if (emEstoque && !produto.estoque) return false;
    if (foraEstoque && produto.estoque) return false;
    if (categorias.length && !categorias.includes(produto.categoria)) return false;
    return true;
  });
  renderizarProdutos(produtosFiltrados);
  atualizarFiltrosAplicados();
}

function atualizarFiltros() {
  estado.filtrosAtivos = {
    textoBusca: elementos.inputBusca.value.trim(),
    emEstoque: elementos.statusEstoque.checked,
    foraEstoque: elementos.statusForaEstoque.checked,
    categorias: Array.from(elementos.categoriaCheckboxes)
      .filter(cb => cb.checked && cb.id !== 'cat-todos')
      .map(cb => cb.id.replace('cat-', ''))
  };
  aplicarFiltros();
}

function resetarFiltros() {
  elementos.inputBusca.value = '';
  elementos.statusEstoque.checked = false;
  elementos.statusForaEstoque.checked = false;
  elementos.categoriaCheckboxes.forEach(cb => cb.checked = cb.id === 'cat-todos');
  atualizarFiltros();
}

function atualizarFiltrosAplicados() {
  elementos.filtrosAplicados.innerHTML = '';
  const { textoBusca, emEstoque, foraEstoque, categorias } = estado.filtrosAtivos;
  if (textoBusca) {
    elementos.filtrosAplicados.appendChild(criarTagFiltro(`Busca: ${escapeHtml(textoBusca)}`, () => {
      elementos.inputBusca.value = '';
      atualizarFiltros();
    }));
  }
  if (emEstoque) {
    elementos.filtrosAplicados.appendChild(criarTagFiltro('Em estoque', () => {
      elementos.statusEstoque.checked = false;
      atualizarFiltros();
    }));
  }
  if (foraEstoque) {
    elementos.filtrosAplicados.appendChild(criarTagFiltro('Fora de estoque', () => {
      elementos.statusForaEstoque.checked = false;
      atualizarFiltros();
    }));
  }
  categorias.forEach(categoria => {
    const checkbox = document.getElementById(`cat-${categoria}`);
    if (checkbox) {
      elementos.filtrosAplicados.appendChild(criarTagFiltro(
        escapeHtml(checkbox.parentElement.textContent.trim()),
        () => {
          checkbox.checked = false;
          atualizarFiltros();
        }
      ));
    }
  });
  if (!elementos.filtrosAplicados.children.length) {
    elementos.filtrosAplicados.innerHTML = `
      <span class="filter-tag">
        Tudo
        <button type="button" aria-label="Nenhum filtro ativo">
          <i class="fas fa-times" style="font-size: 0.75rem;"></i>
        </button>
      </span>
    `;
  }
}

function criarTagFiltro(texto, onClick) {
  const tag = document.createElement('span');
  tag.className = 'filter-tag';
  tag.innerHTML = `
    ${texto}
    <button type="button" aria-label="Remover filtro">
      <i class="fas fa-times" style="font-size: 0.75rem;"></i>
    </button>
  `;
  tag.querySelector('button').addEventListener('click', onClick);
  return tag;
}

function criarPaginacao(totalProdutos) {
  elementos.paginacao.innerHTML = '';
  const totalPaginas = Math.ceil(totalProdutos / config.produtosPorPagina);
  for (let i = 1; i <= totalPaginas; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === estado.paginaAtual ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener('click', (e) => {
      e.preventDefault();
      estado.paginaAtual = i;
      aplicarFiltros(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    elementos.paginacao.appendChild(li);
  }
}

const produtoModal = document.getElementById('produtoModal');
produtoModal.addEventListener('hidden.bs.modal', () => {
  const inputQuantidade = document.getElementById('quantidadeModal');
  inputQuantidade.value = 1;
  estado.id_produto = null;
  const itemResultado = document.getElementById('item-resultado');
  itemResultado.classList.add('d-none');
  itemResultado.innerHTML = '';
});

function adjustQuantity(elementId, change) {
  const input = document.getElementById(elementId);
  let value = parseInt(input.value, 10) || 1;
  value = Math.max(1, value + change);
  input.value = value;
}

function abrirModalProduto(dadosProduto) {
  let produto;
  try {
    produto = typeof dadosProduto === 'string' ? JSON.parse(dadosProduto) : dadosProduto;
  } catch (e) {
    console.error('JSON inválido:', e);
    mostrarFeedback('Erro ao abrir produto', 'danger');
    return;
  }
  estado.id_produto = produto.id_produto;
  document.getElementById('produtoModalLabel').textContent = produto.nome;
  const imgEl = document.getElementById('produtoModalImagem');
  imgEl.src = produto.imagem_1;
  imgEl.onerror = () => imgEl.src = config.fallbackImage;
  document.getElementById('produtoModalDescricao').textContent = produto.descricao;
  document.getElementById('produtoModalMarca').textContent = produto.marca;
  const catEl = document.getElementById('produtoModalCategoria');
  if (catEl) {
    catEl.textContent = produto.categoria;
    catEl.className = `badge mb-2 bg-${produto.promocao ? 'danger' : 'success'}`;
  }
  const estoqueEl = document.getElementById('produtoModalEstoque');
  if (estoqueEl) {
    estoqueEl.textContent = produto.estoque ? 'Disponível' : 'Fora de estoque';
    estoqueEl.className = `badge bg-${produto.estoque ? 'success' : 'secondary'}`;
  }
  const precoContainer = document.getElementById('produtoModalPreco');
  const precoBase = produto.preco.toFixed(2);
  if (produto.promocao) {
    const precoProm = (produto.preco * 0.8).toFixed(2);
    precoContainer.innerHTML = `
      <p class="font-bold text-sm mb-1">
        <span class="line-through text-gray-500">R$ ${precoBase}</span>
        <span class="text-green-600 ms-2">R$ ${precoProm}</span>
      </p>
    `;
  } else {
    precoContainer.innerHTML = `<p class="font-bold text-sm">R$ ${precoBase}</p>`;
  }
  const stars = document.getElementById('produtoModalAvaliacao');
  stars.innerHTML = '';
  if (produto.avaliacao != null) {
    const fullStars = Math.floor(produto.avaliacao);
    const halfStar = produto.avaliacao % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < fullStars; i++) stars.innerHTML += '<i class="fas fa-star text-yellow-400 text-xs"></i>';
    if (halfStar) stars.innerHTML += '<i class="fas fa-star-half-alt text-yellow-400 text-xs"></i>';
    for (let i = 0; i < emptyStars; i++) stars.innerHTML += '<i class="far fa-star text-yellow-400 text-xs"></i>';
    stars.innerHTML += `<span class="text-xs text-gray-600 ml-1">(${produto.numAvaliacoes})</span>`;
  }
  elementos.produtoModal.show();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-action="increase"]').forEach(btn =>
    btn.addEventListener('click', () => adjustQuantity('quantidadeModal', 1))
  );
  document.querySelectorAll('[data-action="decrease"]').forEach(btn =>
    btn.addEventListener('click', () => adjustQuantity('quantidadeModal', -1))
  );

  document.getElementById('btnComprarAgora').addEventListener('click', async () => {
    if (!estado.id_pessoa) {
      mostrarFeedback("Por favor, faça login ou cadastro para prosseguir", "danger");
      return;
    }
    const qtd = parseInt(document.getElementById('quantidadeModal').value, 10);
    if (isNaN(qtd) || qtd <= 0) {
      mostrarFeedback("Quantidade inválida!", 'danger');
      return;
    }

    const nomeProduto = document.getElementById('produtoModalLabel').textContent;
    const dadosCompra = {
      nomeProduto,
      id_pessoa: estado.id_pessoa,
      quantidade: qtd,
      data: new Date().toISOString(),
    };

    console.log("Dados da compra:", dadosCompra);
    localStorage.setItem("dadosCompra", JSON.stringify(dadosCompra));
    window.location.href = "vendas.html";
  });

  document.getElementById('btnAddCarrinho').addEventListener('click', async () => {
    if (!estado.id_pessoa) {
      mostrarFeedback("Por favor, faça login ou cadastro para prosseguir", "danger");
      return;
    }

    const quantidade = parseInt(document.getElementById('quantidadeModal').value, 10);
    if (isNaN(quantidade) || quantidade <= 0) {
      mostrarFeedback("Quantidade inválida!", 'danger');
      return;
    }

    try {
      const requisicao = await fetch(`${config.apiUrl}/carrinho`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_pessoa: estado.id_pessoa,
          id_produto: estado.id_produto,
          quantidade
        })
      });

      const resposta = await requisicao.json();
      const itemResultado = document.getElementById('item-resultado');

      if (resposta.codigo === 1 || resposta.mensagem === "ITEM_DUPLICADO") {
        itemResultado.classList.remove('d-none');
        itemResultado.innerHTML = "⚠️ Este item já está no seu carrinho";
        setTimeout(() => itemResultado.classList.add('d-none'), 5000);
      } else if (resposta.sucesso) {
        let badge = document.getElementById('badge-carrinho');
        badge.textContent = parseInt(badge.textContent || '0') + 1;
        itemResultado.classList.remove('d-none');
        itemResultado.innerHTML = "✔️ Item adicionado ao carrinho!";
        itemResultado.classList.add('text-success');
        setTimeout(() => {
          itemResultado.classList.add('d-none');
          itemResultado.classList.remove('text-success');
        }, 5000);
      } else {
        itemResultado.classList.remove('d-none');
        itemResultado.innerHTML = `❌ Erro: ${resposta.mensagem || "Erro desconhecido"}`;
        itemResultado.classList.add('text-danger');
        setTimeout(() => itemResultado.classList.add('d-none'), 5000);
      }
    } catch (erro) {
      console.error("Erro ao adicionar ao carrinho:", erro);
      const itemResultado = document.getElementById('item-resultado');
      itemResultado.classList.remove('d-none');
      itemResultado.innerHTML = "❌ Falha na conexão com o servidor";
      itemResultado.classList.add('text-danger');
      setTimeout(() => itemResultado.classList.add('d-none'), 5000);
    }
  });
});

function configurarEventos() {
  elementos.inputBusca.addEventListener('input', () => {
    estado.filtrosAtivos.textoBusca = elementos.inputBusca.value.trim();
    aplicarFiltros();
  });
  elementos.statusEstoque.addEventListener('change', () => {
    estado.filtrosAtivos.emEstoque = elementos.statusEstoque.checked;
    aplicarFiltros();
  });
  elementos.statusForaEstoque.addEventListener('change', () => {
    estado.filtrosAtivos.foraEstoque = elementos.statusForaEstoque.checked;
    aplicarFiltros();
  });
  elementos.categoriaCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      if (checkbox.id === 'cat-todos' && checkbox.checked) {
        elementos.categoriaCheckboxes.forEach(cb => {
          if (cb.id !== 'cat-todos') cb.checked = false;
        });
      } else if (checkbox.id !== 'cat-todos' && checkbox.checked) {
        document.getElementById('cat-todos').checked = false;
      }
      atualizarFiltros();
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function gerarEstrelas(nota) {
  if (!nota) return '☆☆☆☆☆';
  const estrelasCheias = Math.floor(nota);
  const temMeia = nota % 1 >= 0.5;
  return '★'.repeat(estrelasCheias) + (temMeia ? '½' : '') + '☆'.repeat(5 - estrelasCheias - (temMeia ? 1 : 0));
}

function mostrarLoader() {
  elementos.produtosContainer.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-primary"></div>
      <p class="text-muted mt-2">Carregando produtos...</p>
    </div>
  `;
}

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

function mostrarFeedback(mensagem, tipo = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${tipo} border-0 position-fixed bottom-0 end-0 m-3`;
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