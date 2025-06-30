document.addEventListener('DOMContentLoaded', function() {
  // Resumo da compra
  const dadosCompra = JSON.parse(sessionStorage.getItem('dadosCompra') || '{}');
  console.log('DEBUG dadosCompra:', dadosCompra); // Log para depuração
  let htmlResumo = '<h4>Resumo da Compra</h4>';
  if (dadosCompra && Array.isArray(dadosCompra) && dadosCompra.length > 0) {
    htmlResumo += '<ul>';
    dadosCompra.forEach(item => {
      htmlResumo += `
        <li><strong>Produto:</strong> ${item.nome_produto || item.nome || 'Produto'}</li>
        <li><strong>Quantidade:</strong> ${item.quantidade}</li>
        <li><strong>Preço unitário:</strong> R$ ${Number(item.preco_final).toFixed(2)}</li>
        <li><strong>Subtotal:</strong> R$ ${Number(item.subtotal).toFixed(2)}</li>
        <hr>
      `;
    });
    htmlResumo += '</ul>';
  } else if (dadosCompra && (dadosCompra.nome_produto || dadosCompra.nome)) {
    htmlResumo += `<ul>
      <li><strong>Produto:</strong> ${dadosCompra.nome_produto || dadosCompra.nome || 'Produto'}</li>
      <li><strong>Quantidade:</strong> ${dadosCompra.quantidade}</li>
      <li><strong>Preço unitário:</strong> R$ ${Number(dadosCompra.preco_final).toFixed(2)}</li>
      <li><strong>Subtotal:</strong> R$ ${Number(dadosCompra.subtotal).toFixed(2)}</li>
    </ul>`;
  } else {
    htmlResumo += '<p>Nenhuma compra encontrada.</p>';
  }
  document.getElementById('resumo-compra').innerHTML = htmlResumo;

  // Endereço de entrega e frete
  const endereco = JSON.parse(sessionStorage.getItem('enderecoEntrega') || '{}');
  let htmlEndereco = '<h4>Endereço de Entrega</h4>';
  if (endereco && endereco.cep) {
    // Corrige o valor do frete para número
    let freteNum = 0;
    if (typeof endereco.frete === 'string') {
      freteNum = Number(endereco.frete.toString().replace(/[^0-9,\.]/g, '').replace(',', '.')) || 0;
    } else {
      freteNum = Number(endereco.frete) || 0;
    }
    htmlEndereco += `<ul>
      <li><strong>CEP:</strong> ${endereco.cep}</li>
      <li><strong>Endereço:</strong> ${endereco.logradouro}</li>
      <li><strong>Bairro:</strong> ${endereco.bairro}</li>
      <li><strong>Cidade:</strong> ${endereco.cidade} - ${endereco.uf}</li>
      <li><strong>Frete:</strong> R$ ${freteNum.toFixed(2)}</li>
    </ul>`;
    // Soma o frete ao subtotal
    if (dadosCompra && dadosCompra.subtotal) {
      const total = Number(dadosCompra.subtotal) + freteNum;
      htmlEndereco += `<h5 class='mt-3'>Total com frete: <span class='text-success'>R$ ${total.toFixed(2)}</span></h5>`;
    }
  } else {
    htmlEndereco += '<p>Endereço não informado.</p>';
  }
  document.getElementById('endereco-entrega').innerHTML = htmlEndereco;
}); 