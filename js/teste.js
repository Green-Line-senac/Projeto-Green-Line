import { showAlert } from "./frontendProdutoDetalhe.js";
const api = {
  online: "https://green-line-web.onrender.com",
  cadastro: "http://localhost:3000",
};

export class Usuario {
  constructor(nome, email, telefone, cpf, senha) {
    if (!nome || !email || !telefone || !cpf || !senha) {
      throw new Error("Todos os campos são obrigatórios.");
    }

    this.nome = nome;
    this.email = email;
    this.telefone = telefone;
    this.cpf = cpf;
    this.senha = senha;
  }

  validarDados() {
    const nameRegex = /^[a-zA-Z\s]{1,30}$/;
    if (!nameRegex.test(this.nome)) {
      throw new Error(
        "Nome inválido. Use apenas letras e espaços (até 30 caracteres)."
      );
    }

    const emailRegex = /^([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/;
    if (!emailRegex.test(this.email)) {
      throw new Error("E-mail inválido.");
    }

    const phoneRegex = /^\(\d{2}\)\s9\d{4}-\d{4}$/;
    if (!phoneRegex.test(this.telefone)) {
      throw new Error("Telefone inválido. Use o formato (XX) 9XXXX-XXXX.");
    }

    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;
    if (!cpfRegex.test(this.cpf)) {
      throw new Error(
        "CPF inválido. Use o formato XXX.XXX.XXX-XX ou 11 dígitos."
      );
    }

    const passRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!passRegex.test(this.senha)) {
      throw new Error(
        "Senha inválida. Deve ter pelo menos 8 caracteres, 1 letra e 1 número."
      );
    }

    return true;
  }

  async salvarUsuario() {
    try {
      // Valida os dados antes de salvar
      this.validarDados();

      // Verifica se o CPF já está cadastrado
      const cpfResponse = await this.verificarCPF(this.cpf);
      if (cpfResponse.codigo === 1) {
        showAlert(cpfResponse.mensagem, "danger");
        return;
      }
      const emailReponse = await this.verificarEmail(this.email);
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

      if (data.status === 200) {
        showAlert(data.mensagem, "success");
      } else {
        showAlert(data.mensagem, "danger");
      }
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      showAlert(data.mensagem, "danger");
    }
  }

  async verificarCPF(cpf) {
    try {
      const response = await fetch(`${api.online}/verificarCPF?cpf=${cpf}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Erro ao verificar CPF:", error);
      throw new Error("Erro ao verificar CPF. Tente novamente mais tarde.");
    }
  }
  async verificarEmail(email) {
    try {
      const response = await fetch(
        `${api.online}/verificarEmail?email=${email}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Erro ao verificar email:", error);
      throw new Error("Erro ao verificar email. Tente novamente mais tarde.");
    }
  }
}
