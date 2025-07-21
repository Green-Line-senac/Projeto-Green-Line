import { showAlert } from "./frontendProdutoDetalhe.js";

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
      showAlert(
        "Nome inválido. Use apenas letras e espaços (até 30 caracteres).",
        "danger"
      );
      return false;
    }

    const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/;
    if (!phoneRegex.test(this.telefone)) {
      showAlert("Telefone inválido. Use o formato (XX) 9XXXX-XXXX.", "danger");
      return false;
    }

    const cpfRegex = /^(\d{3}\.){2}\d{3}-\d{2}$|^\d{11}$/;
    if (!cpfRegex.test(this.cpf)) {
      showAlert(
        "CPF inválido. Use o formato XXX.XXX.XXX-XX ou 11 dígitos.",
        "danger"
      );
      return false;
    }

    const passRegex = /^(?=.*[a-zA-ZÀ-ÿ])(?=.*\d).{5,}$/;
    if (!passRegex.test(this.senha)) {
      showAlert(
        "Senha inválida. Deve ter pelo menos 5 caracteres, 1 letra e 1 número.",
        "danger"
      );
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      showAlert("E-mail inválido.", "danger");
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
        showAlert(cpfResponse.mensagem, "danger");
        return;
      }

      // Verifica se o E-mail já está cadastrado
      const emailResponse = await this.verificarEmail(this.email);
      if (emailResponse.codigo === 1) {
        showAlert(emailResponse.mensagem, "danger");
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
        showAlert(data.message, "success"); 
      } else {
        showAlert(data.message || "Erro desconhecido", "danger");
      }
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      showAlert("Erro ao cadastrar. Tente novamente mais tarde.", "danger");
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
}
