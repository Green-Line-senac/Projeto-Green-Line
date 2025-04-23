let todosProdutos = [];
let paginaAtual = 1;
const produtosPorPagina = 8;

function renderizarProdutos(produtos) {
  const container = document.getElementById('container-produtos');
  container.innerHTML = '';

  const inicio = (paginaAtual - 1) * produtosPorPagina;
  const fim = inicio + produtosPorPagina;
  const produtosPagina = produtos.slice(inicio, fim);
//Produtos
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
    container.appendChild(card);
  });

  criarPaginacao(produtos.length);
}
//Filtros 
function aplicarFiltros(resetPagina = true) {
  if (resetPagina) {
    paginaAtual = 1;
  }
  const promocao = document.getElementById('checkPromocao').checked;
  const frete = document.getElementById('checkFrete').checked;
  const estoque = document.getElementById('checkEstoque').checked;
  const avaliacao = document.getElementById('checkAvaliacao').checked;

  let filtrados = todosProdutos.filter(produto => {
    if (promocao && !produto.promocao) return false;
    if (frete && !produto.freteGratis) return false;
    if (estoque && !produto.estoque) return false;
    if (avaliacao && produto.avaliacoes < 4) return false;
    return true;
  });

  renderizarProdutos(filtrados);
}
//Paginação
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
      aplicarFiltros(false); // NÃO reseta página
    });
    paginacao.appendChild(li);
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const filtros = document.querySelectorAll('.form-check-input');
  filtros.forEach(filtro => {
    filtro.addEventListener('change', () => aplicarFiltros(true)); // Resetar ao mudar filtro
  });

  fetch('../json/produtos.json')
    .then(res => res.json())
    .then(data => {
      todosProdutos = data;
      aplicarFiltros(); // Inicializa com todos os produtos
    });
});
