// Configuração das variáveis de ambiente
require("dotenv").config();

// Importação dos módulos necessários
const express = require('express');
const cors = require('cors');
const Conexao = require("./conexao");

// Criação da aplicação Express
const app = express();
const db = new Conexao();

// Middlewares
app.use(express.json()); // Para interpretar JSON no corpo das requisições
app.use(cors()); // Para habilitar CORS


const estadoLogin = {
    usuario: null,
    trocarDeConta: 0,
    ultimaAtualizacao: null
};

// Rota POST com validação
app.post("/loginDados", (req, res) => {
    console.log('Corpo recebido:', req.body); // Debug crucial

    if (!req.body) {
        return res.status(400).json({ erro: "Nenhum dado recebido" });
    }

    const { usuario, trocar } = req.body;

    if (!usuario) {
        return res.status(400).json({ erro: "Usuário é obrigatório" });
    }

    estadoLogin.usuario = usuario;
    estadoLogin.trocarDeConta = Number(trocar) || 0;
    estadoLogin.ultimaAtualizacao = new Date();

    res.json({
        status: 'sucesso',
        usuario: estadoLogin.usuario,
        trocar: estadoLogin.trocarDeConta,
        atualizadoEm: estadoLogin.ultimaAtualizacao
    });
});

// Rota GET
app.get("/loginDados", (req, res) => {
    res.json(estadoLogin);
});

app.get("/produtos", async (req, res) => {
    try {
        const produtos = await db.query(`
            SELECT * FROM produto 
            WHERE promocao = true 
            AND ativo = true
            ORDER BY RAND()
            LIMIT 12
        `);

        res.json({
            success: true,
            data: produtos || [] // Garante array mesmo se for undefined
        });
    } catch (err) {
        console.error("Erro ao buscar produtos:", err);
        res.status(500).json({
            erro: "Erro ao buscar produtos",
            detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Inicia o servidor na porta especificada no .env
const porta = process.env.PORTA3;
app.listen(porta, () => {
    console.log(`Servidor de autenticação rodando na porta ${porta}`);
    console.log(`Valor inicial de trocarDeConta: ${estadoLogin.trocarDeConta}`);
});