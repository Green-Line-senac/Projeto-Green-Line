//CARROSEL
let imagensIndex = [];

function carregarImagens(imagem) {
    const carrossel = document.getElementById('carousel-imagens');
    imagem.forEach((element, index) => {
      const div = document.createElement('div');
      div.className = `carousel-item ${index === 0 ? 'active' : ''}`;
      div.innerHTML = `
        <img src="../img/index_carousel/${element.nomeImagem}" height="400rem" class="d-block w-100" alt="Imagem do carrossel">
      `;
      carrossel.appendChild(div);
    });
  }

fetch('../json/carousel-index.json')
    .then(res => res.json())
    .then(data => {
        imagensIndex = data; // Atribui os dados recebidos à variável
        carregarImagens(imagensIndex); // Chama a função para renderizar as imagens
    })
    .catch(err => console.error('Erro ao carregar a API:', err));