(function () {
    const api = {
        online: "https://green-line-web.onrender.com",
        cadastro_produto: "http://localhost:3005"
    }

    'use strict';
    const formulario = document.getElementById('formulario-produto');
    const campoDescricao = document.getElementById('descricao-curta');
    const contadorDescricao = document.getElementById('contador-descricao');
    const campoDetalhada = document.getElementById('descricao-detalhada');
    const contadorDetalhada = document.getElementById('contador-detalhada');
    const imagemUrl1 = document.getElementById('url-imagem-1');
    const imagemUrl2 = document.getElementById('url-imagem-2');
    const errorElement = document.getElementById('error-message');
    const successElement = document.getElementById('success-message');

    // Inicializa contadores
    contadorDescricao.textContent = campoDescricao.value.length;
    contadorDetalhada.textContent = campoDetalhada.value.length;

    campoDescricao.addEventListener('input', () => {
        contadorDescricao.textContent = campoDescricao.value.length;
    });

    campoDetalhada.addEventListener('input', () => {
        contadorDetalhada.textContent = campoDetalhada.value.length;
    });

    function showFeedback(message, isSuccess = false) {
        if (isSuccess) {
            successElement.textContent = message;
            successElement.style.display = 'block';
            errorElement.style.display = 'none';
        } else {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            successElement.style.display = 'none';
        }

        setTimeout(() => {
            errorElement.style.display = 'none';
            successElement.style.display = 'none';
        }, 5000);
    }

    function formatPrice(value) {
        if (!value) return '0,00';
        return parseFloat(value.replace(',', '.'))
            .toFixed(2)
            .replace('.', ',');
    }

    const atualizarPreVisualizacao = () => {
        const nome = document.getElementById('nome-produto').value || 'Nome do produto';
        const descricao = document.getElementById('descricao-curta').value || 'Descrição curta';
        const preco = document.getElementById('preco').value
            ? `R$ ${formatPrice(document.getElementById('preco').value)}`
            : 'R$ 0,00';
        const ativo = document.getElementById('produto-ativo').checked;
        const promocao = document.getElementById('promocao').checked;

        document.getElementById('preview-nome').textContent = nome;
        document.getElementById('preview-descricao').textContent = descricao;
        document.getElementById('preview-preco').textContent = preco;
        document.getElementById('badge-ativo').style.display = ativo ? 'inline-block' : 'none';
        document.getElementById('badge-promocao').classList.toggle('d-none', !promocao);
        document.getElementById('preco-promocional-div').classList.toggle('d-none', !promocao);

        const urlPreview = imagemUrl1.value.trim();
        if (urlPreview) {
            document.getElementById('imagem-preview').src = urlPreview;
        }
    };

    formulario.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!formulario.checkValidity()) {
            event.stopPropagation();
            formulario.classList.add('was-validated');
            showFeedback('Por favor, preencha todos os campos obrigatórios');
            return;
        }

        try {
            const submitButton = formulario.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';

            const urlsImagem = [
                imagemUrl1.value.trim(),
                imagemUrl2.value.trim()
            ].filter(url => url !== '');

            if (urlsImagem.length === 0) {
                throw new Error('Por favor, informe pelo menos uma URL de imagem válida.');
            }

            const extensaoValida = url => /\.(jpe?g|png)$/i.test(url);
            for (const url of urlsImagem) {
                if (!extensaoValida(url)) {
                    throw new Error(`URL inválida: ${url}. Use apenas imagens .jpg, .jpeg ou .png`);
                }
            }

            const dados = {
                nome: document.getElementById('nome-produto').value,
                marca: document.getElementById('marca-produto').value,
                descricao_curta: document.getElementById('descricao-curta').value,
                descricao_detalhada: document.getElementById('descricao-detalhada').value,
                categoria: document.getElementById('categoria').value,
                promocao: document.getElementById('promocao').checked || false,
                estoque: document.getElementById('estoque').value || 0,
                peso: document.getElementById('peso').value || 0,
                dimensoes: document.getElementById('dimensoes').value || "0x0x0",
                preco: document.getElementById('preco').value || 0,
                preco_promocional: document.getElementById('preco-promocional').value || 0,
                ativo: document.getElementById('produto-ativo').checked || true,
                parcelas: document.getElementById('parcelas').value || 1,
                avaliacao: document.getElementById('avaliacao').value || 0,
                quantidade_avaliacao: document.getElementById('quantidade-avaliacoes').value || 0,
                imagem_1: urlsImagem[0] || null,
                imagem_2: urlsImagem[1] || null
            };

            const response = await fetch(`${api.cadastro_produto}/cadastro-produto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            console.log('Sucesso:', data);
            showFeedback('Produto cadastrado com sucesso!', true);

            formulario.reset();
            formulario.classList.remove('was-validated');
            atualizarPreVisualizacao();

        } catch (error) {
            console.error('Falha no cadastro:', error);
            showFeedback(`Erro ao cadastrar: ${error.message}`);
        } finally {
            const submitButton = formulario.querySelector('button[type="submit"]');
            submitButton.disabled = false;
            submitButton.textContent = 'Cadastrar Produto';
            formulario.classList.add('was-validated');
        }
    });

    document.querySelectorAll('#formulario-produto input, #formulario-produto textarea, #formulario-produto select')
        .forEach(elemento => {
            elemento.addEventListener('input', atualizarPreVisualizacao);
            elemento.addEventListener('change', atualizarPreVisualizacao);
        });

    document.querySelectorAll('#preco, #preco-promocional').forEach(elemento => {
        elemento.addEventListener('input', function () {
            let valor = this.value.replace(/\D/g, '');
            valor = (valor / 100).toFixed(2).replace('.', ',');
            this.value = valor;
        });
    });

})();
