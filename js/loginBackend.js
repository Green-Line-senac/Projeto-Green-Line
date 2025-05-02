const express = require('express');
const database = require('./conexao');
const cors = require('cors');
const path = require('path');

const app = express();
const PORTA = 3001;
const bcrypt = require('bcrypt');
const db = new database();

app.use(express.json());
app.use(cors({ origin: '*' }));

app.post('/verificarConta', async (req, res) => {
    const { usuario, senha } = req.body;

    const sql = `SELECT nome, senha, situacao FROM mobile_web_usuarios WHERE nome = ?`;

    try {
        const pesquisa = await db.query(sql, [usuario]);

        if (pesquisa.length === 0) {
            return res.json({ dadosValidos: 0 }); // Conta não existe
        }

        const { situacao, senha: senhaHash } = pesquisa[0];

        if (situacao !== 'A') {
            return res.json({ dadosValidos: 1 }); // Email não verificado
        }

        const senhaCorreta = await bcrypt.compare(senha, senhaHash);
        if (!senhaCorreta) {
            return res.json({ dadosValidos: 3 }); // Usuário ou senha incorretos
        }

        // Tudo certo
        return res.json({ dadosValidos: 2 });

    } catch (error) {
        console.error("Erro ao verificar conta:", error);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// Servir arquivo HTML estático se quiser
app.use(express.static(path.join(__dirname, '..')));

app.listen(PORTA, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORTA}`);
});
