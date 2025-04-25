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
      <a href="#" class="text-decoration-none text-dark h-100">
        <div class="card h-100">
          <img src="${produto.imagem}" class="card-img-top" alt="${produto.nome}">
          <div class="card-body p-2 d-flex flex-column justify-content-between">
            <h6 class="card-title mb-1">${produto.nome}</h6>
            <p class="text-warning mb-1">★★★★☆ <span class="text-secondary">${produto.avaliacoes} avaliações</span></p>
            <small class="text-secondary">${produto.descricao}</small>
            <div class="mt-auto">
              ${produto.promocao ? `
                <p class="fw-bold text-dark mb-0">
                  <span style="text-decoration: line-through; font-size: 0.9rem;">R$ ${produto.preco.toFixed(2)}</span>
                  <span class="fs-5">R$ ${(produto.preco * 0.8).toFixed(2)}</span>
                </p>
              ` : `
                <p class="fw-bold text-dark mb-0">R$ ${produto.preco.toFixed(2)}</p>
              `}
            </div>
          </div>
        </div>
      </a>`;
    container.appendChild(card); // Adiciona o card ao container
  });

  criarPaginacao(produtos.length); // Atualiza os botões de página
}

// Função para aplicar filtros nos produtos
function aplicarFiltros(resetPagina = true) {
  if (resetPagina) paginaAtual = 1; // Volta para a primeira página se necessário

  // Captura os filtros selecionados
  const textoBusca = document.getElementById('inputBusca')?.value.toLowerCase() || '';
  const emEstoque = document.getElementById('status-estoque')?.checked;
  const foraEstoque = document.getElementById('status-fora-estoque')?.checked;
  const categorias = document.querySelectorAll('input[id^="cat-"]:checked');

  // Filtra os produtos com base nos filtros
  let filtrados = todosProdutos.filter(produto => {
    if (emEstoque && !produto.estoque) return false;
    if (foraEstoque && produto.estoque) return false;
    if (textoBusca && !produto.nome.toLowerCase().includes(textoBusca)) return false;

    // Filtra por categoria (se alguma estiver marcada)
    const categoriasSelecionadas = Array.from(categorias)
      .map(cat => cat.id.replace('cat-', ''))
      .filter(id => id !== 'todos');

    if (categoriasSelecionadas.length && !categoriasSelecionadas.includes(produto.categoria)) return false;

    return true; // Se passou por todos filtros, mantém o produto
  });

  renderizarProdutos(filtrados); // Mostra os produtos filtrados
  atualizarFiltrosAplicados();   // Atualiza a seção "Filtros Aplicados"
}

// Atualiza os filtros aplicados dinamicamente
function atualizarFiltrosAplicados() {
  const container = document.querySelector('.filter-applied');
  container.innerHTML = ''; // Limpa os filtros anteriores

  // Captura os filtros ativos
  const textoBusca = document.getElementById('inputBusca')?.value.toLowerCase() || '';
  const emEstoque = document.getElementById('status-estoque')?.checked;
  const foraEstoque = document.getElementById('status-fora-estoque')?.checked;
  const categorias = document.querySelectorAll('input[id^="cat-"]:checked');

  // Adiciona cada filtro como uma tag removível
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

  // Se nenhum filtro estiver ativo, mostra "Tudo"
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

// Cria elemento de filtro com botão para remover
function criarTagFiltro(texto, onRemove) {
  const span = document.createElement('span');
  span.className = 'filter-tag';
  span.innerHTML = `
    ${texto}
    <button type="button" aria-label="Remover filtro">
      <i class="fas fa-times" style="font-size: 0.75rem;"></i>
    </button>
  `;
  span.querySelector('button').addEventListener('click', onRemove); // Ação ao clicar no X
  return span;
}

// Cria os botões de navegação de página
function criarPaginacao(totalProdutos) {
  const paginacao = document.querySelector('.pagination');
  paginacao.innerHTML = ''; // Limpa a paginação atual

  const totalPaginas = Math.ceil(totalProdutos / produtosPorPagina); // Calcula total de páginas

  for (let i = 1; i <= totalPaginas; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === paginaAtual ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.addEventListener('click', (e) => {
      e.preventDefault(); // Evita o redirecionamento da página
      paginaAtual = i;
      aplicarFiltros(false); // Refiltra sem resetar a página
    });
    paginacao.appendChild(li);
  }
}

// Executado ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  // Aplica evento de filtro em todos os checkboxes
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => aplicarFiltros(true));
  });

  // Aplica evento de busca por texto
  const inputBusca = document.getElementById('inputBusca');
  if (inputBusca) {
    inputBusca.addEventListener('input', () => aplicarFiltros(true));
  }

  // Carrega os produtos do arquivo JSON
  fetch('../json/produtos.json')
    .then(res => res.json())
    .then(data => {
      todosProdutos = data;    // Salva todos os produtos carregados
      aplicarFiltros();        // Aplica os filtros iniciais (exibe todos por padrão)
    });
});
