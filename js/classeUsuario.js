import { showAlert } from "./frontendProdutoDetalhe.js";

// Função para mostrar mensagens no sistema moderno
function showModernMessage(message, type = 'error') {
  if (window.authModern) {
    window.authModern.showMessage(message, type);
  } else {
    showAlert(message, type === 'error' ? 'danger' : type);
  }
}

const api = {
  online: "https://green-line-web.onrender.com",
  cadastro: "http://localhost:3000",
};

export class Usuario {
  constructor(nome, email, telefone, cpf, senha) {
    this.nome = nome;
    this.email = email;
    this.telefone = telefone;
    this.cpf = cpf;
    this.senha = senha;
  }

  validarDados() {
    const nameRegex = /^[a-zA-ZÀ-ÿ\s']{1,30}$/;
    if (!nameRegex.test(this.nome)) {
      showModernMessage(
        "Nome inválido. Use apenas letras e espaços (até 30 caracteres).",
        "error"
      );
      return false;
    }

    const phoneRegex = /^\(?(\d{2})\)?\s?(\d{4,5})-?(\d{4})$/;
    if (!phoneRegex.test(this.telefone)) {
      showModernMessage(
        "Telefone inválido. Use o formato (XX) 9XXXX-XXXX ou XX9XXXXXXXX.",
        "error"
      );
      return false;
    }

    // CPF regex: XXX.XXX.XXX-XX or XXXXXXXXXXX (11 digits)
    const cpfRegex = /^(\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{11})$/;
    if (!cpfRegex.test(this.cpf)) {
      showModernMessage(
        "CPF inválido. Use o formato XXX.XXX.XXX-XX ou XXXXXXXXXXX.",
        "error"
      );
      return false;
    }

    const passRegex = /^(?=.*[a-zA-ZÀ-ÿ])(?=.*\d).{5,}$/;
    if (!passRegex.test(this.senha)) {
      showModernMessage(
        "Senha inválida. Deve ter pelo menos 5 caracteres, 1 letra e 1 número.",
        "error"
      );
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      showModernMessage("E-mail inválido.", "error");
      return false;
    }

    return true;
  }

  async salvarUsuario() {
    // Valida os dados antes de salvar
    if (!this.validarDados()) {
      return; // Se a validação falhar, não continua
    }

    try {
      // Verifica se o CPF já está cadastrado
      const cpfResponse = await this.verificarCPF(this.cpf);
      if (cpfResponse.codigo === 1) {
        if (window.authModern) {
          window.authModern.showValidationMessage('cpfCadastrado', 'CPF já cadastrado.');
        } else {
          showAlert(cpfResponse.mensagem, "danger");
        }
        return;
      }

      // Verifica se o E-mail já está cadastrado
      const emailResponse = await this.verificarEmail(this.email);
      if (emailResponse.codigo === 1) {
        if (window.authModern) {
          window.authModern.showValidationMessage('emailCadastrado', 'E-mail já cadastrado.');
        } else {
          showAlert(emailResponse.mensagem, "danger");
        }
        return;
      }

      // Envia os dados para a API
      const response = await fetch(`${api.online}/cadastrarUsuario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: this.nome,
          email: this.email,
          telefone: this.telefone,
          cpf: this.cpf,
          senha: this.senha,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Mostrar mensagem de sucesso com instruções de confirmação
        const mensagemConfirmacao = `
          <div style="text-align: center;">
            <h4 style="color: #28a745; margin-bottom: 15px;">🎉 Conta criada com sucesso!</h4>
            <p style="margin-bottom: 10px;">Enviamos um email de confirmação para:</p>
            <p style="font-weight: bold; color: #28a745; margin-bottom: 15px;">${this.email}</p>
            <p style="margin-bottom: 10px;">📧 Verifique sua caixa de entrada e clique no link de confirmação para ativar sua conta.</p>
            <p style="font-size: 0.9rem; color: #6c757d; margin-bottom: 15px;">Não encontrou o email? Verifique a pasta de spam.</p>
            <div style="background: #e8f5e8; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
              <p style="margin: 0; font-size: 0.9rem;">⏰ Você será redirecionado para o login em <span id="countdown">10</span> segundos</p>
            </div>
          </div>
        `;
        
        showModernMessage(mensagemConfirmacao, "success");
        
        // Limpar formulário
        if (window.authModern) {
          window.authModern.clearForm('formularioCadastro');
        }
        
        // Iniciar contagem regressiva e redirecionamento
        this.iniciarRedirecionamento();
        
      } else {
        showModernMessage(data.message || "Erro desconhecido", "error");
      }
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      showModernMessage("Erro ao cadastrar. Tente novamente mais tarde.", "error");
    }
  }

  async verificarCPF(cpf) {
    try {
      const response = await fetch(`${api.online}/verificarCPF?cpf=${cpf}`);
      return await response.json();
    } catch (error) {
      console.error("Erro ao verificar CPF:", error);
      return { codigo: 1, mensagem: "Erro ao verificar CPF." };
    }
  }

  async verificarEmail(email) {
    try {
      const response = await fetch(
        `${api.online}/verificarEmail?email=${email}`
      );
      return await response.json();
    } catch (error) {
      console.error("Erro ao verificar e-mail:", error);
      return { codigo: 1, mensagem: "Erro ao verificar e-mail." };
    }
  }

  // Função para iniciar contagem regressiva e redirecionamento
  iniciarRedirecionamento() {
    let contador = 10;
    
    // Atualizar contador a cada segundo
    const intervalo = setInterval(() => {
      const elementoContador = document.getElementById('countdown');
      if (elementoContador) {
        elementoContador.textContent = contador;
      }
      
      contador--;
      
      // Quando chegar a 0, redirecionar
      if (contador < 0) {
        clearInterval(intervalo);
        this.redirecionarParaLogin();
      }
    }, 1000);
    
    // Permitir que o usuário cancele o redirecionamento clicando em qualquer lugar
    const cancelarRedirecionamento = () => {
      clearInterval(intervalo);
      document.removeEventListener('click', cancelarRedirecionamento);
      
      // Atualizar mensagem para mostrar que foi cancelado
      if (window.authModern) {
        const mensagemCancelada = `
          <div style="text-align: center;">
            <h4 style="color: #28a745; margin-bottom: 15px;">🎉 Conta criada com sucesso!</h4>
            <p style="margin-bottom: 10px;">Enviamos um email de confirmação para:</p>
            <p style="font-weight: bold; color: #28a745; margin-bottom: 15px;">${this.email}</p>
            <p style="margin-bottom: 10px;">📧 Verifique sua caixa de entrada e clique no link de confirmação para ativar sua conta.</p>
            <p style="font-size: 0.9rem; color: #6c757d; margin-bottom: 15px;">Não encontrou o email? Verifique a pasta de spam.</p>
            <div style="background: #fff3cd; padding: 10px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #ffeaa7;">
              <p style="margin: 0; font-size: 0.9rem; color: #856404;">⏸️ Redirecionamento cancelado. <a href="login.html" style="color: #28a745; text-decoration: underline;">Clique aqui para ir ao login</a></p>
            </div>
          </div>
        `;
        window.authModern.showMessage(mensagemCancelada, "success");
      }
    };
    
    // Adicionar listener para cancelar redirecionamento
    setTimeout(() => {
      document.addEventListener('click', cancelarRedirecionamento, { once: true });
    }, 1000); // Aguardar 1 segundo antes de permitir cancelamento
  }

  // Função para redirecionar para a página de login
  redirecionarParaLogin() {
    // Mostrar mensagem final antes do redirecionamento
    if (window.authModern) {
      window.authModern.showMessage('Redirecionando para o login...', 'success');
    }
    
    // Redirecionar após um breve delay
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 500);
  }
}
