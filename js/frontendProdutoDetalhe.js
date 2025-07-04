// Script para exibir detalhes do produto
// Espera receber o id do produto via query string (?id=123)

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    // Exibe mensagem de erro no campo de nome
    const nomeEl = document.getElementById('produto-nome');
    if (nomeEl) nomeEl.textContent = 'Produto não encontrado.';
    return;
  }

  // Tenta buscar do sessionStorage primeiro
  const produtoSalvo = sessionStorage.getItem('produtoSelecionado');
  let produto = null;
  if (produtoSalvo) {
    try {
      const produtoObj = JSON.parse(produtoSalvo);
      if (produtoObj && String(produtoObj.id_produto) === String(id)) {
        produto = produtoObj;
      }
    } catch (e) {}
  }

  // Se não achou, busca do backend
  if (!produto) {
    try {
      const res = await fetch(`https://green-line-web.onrender.com/produto?id=${id}`);
      const produtos = await res.json();
      produto = Array.isArray(produtos) ? produtos.find(p => p.id_produto == id) : produtos;
    } catch (e) {}
  }

  if (!produto) {
    const nomeEl = document.getElementById('produto-nome');
    if (nomeEl) nomeEl.textContent = 'Produto não encontrado.';
    return;
  }

  preencherCamposProduto(produto);
});

function preencherCamposProduto(produto) {
  // Imagem principal
  const imgEl = document.getElementById('produto-img-principal');
  let imagens = [produto.imagem_1, produto.imagem_2, produto.imagem_3].filter(Boolean);
  if (imgEl) imgEl.src = imagens[0] || '../img/imagem-nao-disponivel.png';

  // Miniaturas
  const thumbsEl = document.getElementById('produto-thumbs');
  if (thumbsEl) {
    thumbsEl.innerHTML = '';
    imagens.forEach((img, idx) => {
      const thumb = document.createElement('img');
      thumb.src = img;
      thumb.className = 'produto-thumb rounded';
      thumb.width = 56;
      thumb.height = 56;
      thumb.alt = 'Miniatura ' + (idx+1);
      thumb.style.cursor = 'pointer';
      thumb.onclick = () => { if (imgEl) imgEl.src = img; };
      thumbsEl.appendChild(thumb);
    });
    // Se não houver miniaturas, mostra só a principal
    if (imagens.length === 0) {
      const thumb = document.createElement('img');
      thumb.src = '../img/imagem-nao-disponivel.png';
      thumb.className = 'produto-thumb rounded';
      thumb.width = 56;
      thumb.height = 56;
      thumbsEl.appendChild(thumb);
    }
  }

  // Nome
  const nomeEl = document.getElementById('produto-nome');
  if (nomeEl) nomeEl.textContent = produto.nome || produto.produto || 'Produto';

  // Categoria
  const catEl = document.getElementById('produto-categoria');
  if (catEl) catEl.textContent = produto.categoria || 'Categoria';

  // Estoque
  const estoqueEl = document.getElementById('produto-estoque');
  if (estoqueEl) estoqueEl.textContent = produto.estoque > 0 ? 'Em estoque' : 'Fora de estoque';
  if (estoqueEl) estoqueEl.className = produto.estoque > 0 ? 'badge bg-success bg-opacity-25 text-success produto-estoque' : 'badge bg-danger bg-opacity-25 text-danger produto-estoque';

  // Preço
  const precoOriginalEl = document.getElementById('produto-preco-original');
  const precoPromocionalEl = document.getElementById('produto-preco-promocional');
  const emPromocao = produto.promocao && produto.preco_promocional > 0 && produto.preco_promocional < produto.preco;
  if (emPromocao) {
    if (precoOriginalEl) precoOriginalEl.textContent = 'R$ ' + Number(produto.preco).toFixed(2);
    if (precoPromocionalEl) precoPromocionalEl.textContent = 'R$ ' + Number(produto.preco_promocional).toFixed(2);
  } else {
    if (precoOriginalEl) precoOriginalEl.textContent = '';
    if (precoPromocionalEl) precoPromocionalEl.textContent = 'R$ ' + Number(produto.preco).toFixed(2);
  }

  // Parcelamento (exemplo simples)
  const parcEl = document.getElementById('produto-parcelamento');
  if (parcEl) {
    const valor = emPromocao ? produto.preco_promocional : produto.preco;
    parcEl.textContent = `ou 12x de R$ ${(valor/12).toFixed(2)} sem juros`;
  }

  // Descrição
  const descEl = document.getElementById('produto-descricao');
  if (descEl) descEl.textContent = produto.descricao || 'Sem descrição.';

  // Características (exemplo: separa por quebra de linha ou vírgula)
  const caracEl = document.getElementById('produto-caracteristicas');
  if (caracEl) {
    caracEl.innerHTML = '';
    if (produto.descricao_curta) {
      produto.descricao_curta.split(/\n|,/).forEach(item => {
        if (item.trim()) {
          const li = document.createElement('li');
          li.textContent = item.trim();
          caracEl.appendChild(li);
        }
      });
    }
  }

  // Estrelas e avaliações
  const estrelasEl = document.getElementById('produto-estrelas');
  if (estrelasEl) estrelasEl.innerHTML = gerarEstrelas(produto.avaliacao);
  const numAvaliacoesEl = document.getElementById('produto-num-avaliacoes');
  if (numAvaliacoesEl) numAvaliacoesEl.textContent = `(${produto.numAvaliacoes || 0} avaliações)`;

  // Bloco de avaliação média
  const mediaAvaliacaoEl = document.getElementById('produto-media-avaliacao');
  if (mediaAvaliacaoEl) mediaAvaliacaoEl.textContent = (produto.avaliacao || 0).toFixed(1);
  const mediaEstrelasEl = document.getElementById('produto-media-estrelas');
  if (mediaEstrelasEl) mediaEstrelasEl.innerHTML = gerarEstrelas(produto.avaliacao);
  const totalAvaliacoesEl = document.getElementById('produto-total-avaliacoes');
  if (totalAvaliacoesEl) totalAvaliacoesEl.textContent = `Baseado em ${produto.numAvaliacoes || 0} avaliações`;

  // Comentários de avaliações (mock ou real)
  const avaliacoesEl = document.getElementById('produto-avaliacoes');
  if (avaliacoesEl) {
    avaliacoesEl.innerHTML = '';
    if (produto.avaliacoes && Array.isArray(produto.avaliacoes) && produto.avaliacoes.length > 0) {
      produto.avaliacoes.forEach(av => {
        const card = document.createElement('div');
        card.className = 'avaliacao-card';
        card.innerHTML = `
          <div class="fw-bold">${av.nome || 'Usuário'} <span class="produto-estrelas ms-2">${gerarEstrelas(av.nota)}</span></div>
          <div class="text-muted small">${av.data || ''}</div>
          <div>${av.comentario || ''}</div>
        `;
        avaliacoesEl.appendChild(card);
      });
    } else {
      avaliacoesEl.innerHTML = '<div class="text-muted">Nenhum comentário disponível.</div>';
    }
  }

  // Total (valor * quantidade)
  const totalEl = document.getElementById('produto-total');
  const qtdEl = document.getElementById('quantidade');
  // Ajusta o máximo pelo estoque
  const maxEstoque = Math.max(1, Number(produto.estoque) || 1);
  if (qtdEl) {
    qtdEl.max = maxEstoque;
    qtdEl.min = 1;
    qtdEl.value = 1;
  }
  // Texto de máximo
  const maxTextEl = qtdEl ? qtdEl.closest('.mb-2').querySelector('small.text-muted') : null;
if (maxTextEl) {
  maxTextEl.textContent = `Máximo ${maxEstoque} unidade${maxEstoque > 1 ? 's' : ''} por pedido`;
}


  // Botões de quantidade (declarar antes de atualizarTotal)
  const btnMenos = document.getElementById('btnDiminuir');
  const btnMais = document.getElementById('btnAumentar');

  function atualizarTotal() {
    const valor = emPromocao ? produto.preco_promocional : produto.preco;
    let qtd = Number(qtdEl.value) || 1;
    if (qtd < 1) qtd = 1;
    if (qtd > maxEstoque) qtd = maxEstoque;
    qtdEl.value = qtd;
    totalEl.textContent = 'R$ ' + (valor * qtd).toFixed(2);
    // Desabilita botões se atingir limites
    if (btnMenos) btnMenos.disabled = qtd <= 1;
    if (btnMais) btnMais.disabled = qtd >= maxEstoque;
  }
  if (qtdEl && totalEl) {
    qtdEl.oninput = atualizarTotal;
    atualizarTotal();
  }
  if (btnMenos && qtdEl) btnMenos.onclick = () => { qtdEl.value = Math.max(1, Number(qtdEl.value)-1); atualizarTotal(); };
  if (btnMais && qtdEl) btnMais.onclick = () => { qtdEl.value = Math.min(maxEstoque, Number(qtdEl.value)+1); atualizarTotal(); };

  // Garantir alinhamento visual do campo de quantidade
  const inputGroup = qtdEl ? qtdEl.closest('.input-group') : null;
  if (inputGroup) {
    inputGroup.style.display = 'flex';
    inputGroup.style.flexDirection = 'row';
    inputGroup.style.alignItems = 'center';
    inputGroup.style.justifyContent = 'center';
    inputGroup.style.gap = '0';
  }
  if (btnMenos) btnMenos.style.marginRight = '0';
  if (btnMais) btnMais.style.marginLeft = '0';
  if (qtdEl) qtdEl.style.margin = '0 2px';

  // Botões de ação
  const btnComprar = document.getElementById('btnComprarAgora');
  const btnCarrinho = document.getElementById('btnAddCarrinho');
  if (btnComprar && qtdEl && produto) {
    btnComprar.onclick = () => {
      const id_pessoa = sessionStorage.getItem('id_pessoa');
      if (!id_pessoa) {
        alert('Por favor, faça login ou cadastro para continuar sua compra.',"danger");
        return;
      }
  
      const quantidade = Math.max(1, Math.min(Number(qtdEl.value) || 1, maxEstoque));
      const preco_final = emPromocao ? produto.preco_promocional : produto.preco;
      const subtotal = Number((preco_final * quantidade).toFixed(2));
  
      const dadosCompra = {
        nome_produto: produto.nome || produto.produto || 'Produto',
        preco_final,
        quantidade,
        subtotal,
        id_produto: produto.id_produto || null,
        data: new Date().toISOString(),
      };
  
      sessionStorage.setItem('dadosCompra', JSON.stringify(dadosCompra));
      window.location.href = 'vendas.html';
    };
  }
  
  if (btnCarrinho && qtdEl) btnCarrinho.onclick = () => {
    const quantidade = Math.max(1, Math.min(Number(qtdEl.value) || 1, maxEstoque));
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
        quantidade
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
  };
}

function gerarEstrelas(nota) {
  const n = Math.round(Number(nota) || 0);
  return '<i class="fas fa-star text-warning"></i>'.repeat(n) + '<i class="far fa-star text-warning"></i>'.repeat(5-n);
}

function renderEstrelas(nota) {
  if (!nota) return '☆☆☆☆☆';
  const estrelasCheias = Math.round(nota);
  return '★'.repeat(estrelasCheias) + '☆'.repeat(5 - estrelasCheias);
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
  console.log('Carregando avaliações para o produto:', id_produto);
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
      // Preencher o bloco de avaliações do design novo
      const blocoAvaliacoes = document.getElementById('produto-avaliacoes');
      if (blocoAvaliacoes) {
        blocoAvaliacoes.innerHTML = '';
        if (data.avaliacoes && data.avaliacoes.length > 0) {
          data.avaliacoes.forEach(av => {
            const card = document.createElement('div');
            card.className = 'avaliacao-card';
            card.innerHTML = `
              <div class="fw-bold">${av.nome || 'Usuário'} <span class="produto-estrelas ms-2">${renderEstrelas(av.nota)}</span></div>
              <div class="text-muted small">${new Date(av.data).toLocaleDateString()}</div>
              <div>${av.comentario || ''}</div>
            `;
            blocoAvaliacoes.appendChild(card);
          });
        } else {
          blocoAvaliacoes.innerHTML = '<div class="text-muted">Nenhum comentário disponível.</div>';
        }
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
    console.log('Usuário logado, permitindo avaliação');
btnEnviar.onclick = async () => {
  if (!notaSelecionada) {
    feedbackEl.textContent = 'Selecione uma nota!';
    feedbackEl.className = 'text-danger small mt-1';
    return;
  }

  btnEnviar.disabled = true;
  feedbackEl.textContent = jaAvaliou ? 'Editando avaliação...' : 'Enviando avaliação...';
  feedbackEl.className = 'text-muted small mt-1';

    try {
      const response = await fetch('https://green-line-web.onrender.com/avaliacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_produto: id_produto,
          id_pessoa: Number(id_pessoa),
          nota: notaSelecionada,
          comentario: comentarioEl.value.trim()
        })
      });

      // Verifica se a resposta é JSON//
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