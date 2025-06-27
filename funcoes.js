require("dotenv").config();
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

class FuncaoUteis {
  criarToken(email) {
    return jwt.sign({ email }, process.env.SEGREDO_JWT, { expiresIn: "10m" });
  }
  async enviarEmail(email, assunto, tipo) {
    try {
      const transportador = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      let mensagem;
      if (tipo === "recuperacao") {
        mensagem = `
        <h1>Faça do meio ambiente o seu meio de vida</h1>
        <p>Olá,</p>
        <p>Você solicitou a redefinição de senha na Green Line. Aqui está sua senha temporária:</p>
        <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; text-align: center; font-size: 18px; margin: 20px 0;">
            <strong>123GL</strong>
        </div>
        <p>Por segurança, recomendamos que você acesse sua conta e altere esta senha temporária o quanto antes.</p>
        <a href="https://green-line-web.onrender.com/redefinir-senha?token=${this.criarToken(
          email
        )}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 15px 0;">
            Acessar minha conta
        </a>
        <p>Atenciosamente,<br>Equipe Green Line</p>
      `;
      }
      if (tipo === "confirmacao") {
        mensagem = `
              <h1>Faça do meio ambiente o seu meio de vida</h1>
              <p>Olá, obrigado por se cadastrar na Green Line! Confirme seu e-mail para começar a usar a plataforma:</p>
              <a href="https://green-line-web.onrender.com/validar?token=${this.criarToken(
                email
              )}" style="padding:10px 20px; background-color:#007bff; color:white; text-decoration:none; border-radius:5px;">
                Confirmar Email
              </a>
            `;
      }
      if (tipo === "compra-concluida") {
        mensagem = `
          Olá!
          
          Seu pedido ${pedido.numeroPedido} foi confirmado com sucesso!
          
          Detalhes do pedido:
          - Data: ${pedido.dataConfirmacao}
          - Valor total: R$ ${pedido.total.toFixed(2)}
          - Previsão de entrega: ${pedido.previsaoEntrega}
          
          Você pode acompanhar seu pedido em nosso site.
          
          Obrigado por escolher produtos sustentáveis!
          
          Atenciosamente,
          Equipe GreenLine
        `;
      }
      await transportador.sendMail({
        from: "Green Line <greenline.ecologic@gmail.com>",
        to: email,
        subject: assunto,
        html: mensagem,
      });
      console.log("✅ E-mail enviado com sucesso.");
    } catch (erro) {
      console.error("Erro ao enviar o email:", erro);
    }
  }
}

module.exports = FuncaoUteis;
