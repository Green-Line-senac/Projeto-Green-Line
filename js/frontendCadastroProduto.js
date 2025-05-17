// IIFE cria um escopo isolado, evitando que variáveis e funções internas vazem para o escopo global (window).
(function () {
    'use strict';
    const formulario = document.getElementById('formulario-produto');
    const campoDescricao = document.getElementById('descricao-curta');
    const contadorDescricao = document.getElementById('contador-descricao');
    const campoDetalhada = document.getElementById('descricao-detalhada');
    const contadorDetalhada = document.getElementById('contador-detalhada');

    campoDescricao.addEventListener('input', () => {
        contadorDescricao.textContent = campoDescricao.value.length;
    });

    campoDetalhada.addEventListener('input', () => {
        contadorDetalhada.textContent = campoDetalhada.value.length;
    });
    async function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]); // Remove o prefixo
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    formulario.addEventListener('submit', async (event) => {
        event.preventDefault(); // Adicionei isso para evitar recarregamento da página

        if (!formulario.checkValidity()) {
            event.stopPropagation();
            formulario.classList.add('was-validated');
            return;
        }

        try {
            let imagens = document.getElementById('imagens-produto').files;

            // Converter apenas as imagens selecionadas
            const imagensBase64 = await Promise.all(
                Array.from(imagens).slice(0, 3).map(file => fileToBase64(file))
            );

            let dados = {
                nome: document.getElementById('nome-produto').value,
                marca: document.getElementById('marca-produto').value,
                descricao_curta: document.getElementById('descricao-curta').value,
                descricao_detalhada: document.getElementById('descricao-detalhada').value,
                categoria: document.getElementById('categoria').value,
                promocao: document.getElementById('promocao').checked,
                estoque: document.getElementById('estoque').value,
                peso: document.getElementById('peso').value || 0,
                dimensoes: document.getElementById('dimensoes').value || "0x0x0",
                preco: document.getElementById('preco').value || 0,
                preco_promocional: document.getElementById('preco-promocional').value || 0,
                ativo: document.getElementById('produto-ativo').checked,
                parcelas: document.getElementById('parcelas').value,
                avaliacao: document.getElementById('avaliacao').value,
                quantidade_avaliacao: document.getElementById('quantidade-avaliacoes').value,
                imagem_1: imagensBase64[0] || null,
                imagem_2: imagensBase64[1] || null,
                imagem_3: imagensBase64[2] || null
            };

            const response = await fetch('http://localhost:3004/cadastro-produto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();
            console.log('Sucesso:', data);

            // Resetar formulário apenas se a requisição foi bem sucedida
            formulario.reset();

        } catch (error) {
            console.error('Falha:', error);
            // Mostrar erro para o usuário (exemplo com Bootstrap)
            const errorElement = document.getElementById('error-message');
            if (errorElement) {
                errorElement.textContent = `Erro ao cadastrar: ${error.message}`;
                errorElement.style.display = 'block';
            }
        } finally {
            formulario.classList.add('was-validated');
        }
    });

    const atualizarPreVisualizacao = () => {
        const nome = document.getElementById('nome-produto').value || 'Nome do produto';
        const descricao = document.getElementById('descricao-curta').value || 'Descrição curta';
        const preco = document.getElementById('preco').value
            ? `R$ ${parseFloat(document.getElementById('preco').value.replace(',', '.')).toFixed(2).replace('.', ',')}`
            : 'R$ 0,00';
        const ativo = document.getElementById('produto-ativo').checked; //verdadeiro ou falso
        const promocao = document.getElementById('promocao').checked;

        document.getElementById('preview-nome').textContent = nome;
        document.getElementById('preview-descricao').textContent = descricao;
        document.getElementById('preview-preco').textContent = preco;
        /*
        if (promocao) {
            document.getElementById('badge-promocao').classList.remove('d-none');
        } else {
            document.getElementById('badge-promocao').classList.add('d-none');
        }
        */
        document.getElementById('badge-ativo').style.display = ativo ? 'inline-block' : 'none'; //true ou false
        document.getElementById('badge-promocao').classList.toggle('d-none', !promocao);
        document.getElementById('preco-promocional-div').classList.toggle('d-none', !promocao);

        const arquivoImagem = document.getElementById('imagens-produto');
        if (arquivoImagem.files && arquivoImagem.files[0]) {
            const leitor = new FileReader();
            //aqui define-se o que irá acontecer quando terminar a leitura de um arquivo. Quando o readAsDataURL terminar de ler, automaticamente o onload será ativado
            leitor.onload = function (e) {
                document.getElementById('imagem-preview').src = e.target.result; //vem do evento de carregamento (onload) 
            };
            leitor.readAsDataURL(arquivoImagem.files[0]);
        }
    };

    document.querySelectorAll('#formulario-produto input, #formulario-produto textarea, #formulario-produto select')
        .forEach(elemento => {
            elemento.addEventListener('input', atualizarPreVisualizacao);
            elemento.addEventListener('change', atualizarPreVisualizacao);
        });

    document.querySelectorAll('#preco, #preco-promocional').forEach(elemento => {
        elemento.addEventListener('input', function () {
            let valor = this.value.replace(/\D/g, ''); // Remove caracteres não numéricos
            valor = (valor / 100).toFixed(2).replace('.', ','); // Converte para formato decimal brasileiro
            this.value = valor; // Define o valor formatado de volta no input
        });
    });
    contadorDescricao.textContent = campoDescricao.value.length;
    contadorDetalhada.textContent = campoDetalhada.value.length;
})();
