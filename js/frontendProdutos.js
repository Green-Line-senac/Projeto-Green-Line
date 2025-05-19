// Configurações globais
const config = {
  apiUrl: 'http://localhost:3003',
  produtosPorPagina: 8,
  fallbackImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5OTkiPk5lbmh1bWEgSW1hZ2VtPC90ZXh0Pjwvc3ZnPg=='
};

// Estado da aplicação
const estado = {
  produtos: [],
  paginaAtual: 1,
  carregando: false,
  filtrosAtivos: {
    textoBusca: '',
    emEstoque: false,
    foraEstoque: false,
    categorias: []
  }
};

// Cache de elementos DOM
const elementos = {
  produtosContainer: document.getElementById('container-produtos'),
  paginacao: document.querySelector('.pagination'),
  filtrosAplicados: document.querySelector('.filter-applied'),
  inputBusca: document.getElementById('inputBusca'),
  statusEstoque: document.getElementById('status-estoque'),
  statusForaEstoque: document.getElementById('status-fora-estoque'),
  categoriaCheckboxes: document.querySelectorAll('input[id^="cat-"]'),
  produtoModal: new bootstrap.Modal('#produtoModal')
};

// Inicialização
document.addEventListener("DOMContentLoaded", inicializarApp);

async function inicializarApp() {
  try {
    estado.carregando = true;
    await carregarProdutos();
    configurarEventos();
  } catch (erro) {
    console.error('Erro na inicialização:', erro);
    mostrarFeedback('Opa, algo deu errado! Tente recarregar.', 'danger');
  } finally {
    estado.carregando = false;
  }
}

// Carregamento de dados
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
    preco: Number(produto.preco) || 0,
    avaliacoes: Number(produto.avaliacoes) || 0,
    estoque: Boolean(produto.estoque),
    promocao: Boolean(produto.promocao)
  };
}

// Renderização
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
    <div class="card h-100" onclick="abrirModalProduto(${escapeHtml(JSON.stringify(produto))})">
      <img src="${produto.imagem_1 || config.fallbackImage}" 
           class="card-img-top" 
           alt="${produto.nome}"
           loading="lazy"
           style="height: 200px; object-fit: contain;"
           onerror="this.src='${config.fallbackImage}'">
      <div class="card-body">
        <h6 class="card-title">${produto.produto}</h6>
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="text-warning">${gerarEstrelas(4)}</span>
          <small class="text-muted">${produto.avaliacoes} av.</small>
        </div>
        <p class="card-text text-muted small">${produto.descricao.substring(0, 60)}${produto.descricao.length > 60 ? '...' : ''}</p>
        <p class="fw-bold mb-0 ${produto.promocao ? '' : ''}">
          ${precoFormatado}
        </p>
        ${!produto.estoque ? '<span class="badge bg-secondary mt-2">Fora de estoque</span>' : ''}
      </div>
    </div>
  `;

  return card;
}

// Filtros
function aplicarFiltros(resetarPagina = true) {
  if (resetarPagina) estado.paginaAtual = 1;

  const { textoBusca, emEstoque, foraEstoque, categorias } = estado.filtrosAtivos;

  const produtosFiltrados = estado.produtos.filter(produto => {
    // Filtro por texto
    if (textoBusca && !produto.nome.toLowerCase().includes(textoBusca.toLowerCase())) {
      return false;
    }

    // Filtro por estoque
    if (emEstoque && !produto.estoque) return false;
    if (foraEstoque && produto.estoque) return false;

    // Filtro por categoria
    if (categorias.length && !categorias.includes(produto.categoria)) return false;

    return true;
  });

  renderizarProdutos(produtosFiltrados);
  atualizarFiltrosAplicados();
}

function atualizarFiltros() {
  estado.filtrosAtivos = {
    textoBusca: elementos.inputBusca.value,
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
  elementos.categoriaCheckboxes.forEach(cb => cb.checked = false);

  atualizarFiltros();
}

function atualizarFiltrosAplicados() {
  elementos.filtrosAplicados.innerHTML = '';
  const { textoBusca, emEstoque, foraEstoque, categorias } = estado.filtrosAtivos;

  if (textoBusca) {
    elementos.filtrosAplicados.appendChild(criarTagFiltro(`Busca: ${textoBusca}`, () => {
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
        checkbox.parentElement.textContent.trim(),
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

// Paginação
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

// Modal

// Função para ajustar a quantidade
function adjustQuantity(elementId, change) {
  const input = document.getElementById(elementId);
  let value = parseInt(input.value, 10) || 1;
  value = Math.max(1, value + change);
  input.value = value;
}

// Função para abrir o modal do produto
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
  document.getElementById('produtoModalMarca').textContent = produto.marca || 'Marca não especificada';

  const catEl = document.getElementById('produtoModalCategoria');
  if (catEl) {
    catEl.textContent = produto.categoria || 'Geral';
    catEl.className = `badge mb-2 bg-${produto.promocao ? 'danger' : 'success'}`;
  }
  const estoqueEl = document.getElementById('produtoModalEstoque');
  if (estoqueEl) {
    estoqueEl.textContent = produto.estoque ? 'Disponível' : 'Fora de estoque';
    estoqueEl.className = `badge bg-${produto.estoque ? 'success' : 'secondary'}`;
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
    const fullStars = Math.floor(produto.avaliacao);
    const halfStar = produto.avaliacao % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    for (let i = 0; i < fullStars; i++)   stars.innerHTML += '<i class="fas fa-star text-yellow-400 text-xs"></i>';
    if (halfStar) stars.innerHTML += '<i class="fas fa-star-half-alt text-yellow-400 text-xs"></i>';
    for (let i = 0; i < emptyStars; i++)  stars.innerHTML += '<i class="far fa-star text-yellow-400 text-xs"></i>';
    stars.innerHTML += `<span class="text-xs text-gray-600 ml-1">(${produto.numAvaliacoes || 0})</span>`;
  }

  // Exibe o modal
  new bootstrap.Modal(document.getElementById('produtoModal')).show();
}

// Event listeners após DOM carregar
document.addEventListener('DOMContentLoaded', () => {
  // Botões de quantidade já usam onclick direto, mas caso queira data-action:
  document.querySelectorAll('[data-action="increase"]').forEach(btn =>
    btn.addEventListener('click', () => adjustQuantity('quantidadeModal', 1))
  );
  document.querySelectorAll('[data-action="decrease"]').forEach(btn =>
    btn.addEventListener('click', () => adjustQuantity('quantidadeModal', -1))
  );

  // Comprar agora
  document.getElementById('btnComprarAgora').addEventListener('click', async () => {
    let id_pessoa;
    try {
      const response = await fetch('http://localhost:3002/loginDados');
      if (!response.ok) return;
      const dados = await response.json();
      id_pessoa = dados.id_pessoa;

      if (dados.trocarDeConta === 0 || dados.trocar === 0) {
        const modal_alert = document.getElementById('modal-alert');
        modal_alert.classList.remove("d-none"); // Exibe o alerta
        setTimeout(() => modal_alert.classList.add("d-none"), 5000); // Oculta depois de 5s
      }
    } catch (erro) {
      console.error("Erro ao buscar loginDados:", erro);
    }

    const qtd = document.getElementById('quantidadeModal').value;
    const nomeProduto = document.getElementById('produtoModalLabel').textContent;
    console.log(nomeProduto);

    // TODO: lógica de compra
    const dadosCompra = {
      nomeProduto: nomeProduto,
      id_pessoa: id_pessoa,
      quantidade: parseInt(qtd),
      data: new Date().toISOString()
    };
    console.log(dadosCompra);

    fetch(`http://localhost:3003/pedidos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dadosCompra)
    })
      .then(response => response.json())
      .then(data => {
        console.log('Resposta do servidor:', data);
        alert('Compra registrada com sucesso!');
      })
      .catch(error => {
        console.error('Erro ao enviar:', error);
        alert('Erro ao registrar a compra.');
      });
  });
});

// Adicionar ao carrinho
document.getElementById('btnAddCarrinho').addEventListener('click', () => {
  const qtd = document.getElementById('quantidadeModal').value;
  console.log('Adicionar ao carrinho – quantidade:', qtd);
  // TODO: lógica do carrinho
});
//CEP
document.getElementById("btnChecar").addEventListener("click", () => {
  const cepInput = document.getElementById("freteModal");
  const cep = cepInput.value.replace(/\D/g, '');
  const resultado = document.getElementById("resultadoFrete");
  //TODO: Calculo do frete
  if (cep.length !== 8) {
    resultado.innerText = "CEP inválido. Digite 8 números.";
    cepInput.value = ""; // limpa mesmo com erro
    return;
  }

  fetch(`https://viacep.com.br/ws/${cep}/json/`)
    .then(response => response.json())
    .then(data => {
      if (data.erro) {
        resultado.innerText = "CEP não encontrado.";
      } else {
        let valorFrete = "R$ 29,90";
        if (data.uf === "DF") valorFrete = "Gratis";
        else if (["RJ", "MG"].includes(data.uf)) valorFrete = "R$ 19,90";
        else if (data.uf === "RS") valorFrete = "R$ 24,90";

        resultado.innerText = `Endereço: ${data.localidade} - ${data.uf}\nFrete estimado: ${valorFrete}`;
      }
      cepInput.value = ""; // limpa após sucesso
    })
    .catch(() => {
      resultado.innerText = "Erro ao buscar o CEP.";
      cepInput.value = ""; // limpa se der erro
    });
});

// Abre o modal
try {
  // Código que pode lançar erro
  elementos.produtoModal.show();
} catch (erro) {
  console.error('Erro ao abrir modal:', erro);
  mostrarFeedback('Não foi possível exibir os detalhes do produto', 'danger');
}

// Utilitários
function configurarEventos() {
  // Filtros
  elementos.inputBusca.addEventListener('input', () => {
    estado.filtrosAtivos.textoBusca = elementos.inputBusca.value;
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
      }
      atualizarFiltros();
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function gerarEstrelas(nota) {
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
      <div class="toast-body">${mensagem}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  document.body.appendChild(toast);
  new bootstrap.Toast(toast).show();
  setTimeout(() => toast.remove(), 5000);
}