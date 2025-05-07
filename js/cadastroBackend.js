require("dotenv").config();
const nodemailer = require("nodemailer");
const express = require("express");
const cors = require("cors");
const Database = require("./conexao");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const db = new Database(); // Reaproveita pool de conexões
const segredo = process.env.SEGREDO_JWT;
console.log(process.env.SEGREDO_JWT);

// Função para gerar token JWT
function criarToken(email) {
    return jwt.sign({ email }, segredo, { expiresIn: '30m' });
}

// Cadastro de usuário
app.post("/cadastrar", async (req, res) => {
    const { nome, email, cpf, telefone, senha } = req.body;

    const inserirPessoa = `INSERT INTO pessoa(nome, email, cpf, telefone) VALUES (?, ?, ?, ?)`;
    const selecionarId = `SELECT id_pessoa FROM pessoa WHERE email = ? ORDER BY id_pessoa DESC LIMIT 1`;
    const inserirUsuario = `INSERT INTO usuario(id_pessoa, id_tipo_usuario, senha, situacao) VALUES (?, '2', ?, 'I')`;

    try {
        const senhaCriptografada = await bcrypt.hash(senha, 10);
        await db.query(inserirPessoa, [nome, email, cpf, telefone]);

        const resultadoId = await db.query(selecionarId, [email]);
        if (resultadoId.length === 0) {
            return res.status(400).json({ erro: "Erro ao recuperar o ID da pessoa." });
        }

        const id_pessoa = resultadoId[0].id_pessoa;

        await db.query(inserirUsuario, [id_pessoa, senhaCriptografada]);

        const token = criarToken(email);

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: 'Green Line <greenline.ecologic@gmail.com>',
            to: email,
            subject: 'Confirmação de email',
            html: `
              <h1>Faça do meio ambiente o seu meio de vida</h1>
              <p>Olá, obrigado por se cadastrar na Green Line! Confirme seu e-mail para começar a usar a plataforma:</p>
              <a href="http://localhost:3000/validar?token=${token}" style="padding:10px 20px; background-color:#007bff; color:white; text-decoration:none; border-radius:5px;">
                Confirmar Email
              </a>
            `
        });

        console.log("✅ E-mail enviado com sucesso.");
        res.status(200).json({ mensagem: "Cadastro realizado com sucesso! Verifique seu e-mail para confirmação." });

    } catch (err) {
        console.error("Erro no cadastro:", err);
        res.status(500).json({ erro: "Erro durante o processo de cadastro." });
    }
});

// Validação do token (acesso via link de e-mail)
app.get("/validar", async (req, res) => {
    const { token } = req.query;
    const atualizarSituacao = "UPDATE usuario SET situacao = 'A' WHERE id_pessoa = ?";

    try {
        const payload = jwt.verify(token, segredo);
        const email = payload.email;

        const sql = "SELECT u.id_pessoa FROM usuario AS u INNER JOIN pessoa AS p ON p.id_pessoa = u.id_pessoa WHERE u.situacao = 'I' AND p.email = ?;";
        const resultado = await db.query(sql, [email]);

        if (resultado.length > 0) {
            const id_pessoa = resultado[0].id_pessoa;
            try {
                await db.query(atualizarSituacao, [id_pessoa]);
                res.sendFile(path.join(__dirname, "../public", "confirmacaoLogin.html"));
            } catch (erro) {
                console.error("Erro ao atualizar:", erro);
                res.sendFile(path.join(__dirname, "../public", "erro.html"));
            }
        } else {
            res.sendFile(path.join(__dirname, "../public", "erro.html"));

        }
    } catch (erro) {
        console.error("Token inválido ou expirado:", erro);
        res.sendFile(path.join(__dirname, "..", "tokenExpirado.html"));

    }
});


app.get("/verificarEmail", async (req, res) => {
    const { email } = req.query;
    const sql = "SELECT COUNT(*) AS total FROM pessoa WHERE email = ?";

    try {
        const verificacao = await db.query(sql, [email]);
        const existe = verificacao[0].total > 0;

        res.json({ existe });
    } catch (erro) {
        console.error("Erro ao verificar o email: ", erro);
        res.status(500);
    }
});
app.get("/verificarCPF", async (req, res) => {
    const { cpf } = req.query;
    const sql = "SELECT COUNT(*) AS total FROM pessoa WHERE cpf = ?";

    try {
        const verificacao = await db.query(sql, [cpf]);
        const existe = verificacao[0].total > 0;
        res.json({ existe });
    }
    catch (erro) {
        console.error("Erro ao verificar o cpf");
    }
})

// Iniciar servidor
app.listen(process.env.PORTA, () => {
    console.log("🚀 Servidor rodando em http://localhost:3000");
});
