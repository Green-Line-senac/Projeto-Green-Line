// Variáveis globais
let imagensIndex = [];

// Função para carregar o carrossel
function carregarImagens(imagens) {
    const carrossel = document.getElementById('carousel-imagens');
    const carouselIndex = document.getElementById('carousel-index');

    // Limpa os contêineres
    carrossel.innerHTML = '';
    const indicators = document.querySelector('.carousel-indicators');
    if (indicators) indicators.remove();

    // Cria indicadores
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'carousel-indicators';

    imagens.forEach((_, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.bsTarget = '#carousel-index';
        button.dataset.bsSlideTo = index;
        button.className = index === 0 ? 'active' : '';
        indicatorDiv.appendChild(button);
    });

    carouselIndex.prepend(indicatorDiv);

    // Adiciona imagens
    imagens.forEach((img, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `carousel-item ${index === 0 ? 'active' : ''}`;
        itemDiv.innerHTML = `
            <img src="/img/index_carousel/${img.nomeImagem}" class="d-block w-100" style="height: 400px; object-fit: cover;" alt="${img.alt || 'Imagem do carrossel'}">
        `;
        carrossel.appendChild(itemDiv);
    });
}

// Verifica estado de login ao carregar a página
async function verificarEstadoLogin() {
    try {
        const resposta = await fetch('http://localhost:3002/loginDados');
        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);
        
        const dados = await resposta.json();
        console.log('Estado completo:', dados);

        if (dados.trocarDeConta == 1 || dados.trocar == 1) { // Verifica ambos os nomes possíveis
            const iconeUsuario = document.getElementById('icone-usuario');
            
            if (!iconeUsuario) {
                console.error('Elemento icone-usuario não encontrado!');
                return;
            }

            console.log('Elemento encontrado, atualizando...');
            iconeUsuario.className = "bi bi-person-square text-success";
            iconeUsuario.title = "Usuário autenticado";
            
            // Adicione isto para verificação visual imediata
            iconeUsuario.style.transition = "all 0.3s ease";
            iconeUsuario.style.fontSize = "1.2em";
        }
    } catch (erro) {
        console.error('Erro ao verificar login:', erro);
    }
}

// Carrega o carrossel e verifica o login quando a página carrega
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Carrega o carrossel
        const response = await fetch('/json/carousel-index.json');
        if (!response.ok) throw new Error('Falha ao carregar carrossel');
        
        const data = await response.json();
        imagensIndex = data;
        carregarImagens(imagensIndex);

        // Verifica o estado de login
        await verificarEstadoLogin();
    } catch (erro) {
        console.error('Erro ao inicializar página:', erro);
        alert('Alguns recursos podem não carregar corretamente. Recarregue a página.');
    }
});