require("dotenv").config();
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

class FuncaoUteis {
  criarToken(email) {
    return jwt.sign({ email }, process.env.SEGREDO_JWT, { expiresIn: "10m" });
  }
  async enviarEmail(email, assunto, tipo, pedido = null) {
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
        <p>Clicando no botão a seguir, sua senha será reiniciada.</p>
        <a href="https://green-line-web.onrender.com/redefinir-senha?token=${this.criarToken(
          email
        )}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 15px 0;">
            Redefinir sua senha
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
        if (!pedido?.numeroPedido) {
          throw new Error(
            "Dados do pedido são necessários para este tipo de e-mail."
          );
        }
        mensagem = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pedido Confirmado - GreenLine</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
            .eco-badge { background: #d4edda; color: #155724; padding: 10px; border-radius: 5px; text-align: center; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6c757d; font-size: 14px; }
            .btn { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🌱 Pedido Confirmado!</h1>
            <p>Obrigado por escolher produtos sustentáveis</p>
        </div>
        
        <div class="content">
            <p>Olá! Seu pedido foi confirmado com sucesso e já está sendo processado.</p>
            
            <div class="order-info">
                <h3>📦 Detalhes do Pedido</h3>
                <p><strong>Número:</strong> ${pedido.numeroPedido}</p>
                <p><strong>Data:</strong> ${pedido.dataConfirmacao}</p>
                <p><strong>Total:</strong> R$ ${pedido.total.toFixed(2).replace('.', ',')}</p>
                <p><strong>Previsão de entrega:</strong> ${pedido.previsaoEntrega}</p>
            </div>
            
            <div class="eco-badge">
                🌍 <strong>Impacto Sustentável:</strong> Com esta compra, você contribuiu para um planeta mais verde!
            </div>
            
            <p>Você pode acompanhar o status do seu pedido a qualquer momento em nosso site.</p>
            
            <div style="text-align: center;">
                <a href="https://green-line-web.onrender.com/public/pedido_confirmado.html" class="btn">
                    Acompanhar Pedido
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>Este é um e-mail automático, não responda.</p>
            <p><strong>GreenLine</strong> - Faça do meio ambiente o seu meio de vida</p>
            <p>Ceilândia, Brasília-DF | greenline.ecologic@gmail.com</p>
        </div>
    </body>
    </html>
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
