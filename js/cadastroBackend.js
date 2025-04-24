const nodemailer = require('nodemailer'); //biblioteca para enviar emails 
const express = require("express");
const cors = require("cors");
const Database = require("./conexao"); //conexão com o banco de dados local
const bcrypt = require("bcrypt"); //biblioteca para criptografar strings

const db = new Database(); //pode utilizar as funções de conexao.js
const app = express(); //pode usar a biblioteca express
app.use(express.json());
app.use(cors());

app.post("/cadastrar", async (req, res) => {
    const { nome, email, cpf, telefone, senha } = req.body;
    const inserirPessoa = "INSERT INTO pessoa(nome, email, cpf_cnpj, telefone, tipo_pessoa) VALUES (?, ?, ?, ?, 'F')";
    const selecionarId = "SELECT id_pessoa FROM pessoa ORDER BY id_pessoa DESC";
    const inserirUsuario = "INSERT INTO usuario(id_pessoa,id_tipo_usuario,senha,situacao) VALUE(?,'2',?,'A')";

    try {
        // Hash da senha
        const senhaCriptografada = await bcrypt.hash(senha, 10);

        // Inserir Pessoa
        await db.query(inserirPessoa, [nome, email, cpf, telefone]);

        // Selecionar ID da pessoa
        const resultadoId = await db.query(selecionarId);
        if (resultadoId.length > 0) {
            const id_pessoa = resultadoId[0].id_pessoa;

            // Inserir Usuário
            await db.query(inserirUsuario, [id_pessoa, senhaCriptografada]);
            res.json({ mensagem: "Cadastro concluído com sucesso." });

            // Enviar e-mail de confirmação
            const transporter = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: 'greenline.ecologic@gmail.com',
                    pass: 'Greendev01senac'
                }
            });

            await transporter.sendMail({
                from: 'Green Line <greenline.ecologic@gmail.com>',
                to: email, //email colocado pelo usuário no cadastro
                subject: 'Confirmação de email',
                html: '<h1>Faça do meio ambiente o seu meio de vida</h1><p>Olá, obrigado por se tornar parte da Green Line. Confirme o email que colocou no cadastro para que possa começar suas compras dentro da plataforma.</p>'
            });
            console.log("E-mail enviado com sucesso.");
        } else {
            throw new Error("ID da pessoa não encontrado.");
        }
    } catch (err) {
        console.error("Erro no processo:", err);
        res.status(500).json({ erro: "Erro durante o processo de cadastro." });
    } finally {
        db.close();
    }
});

app.listen(3000, () => {
    console.log("🚀 Servidor rodando em http://localhost:3000");
});