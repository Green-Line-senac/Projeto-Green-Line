// Importação de bibliotecas essenciais
const nodemailer = require('nodemailer'); // Biblioteca para envio de e-mails
const express = require("express"); // Framework para construção de APIs web
const cors = require("cors"); // Middleware para habilitar requisições cross-origin
const Database = require("./conexao"); // Arquivo para conexão com banco de dados local
const bcrypt = require("bcrypt"); // Biblioteca para criptografia de senhas

// Instanciando objetos necessários
const db = new Database(); // Instância para acessar funções de banco de dados
const app = express(); // Instância do express para criar e configurar o servidor

// Middlewares essenciais
app.use(express.json()); // Permite o uso de JSON no corpo das requisições
app.use(cors()); // Libera acessos de diferentes origens ao servidor

// Endpoint para cadastro de usuários
app.post("/cadastrar", async (req, res) => {
    // Captura dos dados enviados na requisição
    const { nome, email, cpf, telefone, senha } = req.body;

    // Queries SQL para interagir com o banco de dados
    const inserirPessoa = "INSERT INTO pessoa(nome, email, cpf_cnpj, telefone, tipo_pessoa) VALUES (?, ?, ?, ?, 'F')"; // Inserção de dados da pessoa
    const selecionarId = "SELECT id_pessoa FROM pessoa ORDER BY id_pessoa DESC"; // Seleção do último ID inserido
    const inserirUsuario = "INSERT INTO usuario(id_pessoa,id_tipo_usuario,senha,situacao) VALUE(?,'2',?,'A')"; // Inserção de dados do usuário

    try {
        // Criptografando a senha para armazenamento seguro
        const senhaCriptografada = await bcrypt.hash(senha, 10);

        // Inserindo os dados da pessoa no banco
        await db.query(inserirPessoa, [nome, email, cpf, telefone]);

        // Recuperando o ID gerado para a pessoa
        const resultadoId = await db.query(selecionarId);
        if (resultadoId.length > 0) {
            const id_pessoa = resultadoId[0].id_pessoa;

            // Inserindo os dados de usuário
            await db.query(inserirUsuario, [id_pessoa, senhaCriptografada]);
            res.json({ mensagem: "Cadastro concluído com sucesso." });

            // Configuração do serviço de envio de e-mails
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com', // Servidor SMTP para envio
                port: 465, //
                secure: true,
                auth: {
                    user: 'greenline.ecologic@gmail.com', // E-mail do remetente
                    pass: 'htvm cxka omdi tcoa' // Senha
                }
            });

            // Enviando o e-mail de confirmação para o usuário
            await transporter.sendMail({
                from: 'Green Line <greenline.ecologic@gmail.com>', // Remetente
                to: email, // Destinatário
                subject: 'Confirmação de email', // Assunto do e-mail
                html: '<h1>Faça do meio ambiente o seu meio de vida</h1><p>Olá, obrigado por se tornar parte da Green Line. Confirme o email que colocou no cadastro para que possa começar suas compras dentro da plataforma.</p>' // Conteúdo do e-mail
            });
            console.log("E-mail enviado com sucesso.");
        } else {
            throw new Error("ID da pessoa não encontrado."); // Erro ao recuperar o ID
        }
    } catch (err) {
        // Tratamento de erros durante o processo de cadastro
        console.error("Erro no processo:", err);
        res.status(500).json({ erro: "Erro durante o processo de cadastro." });
    } finally {
        // Fecha a conexão com o banco de dados
        db.close();
    }
});

// Configuração do servidor para ouvir requisições na porta 3000
app.listen(3000, () => {
    console.log("🚀 Servidor rodando em http://localhost:3000"); // Log indicando que o servidor está ativo
});