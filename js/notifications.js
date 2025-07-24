// Sistema de Notificações Moderno - Green Line
class NotificationManager {
  constructor() {
    this.container = null;
    this.notifications = new Map();
    this.defaultDuration = 5000;
    this.maxNotifications = 5;
    this.init();
  }

  init() {
    // Criar container se não existir
    if (!document.getElementById('notifications-container')) {
      this.container = document.createElement('div');
      this.container.id = 'notifications-container';
      this.container.className = 'notifications-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('notifications-container');
    }
  }

  // Método principal para mostrar notificações
  show(options = {}) {
    const {
      type = 'info',
      title = '',
      message = '',
      duration = this.defaultDuration,
      actions = [],
      closable = true,
      progress = true,
      compact = false
    } = options;

    // Limitar número de notificações
    if (this.notifications.size >= this.maxNotifications) {
      const firstNotification = this.notifications.keys().next().value;
      this.hide(firstNotification);
    }

    const id = this.generateId();
    const notification = this.createNotification({
      id,
      type,
      title,
      message,
      actions,
      closable,
      progress,
      compact,
      duration
    });

    this.container.appendChild(notification);
    this.notifications.set(id, notification);

    // Animar entrada
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // Auto-hide se duration > 0
    if (duration > 0) {
      const timer = setTimeout(() => {
        this.hide(id);
      }, duration);

      notification.dataset.timer = timer;

      // Pausar timer no hover
      notification.addEventListener('mouseenter', () => {
        clearTimeout(timer);
        const progressBar = notification.querySelector('.notification-progress-bar');
        if (progressBar) {
          progressBar.style.animationPlayState = 'paused';
        }
      });

      notification.addEventListener('mouseleave', () => {
        const remainingTime = this.getRemainingTime(notification);
        if (remainingTime > 0) {
          const newTimer = setTimeout(() => {
            this.hide(id);
          }, remainingTime);
          notification.dataset.timer = newTimer;
          
          const progressBar = notification.querySelector('.notification-progress-bar');
          if (progressBar) {
            progressBar.style.animationPlayState = 'running';
          }
        }
      });
    }

    return id;
  }

  createNotification({ id, type, title, message, actions, closable, progress, compact, duration }) {
    const notification = document.createElement('div');
    notification.className = `notification ${type} ${compact ? 'compact' : ''}`;
    notification.dataset.id = id;
    notification.dataset.startTime = Date.now();
    notification.dataset.duration = duration;

    const icon = this.getIcon(type);
    
    notification.innerHTML = `
      <div class="notification-header">
        <h4 class="notification-title">
          <span class="notification-icon">${icon}</span>
          ${title || this.getDefaultTitle(type)}
        </h4>
        ${closable ? '<button class="notification-close" aria-label="Fechar">&times;</button>' : ''}
      </div>
      <div class="notification-content">
        ${Array.isArray(message) ? this.formatMessageList(message) : message}
      </div>
      ${actions.length > 0 ? this.createActions(actions) : ''}
      ${progress && duration > 0 ? `
        <div class="notification-progress">
          <div class="notification-progress-bar" style="animation: shrink ${duration}ms linear forwards;"></div>
        </div>
      ` : ''}
    `;

    // Event listeners
    if (closable) {
      const closeBtn = notification.querySelector('.notification-close');
      closeBtn.addEventListener('click', () => this.hide(id));
    }

    // Actions event listeners
    actions.forEach((action, index) => {
      const btn = notification.querySelector(`[data-action="${index}"]`);
      if (btn && action.handler) {
        btn.addEventListener('click', (e) => {
          action.handler(e, id);
          if (action.closeOnClick !== false) {
            this.hide(id);
          }
        });
      }
    });

    return notification;
  }

  hide(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    // Limpar timer se existir
    if (notification.dataset.timer) {
      clearTimeout(parseInt(notification.dataset.timer));
    }

    notification.classList.add('hide');
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(id);
    }, 400);
  }

  // Métodos de conveniência
  success(title, message, options = {}) {
    return this.show({
      type: 'success',
      title,
      message,
      ...options
    });
  }

  error(title, message, options = {}) {
    return this.show({
      type: 'error',
      title,
      message,
      duration: 0, // Erros não desaparecem automaticamente
      ...options
    });
  }

  warning(title, message, options = {}) {
    return this.show({
      type: 'warning',
      title,
      message,
      ...options
    });
  }

  info(title, message, options = {}) {
    return this.show({
      type: 'info',
      title,
      message,
      ...options
    });
  }

  // Notificação especial para erros de validação
  validationError(errors, options = {}) {
    const message = Array.isArray(errors) ? errors : [errors];
    return this.show({
      type: 'error',
      title: 'Erro de Validação',
      message: `<strong>Por favor, corrija os seguintes erros:</strong>${this.formatMessageList(message)}`,
      duration: 0,
      compact: false,
      ...options
    });
  }

  // Notificação de loading
  loading(title = 'Carregando...', message = 'Por favor, aguarde') {
    return this.show({
      type: 'loading',
      title,
      message,
      duration: 0,
      closable: false,
      progress: false
    });
  }

  // Métodos auxiliares
  generateId() {
    return 'notification-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
      loading: '⟳'
    };
    return icons[type] || icons.info;
  }

  getDefaultTitle(type) {
    const titles = {
      success: 'Sucesso',
      error: 'Erro',
      warning: 'Atenção',
      info: 'Informação',
      loading: 'Carregando'
    };
    return titles[type] || titles.info;
  }

  formatMessageList(messages) {
    if (!Array.isArray(messages)) return messages;
    return `<ul>${messages.map(msg => `<li>${msg}</li>`).join('')}</ul>`;
  }

  createActions(actions) {
    const actionsHtml = actions.map((action, index) => {
      const btnClass = action.type || 'secondary';
      return `<button class="notification-btn ${btnClass}" data-action="${index}">${action.text}</button>`;
    }).join('');

    return `<div class="notification-actions">${actionsHtml}</div>`;
  }

  getRemainingTime(notification) {
    const startTime = parseInt(notification.dataset.startTime);
    const duration = parseInt(notification.dataset.duration);
    const elapsed = Date.now() - startTime;
    return Math.max(0, duration - elapsed);
  }

  // Limpar todas as notificações
  clear() {
    this.notifications.forEach((notification, id) => {
      this.hide(id);
    });
  }

  // Shake animation para chamar atenção
  shake(id) {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.classList.add('shake');
      setTimeout(() => {
        notification.classList.remove('shake');
      }, 500);
    }
  }
}

// CSS para animação da barra de progresso
const style = document.createElement('style');
style.textContent = `
  @keyframes shrink {
    from { transform: scaleX(1); }
    to { transform: scaleX(0); }
  }
`;
document.head.appendChild(style);

// Instância global
const notifications = new NotificationManager();

// Funções de conveniência globais
function showNotification(options) {
  return notifications.show(options);
}

function showSuccess(title, message, options = {}) {
  return notifications.success(title, message, options);
}

function showError(title, message, options = {}) {
  return notifications.error(title, message, options);
}

function showWarning(title, message, options = {}) {
  return notifications.warning(title, message, options);
}

function showInfo(title, message, options = {}) {
  return notifications.info(title, message, options);
}

function showValidationError(errors, options = {}) {
  return notifications.validationError(errors, options);
}

function showLoading(title, message) {
  return notifications.loading(title, message);
}

function hideNotification(id) {
  notifications.hide(id);
}

function clearAllNotifications() {
  notifications.clear();
}

// Exportar para módulos se necessário
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NotificationManager,
    notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showValidationError,
    showLoading,
    hideNotification,
    clearAllNotifications
  };
}