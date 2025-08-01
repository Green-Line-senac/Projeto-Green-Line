require("dotenv").config();
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { getConfirmationEmailHTML, getPasswordResetEmailHTML, getOrderConfirmationEmailHTML } = require("./js/emailTemplates");

class FuncaoUteis {
  criarToken(email) {
    return jwt.sign({ email }, process.env.SEGREDO_JWT, { expiresIn: "10m" });
  }

  async enviarEmail(email, assunto, tipo, pedido = null) {
    console.log("📧 === INÍCIO DA FUNÇÃO enviarEmail ===");
    console.log("📧 Parâmetros recebidos:", {
      email: email,
      assunto: assunto,
      tipo: tipo,
      pedidoFornecido: !!pedido
    });

    try {
      console.log("🔧 Configurando transportador SMTP...");
      console.log("📧 Variáveis de ambiente:", {
        EMAIL_USER: process.env.EMAIL_USER ? "✅ Definida" : "❌ Não definida",
        EMAIL_PASS: process.env.EMAIL_PASS ? "✅ Definida" : "❌ Não definida"
      });

      const transportador = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      console.log("✅ Transportador SMTP configurado");

      let mensagem;
      console.log("🎯 Processando tipo de email:", tipo);

      if (tipo === "recuperacao") {
        console.log("🔑 Gerando email de recuperação de senha...");
        const resetLink = `https://green-line-web.onrender.com/redefinir-senha?token=${this.criarToken(email)}`;

        mensagem = getPasswordResetEmailHTML({
          NOME_USUARIO: email.split('@')[0],
          LINK_RESET: resetLink,
          DATA_SOLICITACAO: new Date().toLocaleString('pt-BR'),
          IP_USUARIO: 'Não disponível',
          USER_AGENT: 'Não disponível'
        });

        if (!mensagem) {
          mensagem = `
            <h1>Redefinir sua senha - GreenLine</h1>
            <p>Olá, você solicitou a redefinição de sua senha.</p>
            <p>Clicando no botão a seguir, sua senha será reiniciada.</p>
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 15px 0;">
                Redefinir sua senha
            </a>
            <p>Atenciosamente,<br>Equipe Green Line</p>
          `;
        }
      }

      if (tipo === "confirmacao") {
        console.log("✅ Gerando email de confirmação de cadastro...");
        const confirmationLink = `https://green-line-web.onrender.com/validar?token=${this.criarToken(email)}`;

        mensagem = getConfirmationEmailHTML({
          NOME_USUARIO: email.split('@')[0],
          LINK_CONFIRMACAO: confirmationLink
        });

        if (!mensagem) {
          mensagem = `
            <h1>Faça do meio ambiente o seu meio de vida</h1>
            <p>Olá, obrigado por se cadastrar na Green Line! Confirme seu e-mail para começar a usar a plataforma:</p>
            <a href="${confirmationLink}" style="padding:10px 20px; background-color:#007bff; color:white; text-decoration:none; border-radius:5px;">
              Confirmar Email
            </a>
          `;
        }
      }

      if (tipo === "pedido_confirmado" || tipo === "compra-concluida") {
        console.log("🛒 Processando email de pedido confirmado...");
        console.log("📦 Dados do pedido recebidos:", JSON.stringify(pedido, null, 2));

        if (!pedido?.numeroPedido) {
          console.error("❌ Número do pedido não fornecido");
          console.error("📦 Objeto pedido:", pedido);
          throw new Error("Dados do pedido são necessários para este tipo de e-mail.");
        }

        console.log("✅ Número do pedido validado:", pedido.numeroPedido);

        // Função para formatar valor monetário
        const formatarValor = (valor) => {
          return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(parseFloat(valor) || 0);
        };

        // Gerar HTML dos produtos
        let produtosHtml = "";
        if (pedido.produtos && Array.isArray(pedido.produtos)) {
          console.log('🛒 Gerando HTML para', pedido.produtos.length, 'produtos');
          produtosHtml = pedido.produtos
            .map((produto) => {
              const imagemUrl =
                produto.imagem_principal ||
                produto.imagem_1 ||
                produto.imagem ||
                produto.img ||
                "https://green-line-web.onrender.com/img/imagem-nao-disponivel.png";

              const subtotal = produto.subtotal || (produto.preco * produto.quantidade);

              console.log('📦 Produto:', produto.nome, 'Imagem:', imagemUrl);

              return `
                <div class="product-item">
                  <img src="${imagemUrl}" alt="${produto.nome}" class="product-image" onerror="this.src='https://green-line-web.onrender.com/img/imagem-nao-disponivel.png'">
                  <div class="product-details">
                    <h4 class="product-name">${produto.nome}</h4>
                    <p class="product-info">Quantidade: ${produto.quantidade}</p>
                    <p class="product-info">Preço unitário: ${formatarValor(produto.preco)}</p>
                    <p class="product-price">Subtotal: ${formatarValor(subtotal)}</p>
                  </div>
                </div>
              `;
            })
            .join("");
        } else {
          console.log('⚠️ Nenhum produto encontrado no pedido');
          produtosHtml = '<p class="product-info">Nenhum produto encontrado no pedido.</p>';
        }

        const emailVariables = {
          NOME_USUARIO: pedido.nomeTitular || pedido.nomeCliente || pedido.nome || 'Cliente',
          NUMERO_PEDIDO: pedido.numeroPedido || pedido.numero_pedido || 'N/A',
          DATA_PEDIDO: pedido.dataConfirmacao || pedido.data_pedido || new Date().toLocaleDateString('pt-BR'),
          METODO_PAGAMENTO: pedido.metodoPagamento || pedido.metodo_pagamento || pedido.formaPagamentoVendas || 'Não informado',
          SUBTOTAL: formatarValor(pedido.subtotal || (pedido.total - (pedido.frete || 0))),
          FRETE: formatarValor(pedido.frete || pedido.valor_frete || 0),
          TOTAL: formatarValor(pedido.total || pedido.valor_total || 0),
          METODO_ENTREGA: pedido.metodoEntrega || pedido.metodo_entrega || 'Entrega padrão',
          PREVISAO_ENTREGA: pedido.previsaoEntrega || pedido.previsao_entrega || '5-7 dias úteis',
          ENDERECO_ENTREGA: pedido.enderecoCompleto || pedido.endereco_completo || pedido.endereco || 'Endereço não informado',
          PRODUTOS_HTML: produtosHtml
        };

        // Validar parâmetros obrigatórios
        const requiredParams = ['NOME_USUARIO', 'NUMERO_PEDIDO', 'DATA_PEDIDO', 'TOTAL'];
        const missingParams = requiredParams.filter(param => {
          const value = emailVariables[param];
          return !value || value === 'N/A' || value === 'R$ 0,00' || value === '';
        });

        if (missingParams.length > 0) {
          console.error('❌ Parâmetros críticos faltando no email:', missingParams);
          console.error('📋 Objeto pedido completo recebido:', JSON.stringify(pedido, null, 2));
          console.error('📧 Variáveis geradas:', JSON.stringify(emailVariables, null, 2));
        } else {
          console.log('✅ Todos os parâmetros obrigatórios estão presentes');
        }

        console.log('📧 Variáveis do email:', emailVariables);

        try {
          console.log('🔄 Tentando carregar template externo...');
          mensagem = getOrderConfirmationEmailHTML(emailVariables);
          console.log('📄 Template externo carregado, tamanho:', mensagem ? mensagem.length : 0);
        } catch (templateError) {
          console.error('❌ Erro ao processar template de email:', templateError);
          mensagem = null;
        }

        // Debug: verificar se a mensagem foi gerada
        if (!mensagem) {
          console.error('❌ Falha ao gerar email com template. Usando fallback.');
          console.error('🔍 Verificando se arquivo de template existe...');
          const fs = require('fs');
          const path = require('path');
          const templatePath = path.join(__dirname, 'templates', 'email-pedido-confirmado.html');
          console.error('📂 Caminho do template:', templatePath);
          console.error('📄 Template existe:', fs.existsSync(templatePath));

          // Fallback para template simples
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
                    .product-item { display: flex; align-items: center; background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #e9ecef; }
                    .product-image { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 15px; }
                    .product-details { flex: 1; }
                    .product-name { font-size: 16px; font-weight: bold; color: #28a745; margin: 0 0 5px 0; }
                    .product-info { font-size: 14px; color: #666; margin: 2px 0; }
                    .product-price { font-size: 16px; font-weight: bold; color: #333; margin: 5px 0 0 0; }
                    .footer { text-align: center; margin-top: 30px; padding: 20px; background: #e9ecef; border-radius: 5px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🎉 Pedido Confirmado!</h1>
                    <p>Obrigado por escolher a Green Line</p>
                </div>
                <div class="content">
                    <h2>Olá, ${emailVariables.NOME_USUARIO}!</h2>
                    <p>Seu pedido foi confirmado com sucesso e está sendo processado.</p>
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>📋 Detalhes do Pedido</h3>
                        <p><strong>Número:</strong> ${emailVariables.NUMERO_PEDIDO}</p>
                        <p><strong>Data:</strong> ${emailVariables.DATA_PEDIDO}</p>
                        <p><strong>Total:</strong> ${emailVariables.TOTAL}</p>
                        <p><strong>Previsão de entrega:</strong> ${emailVariables.PREVISAO_ENTREGA}</p>
                    </div>
                    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>🛒 Produtos do Pedido</h3>
                        ${emailVariables.PRODUTOS_HTML}
                    </div>

                </div>
                <div class="footer">
                    <p>🌱 Obrigado por escolher produtos sustentáveis!</p>
                    <p><strong>GreenLine</strong> - Faça do meio ambiente o seu meio de vida</p>
                    <p>Ceilândia, Brasília-DF | greenline.ecologic@gmail.com</p>
                </div>
            </body>
            </html>
          `;
        } else {
          console.log('✅ Email gerado com sucesso usando template');

          // Verificar se há botões no template final
          const hasButtons = mensagem.includes('Acompanhar Pedido') || mensagem.includes('Suporte') || mensagem.includes('href=');
          if (hasButtons) {
            console.warn('⚠️ ATENÇÃO: Template ainda contém botões ou links!');
            console.log('🔍 Trechos encontrados:', {
              acompanhar: mensagem.includes('Acompanhar Pedido'),
              suporte: mensagem.includes('Suporte'),
              links: mensagem.includes('href=')
            });
          } else {
            console.log('✅ Template limpo - sem botões');
          }

          // Verificar se ainda há placeholders não substituídos
          const remainingPlaceholders = mensagem.match(/\{\{[^}]+\}\}/g);
          if (remainingPlaceholders) {
            console.error('❌ Placeholders não substituídos no email final:', remainingPlaceholders);
            // Forçar substituição manual se necessário
            remainingPlaceholders.forEach(placeholder => {
              console.log(`🔧 Removendo placeholder não substituído: ${placeholder}`);
              mensagem = mensagem.split(placeholder).join('');
            });
          }
        }
      }

      console.log("📤 Enviando email...");
      console.log("📧 Configurações do email:", {
        from: "Green Line <greenline.ecologic@gmail.com>",
        to: email,
        subject: assunto,
        htmlLength: mensagem ? mensagem.length : 0
      });

      if (!mensagem) {
        console.error("❌ Mensagem HTML está vazia ou nula!");
        throw new Error("Conteúdo do email não foi gerado");
      }

      const emailResult = await transportador.sendMail({
        from: "Green Line <greenline.ecologic@gmail.com>",
        to: email,
        subject: assunto,
        html: mensagem,
      });

      console.log("✅ Email enviado com sucesso!");
      console.log("📧 Resultado do envio:", {
        messageId: emailResult.messageId,
        accepted: emailResult.accepted,
        rejected: emailResult.rejected
      });

    } catch (erro) {
      console.error("💥 === ERRO NA FUNÇÃO enviarEmail ===");
      console.error("🔥 Tipo do erro:", erro.name);
      console.error("🔥 Mensagem:", erro.message);
      console.error("🔥 Stack trace:", erro.stack);
      console.error("📧 Parâmetros que causaram erro:", {
        email: email,
        assunto: assunto,
        tipo: tipo,
        pedidoFornecido: !!pedido
      });
      console.error("💥 === FIM DO ERRO enviarEmail ===");
      throw erro;
    }

    console.log("📧 === FIM DA FUNÇÃO enviarEmail ===");
  }
}

module.exports = FuncaoUteis;