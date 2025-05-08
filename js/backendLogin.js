require("dotenv").config();
const express = require('express');
const database = require('./conexao');
const cors = require('cors');
const path = require('path');

const app = express();
const bcrypt = require('bcrypt');
const db = new database();

app.use(express.json());
app.use(cors({ origin: '*' }));

app.post('/verificarConta', async (req, res) => {
    try {
        const { usuario, senha } = req.body;

        if (!usuario || !senha) {
            return res.status(400).json({ dadosValidos: -1, mensagem: "Usuário e senha são obrigatórios." });
        }

        let sql = usuario.includes("@") 
            ? `SELECT * FROM web_usuarios WHERE email = ?`
            : `SELECT * FROM web_usuarios WHERE nome = ?`;

        const pesquisa = await db.query(sql, [usuario]);

        if (pesquisa.length === 0) {
            return res.json({ dadosValidos: 0, mensagem: "Conta não encontrada." });
        }

        const { situacao, senha: senhaHash } = pesquisa[0];

        if (situacao !== 'A') {
            return res.json({ dadosValidos: 1, mensagem: "Conta pendente ou bloqueada." });
        }

        const senhaCorreta = await bcrypt.compare(senha, senhaHash);
        if (!senhaCorreta) {
            return res.json({ dadosValidos: 3, mensagem: "Usuário ou senha incorretos." });
        }

        return res.json({ dadosValidos: 2, mensagem: "Autenticação bem-sucedida." });

    } catch (error) {
        console.error("Erro ao verificar conta:", error);
        return res.status(500).json({ error: "Erro interno do servidor. Tente novamente mais tarde." });
    }
});

// Servir arquivo HTML estático se quiser
app.use(express.static(path.join(__dirname, '..')));

app.listen(process.env.PORTA2, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${process.env.PORTA2}`);
});
