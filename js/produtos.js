let todosProdutos = []; //armazenamos todos os produtos recuperados do arquivo produtos.json.


function renderizarProdutos(produtos) { //Essa função exibi os produtos no DOM
  const container = document.getElementById('container-produtos');
  container.innerHTML = '';

  produtos.forEach(produto => {
    const card = document.createElement('div');
    card.className = 'col-12 col-sm-6 col-md-4 col-lg-3 mb-4';
    card.innerHTML = `
      <a href="#" class="text-decoration-none text-dark">
        <div class="card">
          <img src="${produto.imagem}" class="card-img-top" alt="${produto.nome}">
          <div class="card-body p-2">
            <h6 class="card-title mb-1">${produto.nome}</h6>
            <p class="text-warning mb-1">★★★★☆ <span class="text-secondary">${produto.avaliacoes} avaliações</span></p>
            <small class="text-secondary">${produto.descricao}</small>
            <p class="fw-bold fs-7 text-dark mb-0">R$ ${produto.preco.toFixed(2)}</p>
          </div>
        </div>
      </a>
    `;
    container.appendChild(card);
  });
}



function aplicarFiltros() {
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
/* Verifica quais filtros estão ativados nos checkboxes e filtra os produtos de acordo com:
- promocao: Se o produto está em promoção.
- freteGratis: Se o produto tem frete grátis.
- estoque: Se o produto está disponível no estoque.
- avaliacoes: Se o produto tem pelo menos 4 estrelas de avaliação.*/

fetch('../json/produtos.json')
  .then(res => res.json())
  .then(data => {
    todosProdutos = data;
    renderizarProdutos(todosProdutos);
  });

  /*SE FOSSE NO JAVA 
        fetch('produtos.json')
          .then(function(res) {
          return res.json();
        })
        .then(function(data) {
          todosProdutos = data;
          renderizarProdutos(todosProdutos);
        });
  */

// Ativa filtro sempre que mudar
document.addEventListener('DOMContentLoaded', () => {
  const filtros = document.querySelectorAll('.form-check-input');
  filtros.forEach(filtro => {
    filtro.addEventListener('change', aplicarFiltros);
  });
});
