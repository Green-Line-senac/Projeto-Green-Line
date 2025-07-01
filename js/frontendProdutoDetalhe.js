// Script para exibir detalhes do produto
// Espera receber o id do produto via query string (?id=123)

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    document.getElementById('produto-detalhe').innerHTML = '<div class="col-12 text-center">Produto não encontrado.</div>';
    return;
  }

  try {
    const res = await fetch(`https://green-line-web.onrender.com/produto?id=${id}`);
    const produtos = await res.json();
    const produto = Array.isArray(produtos) ? produtos.find(p => p.id_produto == id) : produtos;
    if (!produto) {
      document.getElementById('produto-detalhe').innerHTML = '<div class="col-12 text-center">Produto não encontrado.</div>';
      return;
    }
    renderProduto(produto);
  } catch (e) {
    document.getElementById('produto-detalhe').innerHTML = '<div class="col-12 text-center">Erro ao carregar produto.</div>';
  }
});

function renderProduto(produto) {
  const maxQtd = Math.max(1, Number(produto.estoque) || 1);
  // Carrossel de imagens
  const imagens = [produto.imagem_1, produto.imagem_2, produto.imagem_3].filter(Boolean);
  let imgHtml = '';
  if (imagens.length > 1) {
    imgHtml = `
      <div id="carouselProduto" class="carousel slide" data-bs-ride="carousel">
        <div class="carousel-inner">
          ${imagens.map((img, idx) => `
            <div class="carousel-item${idx === 0 ? ' active' : ''}">
              <img src="${img}" class="d-block w-100" alt="Imagem do produto ${idx+1}">
            </div>
          `).join('')}
        </div>
        <button class="carousel-control-prev" type="button" data-bs-target="#carouselProduto" data-bs-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Anterior</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#carouselProduto" data-bs-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Próxima</span>
        </button>
      </div>
    `;
  } else {
    imgHtml = `<img src="${imagens[0] || '../img/imagem-nao-disponivel.png'}" class="produto-img" alt="${produto.nome}">`;
  }

  // Preço formatado
  const preco = Number(produto.preco) || 0;
  const precoPromocional = Number(produto.preco_promocional) || 0;
  const emPromocao = produto.promocao && precoPromocional > 0 && precoPromocional < preco;
  let precoHtml = '';
  if (emPromocao) {
    precoHtml = `<span class='original-price' style='text-decoration: line-through; color: #888;'>R$ ${preco.toFixed(2)}</span> <span class='discount-price' style='color: #059669; font-weight: bold;'>R$ ${precoPromocional.toFixed(2)}</span>`;
  } else {
    precoHtml = `<span class='current-price' style='color: #1f2937; font-weight: bold;'>R$ ${preco.toFixed(2)}</span>`;
  }

  // Detecta se é roupa ou sapato
  const categoria = (produto.categoria || '').toLowerCase();
  const nomeProduto = produto.produto || produto.nome || '';
  const nome = nomeProduto.toLowerCase();
  let variacaoHtml = '';
  let tipoVariacao = '';
  if (categoria.includes('roupa') || nome.match(/camiseta|calça|blusa|jaqueta|bermuda|short|vestido|moletom/)) {
    tipoVariacao = 'tamanho';
    variacaoHtml = `<div class='mb-3'><label for='selectVariacao' class='form-label'><strong>Tamanho:</strong></label>
      <select id='selectVariacao' class='form-select' required>
        <option value='' disabled selected>Selecione o tamanho</option>
        <option>PP</option><option>P</option><option>M</option><option>G</option><option>GG</option><option>XG</option>
      </select></div>`;
  } else if (categoria.includes('sapato') || nome.match(/tênis|bota|sapatênis|sandália|chinelo|sapato/)) {
    tipoVariacao = 'numeracao';
    variacaoHtml = `<div class='mb-3'><label for='selectVariacao' class='form-label'><strong>Numeração:</strong></label>
      <select id='selectVariacao' class='form-select' required>
        <option value='' disabled selected>Selecione a numeração</option>
        ${Array.from({length: 11}, (_,i)=>34+i).map(n=>`<option>${n}</option>`).join('')}
      </select></div>`;
  }

  // Bloco de avaliação
  const avaliacaoHtml = `
    <div class="mb-3" id="bloco-avaliacao">
      <div id="avaliacao-media" class="mb-1">Carregando avaliações...</div>
      <div id="avaliacao-estrelas" class="mb-1"></div>
      <textarea id="avaliacao-comentario" class="form-control mb-1" rows="2" maxlength="200" placeholder="Deixe um comentário (opcional)"></textarea>
      <button class="btn btn-sm btn-outline-success mt-1" id="btnEnviarAvaliacao" style="display:none">Enviar Avaliação</button>
      <div id="avaliacao-feedback" class="text-success small mt-1"></div>
      <div id="avaliacoes-recentes" class="mt-3"></div>
    </div>
  `;

  const html = `
    <div class="col-md-5 mb-3 mb-md-0">
      ${imgHtml}
    </div>
    <div class="col-md-7">
      <h2 class="produto-nome">${nomeProduto}</h2>
      <div class="mb-2">${renderEstrelas(produto.avaliacao)} <small>(${produto.numAvaliacoes || 0} avaliações)</small></div>
      <div class="mb-3">${produto.descricao || ''}</div>
      <div class="mb-3"><strong>Categoria:</strong> ${produto.categoria || 'N/A'}</div>
      <div class="mb-3"><strong>Marca:</strong> ${produto.marca || 'N/A'}</div>
      <div class="mb-3"><strong>Estoque:</strong> ${produto.estoque > 0 ? `<span class='text-success'>${produto.estoque} disponível</span>` : '<span class="text-danger">Fora de estoque</span>'}</div>
      <div class="mb-3"><strong>Preço:</strong> ${precoHtml}</div>
      ${variacaoHtml}
      <div class="mb-3 d-flex align-items-center gap-2">
        <label for="qtdProduto" class="form-label mb-0"><strong>Quantidade:</strong></label>
        <button type="button" class="btn btn-outline-secondary btn-sm" id="btnDiminuir">-</button>
        <input type="number" id="qtdProduto" class="form-control" value="1" min="1" max="${maxQtd}" style="width: 70px; text-align: center;">
        <button type="button" class="btn btn-outline-secondary btn-sm" id="btnAumentar">+</button>
        <span class="text-muted small">(máx. ${maxQtd})</span>
      </div>
      <div class="mb-3">
        <button class="btn btn-success me-2" id="btnComprarAgora" ${produto.estoque > 0 ? '' : 'disabled'}>Comprar agora</button>
        <button class="btn btn-outline-success" id="btnAddCarrinho" ${produto.estoque > 0 ? '' : 'disabled'}>Adicionar ao carrinho</button>
      </div>
      <div class="mb-3"><strong>Especificações:</strong><br>${produto.descricao_curta || '-'}</div>
      ${avaliacaoHtml}
    </div>
  `;
  document.getElementById('produto-detalhe').innerHTML = html;

  // Controle de quantidade
  const inputQtd = document.getElementById('qtdProduto');
  document.getElementById('btnDiminuir').onclick = () => {
    inputQtd.value = Math.max(1, parseInt(inputQtd.value) - 1);
  };
  document.getElementById('btnAumentar').onclick = () => {
    inputQtd.value = Math.min(maxQtd, parseInt(inputQtd.value) + 1);
  };
  inputQtd.oninput = () => {
    let v = parseInt(inputQtd.value);
    if (isNaN(v) || v < 1) inputQtd.value = 1;
    if (v > maxQtd) inputQtd.value = maxQtd;
  };

  document.getElementById('btnComprarAgora').onclick = () => {
    let variacao = '';
    if (tipoVariacao) {
      const select = document.getElementById('selectVariacao');
      variacao = select ? select.value : '';
      if (!variacao) {
        alert('Selecione uma opção antes de comprar!');
        select && select.focus();
        return;
      }
    }
    comprar(produto, parseInt(inputQtd.value), variacao);
  };
  document.getElementById('btnAddCarrinho').onclick = () => {
    let variacao = '';
    if (tipoVariacao) {
      const select = document.getElementById('selectVariacao');
      variacao = select ? select.value : '';
      if (!variacao) {
        alert('Selecione uma opção antes de adicionar ao carrinho!');
        select && select.focus();
        return;
      }
    }
    adicionarAoCarrinho(produto, parseInt(inputQtd.value), variacao);
  };

  // Sistema de avaliação
  carregarAvaliacoes(produto.id_produto);
}

function renderEstrelas(nota) {
  if (!nota) return '☆☆☆☆☆';
  const estrelasCheias = Math.floor(nota);
  const temMeia = nota % 1 >= 0.5;
  return '★'.repeat(estrelasCheias) + (temMeia ? '½' : '') + '☆'.repeat(5 - estrelasCheias - (temMeia ? 1 : 0));
}

function comprar(produto, quantidade = 1, variacao = '') {
  quantidade = Math.max(1, quantidade);
  const preco_final = (produto.promocao && Number(produto.preco_promocional) > 0 && Number(produto.preco_promocional) < Number(produto.preco)) ? Number(produto.preco_promocional) : Number(produto.preco);
  const subtotal = Math.round(preco_final * quantidade * 100) / 100;
  const dadosCompra = {
    nome_produto: produto.nome,
    preco_final,
    quantidade,
    subtotal,
    id_produto: produto.id_produto,
    variacao,
    data: new Date().toISOString(),
  };
  sessionStorage.setItem('dadosCompra', JSON.stringify(dadosCompra));
  window.location.href = 'vendas.html';
}

function adicionarAoCarrinho(produto, quantidade = 1, variacao = '') {
  quantidade = Math.max(1, quantidade);
  const id_pessoa = sessionStorage.getItem('id_pessoa');
  if (!id_pessoa) {
    alert('Por favor, faça login ou cadastro para adicionar ao carrinho.');
    return;
  }
  fetch('https://green-line-web.onrender.com/carrinho', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_pessoa: Number(id_pessoa),
      id_produto: produto.id_produto,
      quantidade,
      variacao
    })
  })
    .then(res => res.json())
    .then(resposta => {
      if (resposta.codigo === 1 || resposta.mensagem === 'ITEM_DUPLICADO') {
        alert('⚠️ Este item já está no seu carrinho');
      } else if (resposta.sucesso) {
        alert('✅ Item adicionado ao carrinho com sucesso!');
      } else {
        alert('❌ Falha ao adicionar item ao carrinho');
      }
    })
    .catch(() => {
      alert('❌ Ocorreu um erro ao adicionar o item ao carrinho');
    });
}

// Função para carregar avaliações e exibir média/total
async function carregarAvaliacoes(id_produto) {
  const mediaEl = document.getElementById('avaliacao-media');
  const estrelasEl = document.getElementById('avaliacao-estrelas');
  const btnEnviar = document.getElementById('btnEnviarAvaliacao');
  const feedbackEl = document.getElementById('avaliacao-feedback');
  const comentarioEl = document.getElementById('avaliacao-comentario');
  const avaliacoesRecentesEl = document.getElementById('avaliacoes-recentes');
  mediaEl.textContent = 'Carregando avaliações...';
  estrelasEl.innerHTML = '';
  feedbackEl.textContent = '';
  avaliacoesRecentesEl.innerHTML = '';
  let notaSelecionada = 0;
  let comentarioUsuario = '';
  let jaAvaliou = false;

  try {
    const res = await fetch(`https://green-line-web.onrender.com/avaliacoes?id_produto=${id_produto}`);
    const data = await res.json();
    if (data.sucesso) {
      mediaEl.innerHTML = `<strong>Média:</strong> ${data.media} <span class='text-warning'>${renderEstrelas(data.media)}</span> <small>(${data.total} avaliações)</small>`;
      // Mostrar avaliações recentes
      if (data.avaliacoes && data.avaliacoes.length > 0) {
        avaliacoesRecentesEl.innerHTML = '<h6 class="mb-2">Avaliações recentes:</h6>' +
          data.avaliacoes.slice(0, 5).map(av => `
            <div class="border rounded p-2 mb-2">
              <div><span class='text-warning'>${renderEstrelas(av.nota)}</span> <small class="text-muted">${new Date(av.data).toLocaleDateString()}</small></div>
              <div class="small">${av.comentario ? av.comentario : '<span class="text-muted">(Sem comentário)</span>'}</div>
            </div>
          `).join('');
      } else {
        avaliacoesRecentesEl.innerHTML = '<span class="text-muted">Nenhuma avaliação ainda.</span>';
      }
      // Verifica se o usuário já avaliou
      const id_pessoa = sessionStorage.getItem('id_pessoa');
      if (id_pessoa) {
        const minhaAvaliacao = data.avaliacoes.find(av => String(av.id_pessoa) === String(id_pessoa));
        if (minhaAvaliacao) {
          jaAvaliou = true;
          notaSelecionada = minhaAvaliacao.nota;
          comentarioUsuario = minhaAvaliacao.comentario || '';
          // Preenche estrelas e comentário
          setTimeout(() => {
            for (let j = 1; j <= 5; j++) estrelasEl.children[j-1].style.color = j <= notaSelecionada ? '#FFD600' : '#ccc';
            comentarioEl.value = comentarioUsuario;
            btnEnviar.style.display = '';
            btnEnviar.textContent = 'Editar Avaliação';
            feedbackEl.textContent = 'Você já avaliou este produto. Edite sua avaliação se desejar.';
            feedbackEl.className = 'text-info small mt-1';
          }, 100);
        }
      }
    } else {
      mediaEl.textContent = 'Sem avaliações ainda.';
      avaliacoesRecentesEl.innerHTML = '<span class="text-muted">Nenhuma avaliação ainda.</span>';
    }
  } catch {
    mediaEl.textContent = 'Erro ao carregar avaliações.';
    avaliacoesRecentesEl.innerHTML = '<span class="text-danger">Erro ao carregar avaliações.</span>';
  }

  // Permitir avaliar se usuário estiver logado
  const id_pessoa = sessionStorage.getItem('id_pessoa');
  if (id_pessoa) {
    // Estrelas clicáveis
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('span');
      star.innerHTML = '★';
      star.style.fontSize = '1.5rem';
      star.style.cursor = 'pointer';
      star.style.color = '#ccc';
      star.onmouseover = () => {
        for (let j = 1; j <= 5; j++) estrelasEl.children[j-1].style.color = j <= i ? '#FFD600' : '#ccc';
      };
      star.onmouseout = () => {
        for (let j = 1; j <= 5; j++) estrelasEl.children[j-1].style.color = j <= notaSelecionada ? '#FFD600' : '#ccc';
      };
      star.onclick = () => {
        notaSelecionada = i;
        for (let j = 1; j <= 5; j++) estrelasEl.children[j-1].style.color = j <= i ? '#FFD600' : '#ccc';
        btnEnviar.style.display = '';
        btnEnviar.textContent = jaAvaliou ? 'Editar Avaliação' : 'Enviar Avaliação';
        feedbackEl.textContent = '';
      };
      estrelasEl.appendChild(star);
    }
    // Modifique a função de envio de avaliação para:
btnEnviar.onclick = async () => {
  if (!notaSelecionada) {
    feedbackEl.textContent = 'Selecione uma nota!';
    feedbackEl.className = 'text-danger small mt-1';
    return;
  }

  btnEnviar.disabled = true;
  feedbackEl.textContent = jaAvaliou ? 'Editando avaliação...' : 'Enviando avaliação...';
  feedbackEl.className = 'text-muted small mt-1';

  btnEnviar.onclick = async () => {
    try {
      const response = await fetch('https://green-line-web.onrender.com/avaliacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_produto,
          id_pessoa: Number(id_pessoa),
          nota: notaSelecionada,
          comentario: comentarioEl.value.trim()
        })
      });
  
      // Verifica se a resposta é JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Resposta inválida: ${text.substring(0, 100)}...`);
      }
  
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.mensagem || 'Erro no servidor');
      }
  
      // Sucesso
      feedbackEl.textContent = 'Avaliação enviada!';
      
    } catch (error) {
      console.error('Erro na avaliação:', error);
      feedbackEl.textContent = error.message;
      feedbackEl.className = 'text-danger small mt-1';
    }
  };
};
  } else {
    estrelasEl.innerHTML = '<span class="text-muted">Faça login para avaliar</span>';
    comentarioEl.disabled = true;
    btnEnviar.style.display = 'none';
  }
}

function showAlert(msg, type = 'danger') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
  alertDiv.style.zIndex = 2000;
  alertDiv.innerHTML = `
    <span>${msg}</span>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
  `;
  document.body.appendChild(alertDiv);
  setTimeout(() => { if (alertDiv) alertDiv.remove(); }, 5000);
} 