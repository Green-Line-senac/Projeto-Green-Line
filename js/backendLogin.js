require("dotenv").config();
const express = require('express');
const database = require('./conexao');
const funcoes = require('./funcoes');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const funcoesUteis = new funcoes();
const app = express();
const db = new database();

// Configurações básicas
app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(express.static(path.join(__dirname, '..')));

// Middleware para verificar o token JWT
const verificarToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Token não fornecido.' });

    try {
        const tokenFormatado = token.replace('Bearer ', '');
        const decoded = jwt.verify(tokenFormatado, process.env.SEGREDO_JWT);
        req.usuario = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido ou expirado.' });
    }
};

// Rota de verificação de conta
app.post('/verificarConta', async (req, res) => {
    try {
        const { usuario, senha } = req.body;

        // Validação dos campos
        if (!usuario || !senha) {
            return res.status(400).json({ 
                dadosValidos: -1, 
                mensagem: "Usuário e senha são obrigatórios." 
            });
        }

        // Prevenção contra SQL Injection
        if (typeof usuario !== 'string' || typeof senha !== 'string') {
            return res.status(400).json({ 
                dadosValidos: -1, 
                mensagem: "Dados inválidos." 
            });
        }

        // Consulta ao banco de dados
        let sql = usuario.includes("@") 
            ? `SELECT * FROM pessoa WHERE email = ?` 
            : `SELECT * FROM pessoa WHERE nome = ?`;

        const pesquisa = await db.query(sql, [usuario]);

        if (pesquisa.length === 0) {
            return res.status(404).json({ 
                dadosValidos: 0, 
                mensagem: "Conta não encontrada." 
            });
        }

        const { id_pessoa, situacao, senha: senhaHash, id_tipo_usuario, email, nome } = pesquisa[0];

        // Verificação da situação da conta
        if (situacao !== 'A') {
            return res.status(403).json({ 
                dadosValidos: 1, 
                mensagem: "Conta pendente ou bloqueada." 
            });
        }

        // Verificação da senha
        const senhaCorreta = await bcrypt.compare(senha, senhaHash);
        if (!senhaCorreta) {
            return res.status(401).json({ 
                dadosValidos: 3, 
                mensagem: "Usuário ou senha incorretos." 
            });
        }

        // Verificação adicional para admin
        if (id_tipo_usuario === 1 && !email.endsWith('.adm@')) {
            return res.status(403).json({ 
                dadosValidos: 1, 
                mensagem: "Conta admin requer verificação adicional." 
            });
        }

        // Geração do token JWT
        const token = jwt.sign(
            { 
                id_pessoa: id_pessoa,
                email: email,
                tipo_usuario: id_tipo_usuario 
            },
            process.env.SEGREDO_JWT,
            { expiresIn: '1h' }
        );

        // Resposta de sucesso
      const isAdmin = email === "greenl.adm@gmail.com";

        // Envia isso para o frontend
        return res.status(200).json({
        dadosValidos: 2,
        token,
        user: {
            id_pessoa,
            email,
            isAdmin
        }
        });

    } catch (error) {
        console.error("Erro ao verificar conta:", error);
        return res.status(500).json({ 
            error: "Erro interno do servidor. Tente novamente mais tarde." 
        });
    }
});

// Rota para enviar e-mail de verificação
app.post("/enviarEmail", async (req, res) => {
    try {
        const { usuario } = req.body;
        
        if (!usuario) {
            return res.status(400).json({ 
                error: "Usuário é obrigatório." 
            });
        }

        await funcoesUteis.enviarEmail(usuario);
        res.status(200).json({ 
            mensagem: "E-mail enviado com sucesso." 
        });
    } catch (error) {
        console.error("Erro ao enviar e-mail:", error);
        res.status(500).json({ 
            error: "Erro ao enviar e-mail de verificação." 
        });
    }
});

// Rota protegida de exemplo (opcional)
// app.get("/protegido", verificarToken, (req, res) => {
//     res.json({ 
//         mensagem: "Rota protegida acessada com sucesso.",
//         usuario: req.usuario
//     });
// });

// Iniciar servidor
app.listen(process.env.PORTA2, () => {
    console.log(`🚀 Servidor rodando -backendLogin- em http://localhost:${process.env.PORTA2}`);
});