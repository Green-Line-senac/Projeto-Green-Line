// Utilitário para Templates de Email - Green Line
const fs = require('fs');
const path = require('path');

class EmailTemplateManager {
  constructor() {
    this.templatesPath = path.join(__dirname, '..', 'templates');
  }

  // Carregar template do arquivo
  loadTemplate(templateName) {
    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.html`);
      console.log(`Tentando carregar template: ${templatePath}`);
      const template = fs.readFileSync(templatePath, 'utf8');
      console.log(`Template ${templateName} carregado com sucesso, tamanho: ${template.length}`);
      return template;
    } catch (error) {
      console.error(`Erro ao carregar template ${templateName}:`, error.message);
      console.error(`Caminho tentado: ${path.join(this.templatesPath, `${templateName}.html`)}`);
      return null;
    }
  }

  // Substituir variáveis no template
  replaceVariables(template, variables) {
    let processedTemplate = template;
    
    // Substituir todas as variáveis fornecidas usando split/join
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const safeValue = String(value || '');
      processedTemplate = processedTemplate.split(placeholder).join(safeValue);
    }
    
    // Remover placeholders não substituídos
    processedTemplate = processedTemplate.replace(/\{\{[^}]+\}\}/g, '');
    
    return processedTemplate;
  }

  // Gerar email de confirmação
  generateConfirmationEmail(variables) {
    const template = this.loadTemplate('email-confirmacao');
    if (!template) return null;

    const defaultVariables = {
      NOME_USUARIO: 'Usuário',
      LINK_CONFIRMACAO: '#'
    };

    return this.replaceVariables(template, { ...defaultVariables, ...variables });
  }

  // Gerar email de reset de senha
  generatePasswordResetEmail(variables) {
    const template = this.loadTemplate('email-reset-senha');
    if (!template) return null;

    const defaultVariables = {
      NOME_USUARIO: 'Usuário',
      LINK_RESET: '#',
      DATA_SOLICITACAO: new Date().toLocaleString('pt-BR'),
      IP_USUARIO: 'Não disponível',
      USER_AGENT: 'Não disponível'
    };

    return this.replaceVariables(template, { ...defaultVariables, ...variables });
  }

  // Gerar email de pedido confirmado
  generateOrderConfirmationEmail(variables) {
    const template = this.loadTemplate('email-pedido-confirmado');
    if (!template) {
      console.error('❌ Template email-pedido-confirmado não encontrado!');
      return null;
    }

    const defaultVariables = {
      NOME_USUARIO: 'Usuário',
      NUMERO_PEDIDO: 'N/A',
      DATA_PEDIDO: new Date().toLocaleDateString('pt-BR'),
      METODO_PAGAMENTO: 'N/A',
      SUBTOTAL: '0,00',
      FRETE: '0,00',
      TOTAL: '0,00',
      METODO_ENTREGA: 'N/A',
      PREVISAO_ENTREGA: 'N/A',
      ENDERECO_ENTREGA: 'N/A',
      PRODUTOS_HTML: '<p>Nenhum produto encontrado.</p>'
    };

    const finalVariables = { ...defaultVariables, ...variables };
    return this.replaceVariables(template, finalVariables);
  }

  // Método genérico para qualquer template
  generateEmail(templateName, variables = {}) {
    const template = this.loadTemplate(templateName);
    if (!template) return null;

    return this.replaceVariables(template, variables);
  }
}

// Instância global
const emailTemplates = new EmailTemplateManager();

// Funções de conveniência
function getConfirmationEmailHTML(variables) {
  return emailTemplates.generateConfirmationEmail(variables);
}

function getPasswordResetEmailHTML(variables) {
  return emailTemplates.generatePasswordResetEmail(variables);
}

function getOrderConfirmationEmailHTML(variables) {
  return emailTemplates.generateOrderConfirmationEmail(variables);
}

function getCustomEmailHTML(templateName, variables) {
  return emailTemplates.generateEmail(templateName, variables);
}

module.exports = {
  EmailTemplateManager,
  emailTemplates,
  getConfirmationEmailHTML,
  getPasswordResetEmailHTML,
  getOrderConfirmationEmailHTML,
  getCustomEmailHTML
};