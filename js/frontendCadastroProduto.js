(function () {
  const api = {
    online: "https://green-line-web.onrender.com",
    cadastro_produto: "http://localhost:3005",
  };

  "use strict";
  const formulario = document.getElementById("formulario-produto");
  const campoDescricao = document.getElementById("descricao-curta");
  const contadorDescricao = document.getElementById("contador-descricao");
  const campoDetalhada = document.getElementById("descricao-detalhada");
  const contadorDetalhada = document.getElementById("contador-detalhada");
  const imagemUrl1 = document.getElementById("url-imagem-1");
  const imagemUrl2 = document.getElementById("url-imagem-2");
  const btnSubmit = formulario.querySelector('button[type="submit"]');
  const btnSpinner = btnSubmit.querySelector(".spinner-border");
  const btnSubmitText = btnSubmit.querySelector(".submit-text");

  // Elementos de feedback
  const errorElement = document.createElement("div");
  errorElement.className = "alert alert-danger mt-3 d-none";
  errorElement.id = "error-message";
  formulario.parentNode.insertBefore(errorElement, formulario.nextSibling);

  const successElement = document.createElement("div");
  successElement.className = "alert alert-success mt-3 d-none";
  successElement.id = "success-message";
  formulario.parentNode.insertBefore(successElement, formulario.nextSibling);

  // Inicializa contadores
  contadorDescricao.textContent = campoDescricao.value.length;
  contadorDetalhada.textContent = campoDetalhada.value.length;

  campoDescricao.addEventListener("input", () => {
    contadorDescricao.textContent = campoDescricao.value.length;
  });

  campoDetalhada.addEventListener("input", () => {
    contadorDetalhada.textContent = campoDetalhada.value.length;
  });

  function showFeedback(message, isSuccess = false) {
    if (isSuccess) {
      successElement.textContent = message;
      successElement.classList.remove("d-none");
      errorElement.classList.add("d-none");
    } else {
      errorElement.textContent = message;
      errorElement.classList.remove("d-none");
      successElement.classList.add("d-none");
    }

    setTimeout(() => {
      errorElement.classList.add("d-none");
      successElement.classList.add("d-none");
    }, 5000);
  }

  // Função para formatar preço para o banco de dados (DECIMAL(10,2))
  function formatPriceForDB(value) {
    if (!value) return "0.00";
    const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(cleaned).toFixed(2);
  }

  // Função para exibição do preço formatado (R$ 0,00)
  function formatPriceForDisplay(value) {
    if (!value) return "0,00";
    return parseFloat(value).toFixed(2).replace(".", ",");
  }

  // Máscara de preço para campos de entrada
  function applyPriceMask(event) {
    const input = event.target;
    let value = input.value.replace(/\D/g, "");
    
    // Adiciona zeros à esquerda se necessário
    while (value.length < 3) {
      value = "0" + value;
    }
    
    // Formata como centavos
    const formatted = (parseInt(value) / 100).toFixed(2);
    input.value = formatted.replace(".", ",");
  }

  const atualizarPreVisualizacao = () => {
    const nome = document.getElementById("nome-produto").value || "Nome do produto";
    const descricao = document.getElementById("descricao-curta").value || "Descrição curta";
    const preco = document.getElementById("preco").value
      ? `R$ ${formatPriceForDisplay(document.getElementById("preco").value)}`
      : "R$ 0,00";
    const ativo = document.getElementById("produto-ativo").checked;
    const promocao = document.getElementById("promocao").checked;

    document.getElementById("preview-nome").textContent = nome;
    document.getElementById("preview-descricao").textContent = descricao;
    document.getElementById("preview-preco").textContent = preco;
    document.getElementById("badge-ativo").style.display = ativo ? "inline-block" : "none";
    document.getElementById("badge-promocao").classList.toggle("d-none", !promocao);
    document.getElementById("preco-promocional-div").classList.toggle("d-none", !promocao);

    const urlPreview = imagemUrl1.value.trim();
    if (urlPreview) {
      document.getElementById("imagem-preview").src = urlPreview;
    } else {
      document.getElementById("imagem-preview").src = "../img/imagem-nao-disponivel.png";
    }
  };

  // Validação de URLs de imagem
  function validateImageUrls(urls) {
    if (urls.length === 0) {
      return { valid: false, message: "Por favor, forneça pelo menos uma URL de imagem." };
    }

    const extensaoValida = (url) => /\.(jpe?g|png|gif|bmp|webp|svg|avif)$/i.test(url);
    
    for (const url of urls) {
      if (!extensaoValida(url)) {
        return { 
          valid: false, 
          message: "As URLs de imagem devem ter extensões suportadas (jpg, png, gif, bmp, webp, svg, avif)." 
        };
      }
    }
    
    return { valid: true };
  }

  // Toggle do campo de preço promocional
  document.getElementById("promocao").addEventListener("change", function() {
    const promoDiv = document.getElementById("preco-promocional-div");
    if (this.checked) {
      promoDiv.classList.remove("d-none");
    } else {
      promoDiv.classList.add("d-none");
    }
    atualizarPreVisualizacao();
  });

  formulario.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!formulario.checkValidity()) {
      event.stopPropagation();
      formulario.classList.add("was-validated");
      showFeedback("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    try {
      // Mostra o spinner e desabilita o botão
      btnSpinner.classList.remove("d-none");
      btnSubmitText.classList.add("d-none");
      btnSubmit.disabled = true;

      const urlsImagem = [
        imagemUrl1.value.trim(),
        imagemUrl2.value.trim(),
      ].filter(url => url !== "");

      const validation = validateImageUrls(urlsImagem);
      if (!validation.valid) {
        showFeedback(validation.message);
        return;
      }

     // Preparar dados para envio
const dados = {
  nome: document.getElementById("nome-produto").value,
  descricao: document.getElementById("descricao-detalhada").value,
  descricao_curta: document.getElementById("descricao-curta").value,
  preco: formatPriceForDB(document.getElementById("preco").value),
  preco_promocional: document.getElementById("promocao").checked 
    ? formatPriceForDB(document.getElementById("preco-promocional").value)
    : "0.00",
  promocao: document.getElementById("promocao").checked,
  marca: document.getElementById("marca-produto").value || "Geral",
  avaliacao: document.getElementById("avaliacao").value || "0.00",
  quantidade_avaliacoes: document.getElementById("quantidade-avaliacoes").value || 0,
  estoque: document.getElementById("estoque").value || 0,
  parcelas_permitidas: document.getElementById("parcelas").value || 1,
  peso_kg: document.getElementById("peso").value || "0.000",
  dimensoes: document.getElementById("dimensoes").value || "0X0X0",
  ativo: document.getElementById("produto-ativo").checked,
  imagem_1: urlsImagem[0] || "https://www.malhariapradense.com.br/wp-content/uploads/2017/08/produto-sem-imagem.png",
  imagem_2: urlsImagem[1] || "Nenhuma",
  categoria: document.getElementById("categoria").value
};

      const response = await fetch(`${api.online}/cadastro-produto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("Sucesso:", data);
      showFeedback("Produto cadastrado com sucesso!", true);

      formulario.reset();
      formulario.classList.remove("was-validated");
      atualizarPreVisualizacao();
    } catch (error) {
      console.error("Falha no cadastro:", error);
      showFeedback(`Erro ao cadastrar: ${error.message}`);
    } finally {
      // Restaura o botão
      btnSpinner.classList.add("d-none");
      btnSubmitText.classList.remove("d-none");
      btnSubmit.disabled = false;
    }
  });

  // Adiciona máscaras aos campos de preço
  document.querySelectorAll("#preco, #preco-promocional").forEach((elemento) => {
    elemento.addEventListener("input", applyPriceMask);
    elemento.addEventListener("focus", applyPriceMask);
    elemento.addEventListener("blur", function() {
      if (!this.value) {
        this.value = "0,00";
      }
    });
  });

  // Atualiza previsualização quando campos mudam
  document.querySelectorAll(
    "#formulario-produto input, #formulario-produto textarea, #formulario-produto select"
  ).forEach((elemento) => {
    elemento.addEventListener("input", atualizarPreVisualizacao);
    elemento.addEventListener("change", atualizarPreVisualizacao);
  });

  // Inicializa a pré-visualização
  atualizarPreVisualizacao();
})();