// Sistema de Loading para Green Line
class LoadingManager {
  constructor() {
    this.loadingElement = null;
    this.isVisible = false;
  }

  // Criar elemento de loading
  createLoadingElement(options = {}) {
    const {
      text = 'Carregando...',
      subtext = 'Por favor, aguarde',
      type = 'spinner',
      theme = 'success'
    } = options;

    const loadingHTML = `
      <div class="loading-overlay loading-${theme}" id="loadingOverlay">
        <div class="loading-container">
          ${type === 'spinner' ?
        '<div class="loading-spinner"></div>' :
        '<div class="loading-dots"><div></div><div></div><div></div><div></div></div>'
      }
          <div class="loading-text">${text}</div>
          <div class="loading-subtext">${subtext}</div>
        </div>
      </div>
    `;

    // Remove loading anterior se existir
    this.hide();

    // Adiciona novo loading
    document.body.insertAdjacentHTML('beforeend', loadingHTML);
    this.loadingElement = document.getElementById('loadingOverlay');
    this.isVisible = true;

    return this.loadingElement;
  }

  // Mostrar loading
  show(options = {}) {
    if (this.isVisible) return;

    this.createLoadingElement(options);

    // Adiciona animação de entrada
    requestAnimationFrame(() => {
      if (this.loadingElement) {
        this.loadingElement.style.opacity = '0';
        this.loadingElement.style.transition = 'opacity 0.3s ease';
        requestAnimationFrame(() => {
          if (this.loadingElement) {
            this.loadingElement.style.opacity = '1';
          }
        });
      }
    });
  }

  // Esconder loading
  hide() {
    if (!this.isVisible || !this.loadingElement) return;

    this.loadingElement.style.opacity = '0';

    setTimeout(() => {
      if (this.loadingElement && this.loadingElement.parentNode) {
        this.loadingElement.parentNode.removeChild(this.loadingElement);
      }
      this.loadingElement = null;
      this.isVisible = false;
    }, 500);
  }

  // Loading para botões com opções de estilo
  showButtonLoading(buttonElement, originalText = null, style = 'spinner-only') {
    if (!buttonElement) return;

    if (!originalText) {
      originalText = buttonElement.textContent;
    }

    buttonElement.setAttribute('data-original-text', originalText);
    buttonElement.classList.add('btn-loading');
    buttonElement.disabled = true;

    // Diferentes estilos de loading
    switch (style) {
      case 'spinner-only':
        buttonElement.innerHTML = `
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        `;
        break;
      case 'text-only':
        buttonElement.textContent = 'Processando...';
        break;
      case 'spinner-text':
        buttonElement.innerHTML = `
          <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          Processando...
        `;
        break;
      default:
        buttonElement.innerHTML = `
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        `;
    }
  }

  // Remover loading do botão
  hideButtonLoading(buttonElement) {
    if (!buttonElement) return;

    const originalText = buttonElement.getAttribute('data-original-text');
    if (originalText) {
      buttonElement.textContent = originalText;
      buttonElement.removeAttribute('data-original-text');
    }

    buttonElement.classList.remove('btn-loading');
    buttonElement.disabled = false;
  }

  // Loading inline (para usar dentro de elementos)
  createInlineLoading(text = 'Carregando...') {
    return `
      <div class="loading-inline">
        <div class="spinner-small"></div>
        <span>${text}</span>
      </div>
    `;
  }

  // Wrapper para funções assíncronas
  async withLoading(asyncFunction, loadingOptions = {}) {
    try {
      this.show(loadingOptions);
      const result = await asyncFunction();
      return result;
    } catch (error) {
      throw error;
    } finally {
      this.hide();
    }
  }

  // Wrapper para requisições fetch
  async fetchWithLoading(url, options = {}, loadingOptions = {}) {
    const defaultLoadingOptions = {
      text: 'Conectando...',
      subtext: 'Aguarde enquanto processamos sua solicitação'
    };

    return this.withLoading(async () => {
      const response = await fetch(url, options);
      return response;
    }, { ...defaultLoadingOptions, ...loadingOptions });
  }
}

// Instância global do loading
const loading = new LoadingManager();

// Funções de conveniência
function showLoading(options = {}) {
  loading.show(options);
}

function hideLoading() {
  loading.hide();
}

function showButtonLoading(buttonId, originalText = null, style = 'spinner-only') {
  const button = typeof buttonId === 'string' ? document.getElementById(buttonId) : buttonId;
  loading.showButtonLoading(button, originalText, style);
}

function hideButtonLoading(buttonId) {
  const button = typeof buttonId === 'string' ? document.getElementById(buttonId) : buttonId;
  loading.hideButtonLoading(button);
}

// Exemplos de uso pré-definidos
const LoadingPresets = {
  login: {
    text: 'Fazendo login...',
    subtext: 'Verificando suas credenciais',
    type: 'spinner',
    theme: 'primary'
  },

  cadastro: {
    text: 'Criando conta...',
    subtext: 'Processando seus dados',
    type: 'dots',
    theme: 'success'
  },

  carregandoProdutos: {
    text: 'Carregando produtos...',
    subtext: 'Buscando os melhores produtos para você',
    type: 'spinner',
    theme: 'success'
  },

  processandoPagamento: {
    text: 'Processando pagamento...',
    subtext: 'Não feche esta página',
    type: 'dots',
    theme: 'warning'
  },

  salvandoDados: {
    text: 'Salvando...',
    subtext: 'Seus dados estão sendo salvos',
    type: 'spinner',
    theme: 'primary'
  }
};

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LoadingManager, loading, LoadingPresets };
}