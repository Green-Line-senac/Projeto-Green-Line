//CARROSEL
let imagensIndex = [];

function carregarImagens(imagem) {
  const carrossel = document.getElementById('carousel-imagens');
  const carousel_index = document.getElementById('carousel-index');

  // Limpa os contêineres antes de adicionar novos elementos
  carrossel.innerHTML = '';

  // Criação dinâmica dos indicadores
  const indicatorDiv = document.createElement('div');
  indicatorDiv.className = 'carousel-indicators';

  // Adiciona os botões indicadores dinamicamente
  imagem.forEach((_, index) => {
    const button = document.createElement('button');
    button.setAttribute('data-bs-target', '#carousel-index');
    button.setAttribute('data-bs-slide-to', index);
    button.className = index === 0 ? 'active' : '';
    indicatorDiv.appendChild(button);
  });

  carousel_index.appendChild(indicatorDiv);

  // Adiciona as imagens ao carrossel
  imagem.forEach((element, index) => {
    const itemDiv = document.createElement('div');
    itemDiv.className = `carousel-item ${index === 0 ? 'active' : ''}`;
    itemDiv.innerHTML = `
        <img src="/img/index_carousel/${element.nomeImagem}" height="400rem" class="d-block w-100" alt="Imagem do carrossel">
      `;
    carrossel.appendChild(itemDiv);
  });
}
//TROCAR DE LOGIN
document.addEventListener("DOMContentLoaded",()=>{
  console.log(trocarDeConta);
})

// Carrega as imagens dinamicamente a partir de um arquivo JSON
fetch('/json/carousel-index.json')
  .then(res => res.json())
  .then(data => {
    carregarImagens(data); // Renderiza as imagens ao carregar o JSON
  })
  .catch(err => {
    console.error('Erro ao carregar a API:', err);
    alert('Não foi possível carregar o carrossel. Tente novamente mais tarde.');
  });

fetch('json/carousel-index.json')
  .then(res => res.json())
  .then(data => {
    imagensIndex = data; // Atribui os dados recebidos à variável
    carregarImagens(imagensIndex); // Chama a função para renderizar as imagens
  })
  .catch(err => console.error('Erro ao carregar a API:', err));

async function atualizarConta(){
  
}