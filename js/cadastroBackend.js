require("dotenv").config();
const nodemailer = require("nodemailer");
const express = require("express");
const cors = require("cors");
const Database = require("./conexao"); // usando o novo arquivo com pool
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(cors());

const db = new Database(); // Reaproveita pool de conexões

// Função para gerar token JWT
function criarToken(email) {
    const segredo = 'green_line-ecologic';
    return jwt.sign({ email }, segredo, { expiresIn: '30m' });
}

// Cadastro de usuário
app.post("/cadastrar", async (req, res) => {
    const { nome, email, cpf, telefone, senha } = req.body;

    const inserirPessoa = `INSERT INTO pessoa(nome, email, cpf_cnpj, telefone, tipo_pessoa) VALUES (?, ?, ?, ?, 'F')`;
    const selecionarId = `SELECT id_pessoa FROM pessoa WHERE email = ? ORDER BY id_pessoa DESC LIMIT 1`;
    const inserirUsuario = `INSERT INTO usuario(id_pessoa, id_tipo_usuario, senha, situacao) VALUES (?, '2', ?, 'I')`;
    const inserirToken = `INSERT INTO token_temporario(id_usuario, token, validade, utilizado) VALUES (?, ?, ?, 0)`;

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
        const validade = new Date(Date.now() + 30 * 60000); // 30 minutos

        await db.query(inserirToken, [id_pessoa, token, validade]);

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
    const segredo = process.env.SEGREDO_JWT;

    try {
        const payload = jwt.verify(token, segredo);
        const email = payload.email;

        const sql = "SELECT * FROM pessoa WHERE email = ?";
        const resultado = await db.query(sql, [email]);

        if (resultado.length > 0) {
            res.send("<h1>Email confirmado com sucesso!</h1><p>Você já pode acessar a plataforma.</p>");
        } else {
            res.send("<h1>Erro!</h1><p>Email não encontrado. Tente cadastrar novamente.</p>");
        }
    } catch (erro) {
        console.error("Erro na validação do token:", erro);
        res.send("<h1>Token expirado ou inválido.</h1><p>Tente se cadastrar novamente.</p>");
    }
});

// Iniciar servidor
app.listen(process.env.PORTA, () => {
    console.log("🚀 Servidor rodando em http://localhost:3000");
});
