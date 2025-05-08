// Lista de produtos e configurações de paginação
let todosProdutos = [];         // Armazena todos os produtos carregados do JSON
let paginaAtual = 1;            // Página atualmente exibida
const produtosPorPagina = 8;    // Quantos produtos mostrar por página

// Função para renderizar os produtos no container da página
function renderizarProdutos(produtos) {
  const container = document.getElementById('container-produtos');
  container.innerHTML = ''; // Limpa os produtos anteriores

  // Define o intervalo da página atual
  const inicio = (paginaAtual - 1) * produtosPorPagina;
  const fim = inicio + produtosPorPagina;
  const produtosPagina = produtos.slice(inicio, fim); // Seleciona os produtos da página

  // Para cada produto, cria um card e adiciona no container
  produtosPagina.forEach(produto => {
    const card = document.createElement('div');
    card.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-4';
    card.innerHTML = `
      <div class="card h-100" style="cursor: pointer;" onclick='abrirModalProduto(${JSON.stringify(produto).replace(/'/g, "\\'")})'>
        <img src="${produto.imagem}" class="card-img-top" alt="${produto.nome}">
        <div class="card-body p-2 d-flex flex-column justify-content-between">
          <h6 class="card-title mb-1">${produto.nome}</h6>
          <p class="text-warning mb-1">★★★★☆ <span class="text-secondary">${produto.avaliacoes} avaliações</span></p>
          <small class="text-secondary">${produto.descricao}</small>
          <div class="mt-auto">
            ${produto.promocao ? `
              <p class="fw-bold text-dark mb-0">
                <span style="text-decoration: line-through; font-size: 0.9rem;">R$ ${produto.preco.toFixed(2)}</span>
                <span class="fs-5 ms-2">R$ ${(produto.preco * 0.8).toFixed(2)}</span>
              </p>
            ` : `
              <p class="fw-bold text-dark mb-0">R$ ${produto.preco.toFixed(2)}</p>
            `}
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  criarPaginacao(produtos.length); // Atualiza a paginação
}

// Função para abrir o modal do produto
function abrirModalProduto(produto) {
  // Atualiza o conteúdo do modal
  document.getElementById('produtoModalLabel').textContent = produto.nome;
  document.getElementById('produtoModalImagem').src = produto.imagem;
  document.getElementById('produtoModalImagem').alt = produto.nome;
  document.getElementById('produtoModalDescricao').textContent = produto.descricao;

  const precoHtml = produto.promocao
    ? `<span style="text-decoration: line-through; font-size: 0.9rem;">R$ ${produto.preco.toFixed(2)}</span>
       <span class="fs-5 ms-2">R$ ${(produto.preco * 0.8).toFixed(2)}</span>`
    : `R$ ${produto.preco.toFixed(2)}`;
  document.getElementById('produtoModalPreco').innerHTML = precoHtml;

  // Abre o modal
  const modal = new bootstrap.Modal(document.getElementById('produtoModal'));
  modal.show();
}

// Função para aplicar filtros
function aplicarFiltros(resetPagina = true) {
  if (resetPagina) paginaAtual = 1;

  const textoBusca = document.getElementById('inputBusca')?.value.toLowerCase() || '';
  const emEstoque = document.getElementById('status-estoque')?.checked;
  const foraEstoque = document.getElementById('status-fora-estoque')?.checked;
  const categorias = document.querySelectorAll('input[id^="cat-"]:checked');

  let filtrados = todosProdutos.filter(produto => {
    if (emEstoque && !produto.estoque) return false;
    if (foraEstoque && produto.estoque) return false;
    if (textoBusca && !produto.nome.toLowerCase().includes(textoBusca)) return false;

    const categoriasSelecionadas = Array.from(categorias)
      .map(cat => cat.id.replace('cat-', ''))
      .filter(id => id !== 'todos');

    if (categoriasSelecionadas.length && !categoriasSelecionadas.includes(produto.categoria)) return false;

    return true;
  });

  renderizarProdutos(filtrados);
  atualizarFiltrosAplicados();
}

// Atualiza os filtros aplicados dinamicamente
function atualizarFiltrosAplicados() {
  const container = document.querySelector('.filter-applied');
  container.innerHTML = '';

  const textoBusca = document.getElementById('inputBusca')?.value.toLowerCase() || '';
  const emEstoque = document.getElementById('status-estoque')?.checked;
  const foraEstoque = document.getElementById('status-fora-estoque')?.checked;
  const categorias = document.querySelectorAll('input[id^="cat-"]:checked');

  if (textoBusca) {
    container.appendChild(criarTagFiltro('Busca: ' + textoBusca, () => {
      document.getElementById('inputBusca').value = '';
      aplicarFiltros();
    }));
  }

  if (emEstoque) {
    container.appendChild(criarTagFiltro('Em estoque', () => {
      document.getElementById('status-estoque').checked = false;
      aplicarFiltros();
    }));
  }

  if (foraEstoque) {
    container.appendChild(criarTagFiltro('Fora de estoque', () => {
      document.getElementById('status-fora-estoque').checked = false;
      aplicarFiltros();
    }));
  }

  categorias.forEach(cat => {
    const id = cat.id.replace('cat-', '');
    const nome = cat.parentElement.textContent.trim();
    if (id !== 'todos') {
      container.appendChild(criarTagFiltro(nome, () => {
        cat.checked = false;
        aplicarFiltros();
      }));
    }
  });

  if (!container.children.length) {
    container.innerHTML = `
      <span class="filter-tag">
        Tudo
        <button type="button" aria-label="Nenhum filtro ativo">
          <i class="fas fa-times" style="font-size: 0.75rem;"></i>
        </button>
      </span>
    `;
  }
}

// Cria um botão de filtro aplicado
function criarTagFiltro(texto, onRemove) {
  const span = document.createElement('span');
  span.className = 'filter-tag';
  span.innerHTML = `
    ${texto}
    <button type="button" aria-label="Remover filtro">
      <i class="fas fa-times" style="font-size: 0.75rem;"></i>
    </button>
  `;
  span.querySelector('button').addEventListener('click', onRemove);
  return span;
}

// Cria os botões de navegação de página
function criarPaginacao(totalProdutos) {
  const paginacao = document.querySelector('.pagination');
  paginacao.innerHTML = '';

  const totalPaginas = Math.ceil(totalProdutos / produtosPorPagina);

  for (let i = 1; i <= totalPaginas; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === paginaAtual ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener('click', (e) => {
      e.preventDefault();
      paginaAtual = i;
      aplicarFiltros(false);
    });
    paginacao.appendChild(li);
  }
}

// Ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => aplicarFiltros(true));
  });

  const inputBusca = document.getElementById('inputBusca');
  if (inputBusca) {
    inputBusca.addEventListener('input', () => aplicarFiltros(true));
  }

  fetch('/json/produtos.json')
    .then(res => res.json())
    .then(data => {
      todosProdutos = data;
      aplicarFiltros();
    });
});
