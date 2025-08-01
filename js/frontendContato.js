// Sistema de Contato - GreenLine
class ContatoManager {
  constructor() {
    this.api = {
      online: "https://green-line-web.onrender.com",
      local: "http://localhost:3010"
    };
    
    this.form = document.getElementById('formContato');
    this.btnEnviar = document.querySelector('.btn-primary');
    this.originalBtnText = this.btnEnviar?.textContent || 'Enviar Mensagem';
    
    this.init();
  }

  init() {
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleSubmit(e));
      this.setupValidation();
      this.setupNotificationSystem();
    }
  }

  setupNotificationSystem() {
    // Criar container de notificações se não existir
    if (!document.getElementById('notification-container')) {
      const container = document.createElement('div');
      container.id = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
      `;
      document.body.appendChild(container);
    }
  }

  showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    
    const bgColor = type === 'success' ? '#d4edda' : '#f8d7da';
    const borderColor = type === 'success' ? '#c3e6cb' : '#f5c6cb';
    const textColor = type === 'success' ? '#155724' : '#721c24';
    const icon = type === 'success' ? '✅' : '❌';
    
    notification.style.cssText = `
      background-color: ${bgColor};
      border: 1px solid ${borderColor};
      color: ${textColor};
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
      position: relative;
      font-family: 'Inter', sans-serif;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 18px;">${icon}</span>
        <div style="flex: 1;">
          ${message}
        </div>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; font-size: 18px; cursor: pointer; color: ${textColor}; opacity: 0.7;">
          ×
        </button>
      </div>
    `;
    
    // Adicionar animação CSS se não existir
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    container.appendChild(notification);
    
    // Auto remover após 5 segundos
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  setupValidation() {
    const nomeInput = document.getElementById('nome');
    const emailInput = document.getElementById('email');
    const assuntoInput = document.getElementById('assunto');

    // Validação do nome
    if (nomeInput) {
      nomeInput.addEventListener('input', () => this.validaNome());
      nomeInput.addEventListener('blur', () => this.validaNome());
    }

    // Validação do email
    if (emailInput) {
      emailInput.addEventListener('input', () => this.validaEmail());
      emailInput.addEventListener('blur', () => this.validaEmail());
    }

    // Validação do assunto
    if (assuntoInput) {
      assuntoInput.addEventListener('input', () => this.validaAssunto());
      assuntoInput.addEventListener('blur', () => this.validaAssunto());
    }
  }

  validaNome() {
    const nomeInput = document.getElementById('nome');
    const nome = nomeInput?.value.trim();
    
    if (!nome) {
      this.setFieldError(nomeInput, 'Nome é obrigatório');
      return false;
    }
    
    if (nome.length < 2) {
      this.setFieldError(nomeInput, 'Nome deve ter pelo menos 2 caracteres');
      return false;
    }
    
    if (nome.length > 50) {
      this.setFieldError(nomeInput, 'Nome deve ter no máximo 50 caracteres');
      return false;
    }
    
    // Permitir apenas letras, espaços e acentos
    const nomeRegex = /^[a-zA-ZÀ-ÿ\s']+$/;
    if (!nomeRegex.test(nome)) {
      this.setFieldError(nomeInput, 'Nome deve conter apenas letras');
      return false;
    }
    
    this.setFieldSuccess(nomeInput);
    return true;
  }

  validaEmail() {
    const emailInput = document.getElementById('email');
    const email = emailInput?.value.trim();
    
    if (!email) {
      this.setFieldError(emailInput, 'Email é obrigatório');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.setFieldError(emailInput, 'Email inválido');
      return false;
    }
    
    this.setFieldSuccess(emailInput);
    return true;
  }

  validaAssunto() {
    const assuntoInput = document.getElementById('assunto');
    const assunto = assuntoInput?.value.trim();
    
    if (!assunto) {
      this.setFieldError(assuntoInput, 'Mensagem é obrigatória');
      return false;
    }
    
    if (assunto.length < 10) {
      this.setFieldError(assuntoInput, 'Mensagem deve ter pelo menos 10 caracteres');
      return false;
    }
    
    if (assunto.length > 1000) {
      this.setFieldError(assuntoInput, 'Mensagem deve ter no máximo 1000 caracteres');
      return false;
    }
    
    this.setFieldSuccess(assuntoInput);
    return true;
  }

  setFieldError(field, message) {
    if (!field) return;
    
    field.classList.remove('is-valid');
    field.classList.add('is-invalid');
    
    // Remover mensagem anterior
    const existingFeedback = field.parentElement.querySelector('.invalid-feedback');
    if (existingFeedback) {
      existingFeedback.remove();
    }
    
    // Adicionar nova mensagem
    const feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    feedback.textContent = message;
    field.parentElement.appendChild(feedback);
  }

  setFieldSuccess(field) {
    if (!field) return;
    
    field.classList.remove('is-invalid');
    field.classList.add('is-valid');
    
    // Remover mensagem de erro
    const existingFeedback = field.parentElement.querySelector('.invalid-feedback');
    if (existingFeedback) {
      existingFeedback.remove();
    }
  }

  async handleSubmit(e) {
    e.preventDefault();
    
    // Validar todos os campos
    const nomeValido = this.validaNome();
    const emailValido = this.validaEmail();
    const assuntoValido = this.validaAssunto();
    
    if (!nomeValido || !emailValido || !assuntoValido) {
      this.showNotification('Por favor, corrija os erros no formulário', 'error');
      return;
    }
    
    // Coletar dados do formulário
    const formData = {
      nome: document.getElementById('nome').value.trim(),
      email: document.getElementById('email').value.trim(),
      assunto: document.getElementById('assunto').value.trim(),
      tipo: 'contato',
      dataEnvio: new Date().toISOString()
    };
    
    try {
      await this.enviarMensagem(formData);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      this.showNotification('Erro ao enviar mensagem. Tente novamente mais tarde.', 'error');
    }
  }

  async enviarMensagem(dados) {
    // Mostrar loading
    this.setButtonLoading(true);
    
    try {
      const response = await fetch(`${this.api.online}/contato`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
      });
      
      const result = await response.json();
      
      if (response.ok && result.conclusao === 2) {
        this.showNotification(`
          <div>
            <strong>✅ Mensagem enviada com sucesso!</strong><br>
            <small>Recebemos sua mensagem e responderemos em breve no email: <strong>${dados.email}</strong></small>
          </div>
        `, 'success');
        
        // Limpar formulário
        this.form.reset();
        this.clearValidationStates();
        
      } else {
        throw new Error(result.mensagem || 'Erro ao enviar mensagem');
      }
      
    } catch (error) {
      console.error('Erro na requisição:', error);
      this.showNotification(`
        <div>
          <strong>❌ Erro ao enviar mensagem</strong><br>
          <small>${error.message || 'Tente novamente mais tarde'}</small>
        </div>
      `, 'error');
    } finally {
      this.setButtonLoading(false);
    }
  }

  setButtonLoading(loading) {
    if (!this.btnEnviar) return;
    
    if (loading) {
      this.btnEnviar.disabled = true;
      this.btnEnviar.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Enviando...
      `;
    } else {
      this.btnEnviar.disabled = false;
      this.btnEnviar.textContent = this.originalBtnText;
    }
  }

  clearValidationStates() {
    const fields = ['nome', 'email', 'assunto'];
    fields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.classList.remove('is-valid', 'is-invalid');
        const feedback = field.parentElement.querySelector('.invalid-feedback');
        if (feedback) feedback.remove();
      }
    });
  }
}

// Funções globais para compatibilidade com o HTML existente
function validaNome() {
  return window.contatoManager?.validaNome() || false;
}

function validaAssunto() {
  return window.contatoManager?.validaAssunto() || false;
}

function enviar() {
  // Esta função é chamada pelo onclick do botão, mas o submit é tratado pelo event listener
  return false;
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  window.contatoManager = new ContatoManager();
});

// Adicionar estilos CSS para validação
const validationStyles = document.createElement('style');
validationStyles.textContent = `
  .form-control.is-valid {
    border-color: #198754;
    box-shadow: 0 0 0 0.2rem rgba(25, 135, 84, 0.25);
  }
  
  .form-control.is-invalid {
    border-color: #dc3545;
    box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
  }
  
  .invalid-feedback {
    display: block;
    width: 100%;
    margin-top: 0.25rem;
    font-size: 0.875em;
    color: #dc3545;
  }
  
  .spinner-border-sm {
    width: 1rem;
    height: 1rem;
  }
`;
document.head.appendChild(validationStyles);