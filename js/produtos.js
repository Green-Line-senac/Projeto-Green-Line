// Lista de produtos e configurações de paginação
let todosProdutos = []; // Armazena todos os produtos carregados
let paginaAtual = 1; // Define a página ativa na navegação
const produtosPorPagina = 8; // Quantidade de produtos exibidos por página

// Função para renderizar os produtos no container da página
function renderizarProdutos(produtos) {
  const container = document.getElementById('container-produtos'); // Seleciona o container de produtos
  container.innerHTML = ''; // Limpa o container para evitar duplicação

  const inicio = (paginaAtual - 1) * produtosPorPagina; // Define o índice inicial para os produtos da página
  const fim = inicio + produtosPorPagina; // Define o índice final para os produtos da página
  const produtosPagina = produtos.slice(inicio, fim); // Filtra os produtos correspondentes à página atual

  // Cria os elementos de produto (cards) para exibição
  produtosPagina.forEach(produto => {
    const card = document.createElement('div'); // Cria um div para o card do produto
    card.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-4'; // Classes responsivas para o layout do card
    card.innerHTML = `
  <a href="#" class="text-decoration-none text-dark h-100">
    <div class="card h-100">
      <img src="${produto.imagem}" class="card-img-top" alt="${produto.nome}"> <!-- Adiciona descrição acessível para imagem -->
      <div class="card-body p-2 d-flex flex-column justify-content-between">
        <h6 class="card-title mb-1">${produto.nome}</h6> <!-- Nome do produto -->
        <p class="text-warning mb-1">★★★★☆ <span class="text-secondary">${produto.avaliacoes} avaliações</span></p> <!-- Avaliação visual -->
        <small class="text-secondary">${produto.descricao}</small> <!-- Descrição do produto -->
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
    container.appendChild(card); // Adiciona o card ao container principal
  });

  criarPaginacao(produtos.length); // Atualiza a navegação de páginas
}

// Função para aplicar filtros nos produtos
function aplicarFiltros(resetPagina = true) {
  if (resetPagina) {
    paginaAtual = 1; // Reseta a página ao aplicar novos filtros
  }

  // Captura o estado dos filtros e da busca
  const promocao = document.getElementById('checkPromocao')?.checked; // Filtro de promoção
  const frete = document.getElementById('checkFrete')?.checked; // Filtro de frete grátis
  const estoque = document.getElementById('checkEstoque')?.checked; // Filtro de disponibilidade no estoque
  const avaliacao = document.getElementById('checkAvaliacao')?.checked; // Filtro de avaliação mínima
  const textoBusca = document.getElementById('inputBusca')?.value.toLowerCase() || ''; // Busca por nome de produto

  // Filtragem dos produtos com base nos critérios definidos
  let filtrados = todosProdutos.filter(produto => {
    if (promocao && !produto.promocao) return false;
    if (frete && !produto.freteGratis) return false;
    if (estoque && !produto.estoque) return false;
    if (avaliacao && produto.avaliacoes < 4) return false;
    if (textoBusca && !produto.nome.toLowerCase().includes(textoBusca)) return false;
    return true; // Mantém o produto na lista filtrada
  });

  renderizarProdutos(filtrados); // Renderiza os produtos filtrados
}

// Função para criar a navegação de páginas
function criarPaginacao(totalProdutos) {
  const paginacao = document.querySelector('.pagination'); // Seleciona o container de paginação
  paginacao.innerHTML = ''; // Limpa os elementos existentes

  const totalPaginas = Math.ceil(totalProdutos / produtosPorPagina); // Calcula o número total de páginas

  // Criação dinâmica dos botões de navegação
  for (let i = 1; i <= totalPaginas; i++) {
    const li = document.createElement('li'); // Cria um item para cada página
    li.className = `page-item ${i === paginaAtual ? 'active' : ''}`; // Define estilo para a página ativa
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`; // Adiciona o número da página
    li.addEventListener('click', (e) => {
      e.preventDefault(); // Previne comportamento padrão do link
      paginaAtual = i; // Atualiza a página atual
      aplicarFiltros(false); // Reaplica os filtros sem resetar
    });
    paginacao.appendChild(li); // Adiciona o item à navegação
  }
}

// Evento para inicializar a página após carregá-la
document.addEventListener('DOMContentLoaded', () => {
  const filtros = document.querySelectorAll('.form-check-input'); // Seleciona todos os filtros
  filtros.forEach(filtro => {
    filtro.addEventListener('change', () => aplicarFiltros(true)); // Aplica filtros ao mudar estado
  });

  const inputBusca = document.getElementById('inputBusca'); // Captura o campo de busca
  if (inputBusca) {
    inputBusca.addEventListener('input', () => aplicarFiltros(true)); // Aplica busca ao digitar
  }

  // Fetch inicial para carregar os produtos
  fetch('../json/produtos.json')
    .then(res => res.json()) // Converte resposta para JSON
    .then(data => {
      todosProdutos = data; // Armazena os produtos recuperados
      aplicarFiltros(); // Renderiza todos os produtos inicialmente
    });
});