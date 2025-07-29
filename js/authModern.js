// Funções para controlar mensagens nas telas de login e cadastro modernas

// Função para garantir que o valor seja uma string
function ensureString(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'object') {
        // Se for um objeto Error, pegar a mensagem
        if (value instanceof Error) {
            return value.message || 'Erro desconhecido';
        }
        // Se for um objeto com propriedade message
        if (value.message) {
            return String(value.message);
        }
        // Se for um objeto com propriedade error
        if (value.error) {
            return String(value.error);
        }
        // Tentar JSON.stringify como último recurso
        try {
            return JSON.stringify(value);
        } catch (e) {
            return 'Erro não identificado';
        }
    }
    // Para outros tipos, converter para string
    return String(value);
}

// Função para mostrar mensagem principal
function showMessage(message, type = 'error') {
    const messageElement = document.getElementById('mensagem-superior');
    if (messageElement) {
        // Se message é um elemento DOM, usar appendChild
        if (message instanceof HTMLElement) {
            messageElement.innerHTML = '';
            messageElement.appendChild(message);
        } else {
            const safeMessage = ensureString(message);
            messageElement.textContent = safeMessage;
        }
        messageElement.className = `message ${type} show`;
    }
}

// Função para esconder mensagem principal
function hideMessage() {
    const messageElement = document.getElementById('mensagem-superior');
    if (messageElement) {
        messageElement.className = 'message error';
        messageElement.textContent = '';
    }
}

// Função para mostrar mensagem de validação específica
function showValidationMessage(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        const safeMessage = ensureString(message);
        element.textContent = safeMessage;
        element.className = 'validation-message show';
    }
}

// Função para esconder mensagem de validação específica
function hideValidationMessage(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.className = 'validation-message';
        element.textContent = '';
    }
}

// Função para esconder todas as mensagens de validação
function hideAllValidationMessages() {
    const validationMessages = document.querySelectorAll('.validation-message');
    validationMessages.forEach(msg => {
        msg.className = 'validation-message';
        msg.textContent = '';
    });
}

// Função para limpar todos os campos do formulário
function clearForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
        form.reset();
        hideMessage();
        hideAllValidationMessages();
    }
}

// Função para adicionar loading ao botão com estilo moderno
function setButtonLoading(buttonId, loading = true, style = 'spinner-only') {
    const button = document.getElementById(buttonId);
    if (button) {
        if (loading) {
            // Salvar texto original
            if (!button.getAttribute('data-original-text')) {
                button.setAttribute('data-original-text', button.textContent);
            }

            button.disabled = true;
            button.classList.add('loading');

            // Diferentes estilos de loading
            switch (style) {
                case 'spinner-only':
                    button.innerHTML = `
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    `;
                    break;
                case 'text-only':
                    button.textContent = 'Processando...';
                    break;
                case 'spinner-text':
                    button.innerHTML = `
                        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Processando...
                    `;
                    break;
                default:
                    button.innerHTML = `
                        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    `;
            }
        } else {
            button.disabled = false;
            button.classList.remove('loading');

            // Restaurar texto original
            const originalText = button.getAttribute('data-original-text');
            if (originalText) {
                button.textContent = originalText;
                button.removeAttribute('data-original-text');
            } else {
                // Fallback para textos padrão
                if (buttonId === 'entrar-na-conta') {
                    button.textContent = 'Entrar na minha conta';
                } else if (buttonId === 'cadastrar-usuario') {
                    button.textContent = 'Criar minha conta';
                }
            }
        }
    }
}

// Função para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Função para validar CPF
function isValidCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;

    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;

    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;

    return true;
}

// Função para formatar CPF
function formatCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return cpf;
}

// Função para formatar telefone
function formatPhone(phone) {
    phone = phone.replace(/\D/g, '');
    phone = phone.replace(/(\d{2})(\d)/, '($1) $2');
    phone = phone.replace(/(\d{5})(\d)/, '$1-$2');
    return phone;
}

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function () {
    // Esconder todas as mensagens ao carregar a página
    hideMessage();
    hideAllValidationMessages();

    // Adicionar formatação automática aos campos
    const cpfField = document.getElementById('cpf');
    if (cpfField) {
        cpfField.addEventListener('input', function (e) {
            e.target.value = formatCPF(e.target.value);
        });
    }

    const phoneField = document.getElementById('telefone');
    if (phoneField) {
        phoneField.addEventListener('input', function (e) {
            e.target.value = formatPhone(e.target.value);
        });
    }

    // Limpar mensagens de erro quando o usuário começar a digitar
    const inputs = document.querySelectorAll('.modern-input');
    inputs.forEach(input => {
        input.addEventListener('input', function () {
            hideMessage();
            // Esconder mensagem de validação específica se existir
            const fieldName = this.id;
            if (fieldName === 'cpf') {
                hideValidationMessage('cpfCadastrado');
            } else if (fieldName === 'email') {
                hideValidationMessage('emailCadastrado');
            }
        });
    });
});

// Exportar funções para uso global
window.authModern = {
    showMessage,
    hideMessage,
    showValidationMessage,
    hideValidationMessage,
    hideAllValidationMessages,
    clearForm,
    setButtonLoading,
    isValidEmail,
    isValidCPF,
    formatCPF,
    formatPhone
};