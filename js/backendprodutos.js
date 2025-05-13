const express = require("express");
const cors = require("cors");
const Conexao = require("./conexao");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(cors({ origin: '*' }));

const db = new Conexao();

// Rota para listar produtos
app.get("/produto", async (req, res) => {
    try {
        const produtos = await db.query("SELECT * FROM produto");
        
        // Verifica se há produtos
        if (!produtos || produtos.length === 0) {
            return res.status(404).json({ mensagem: "Nenhum produto encontrado" });
        }
        
        res.json(produtos);
    } catch (err) {
        console.error("Erro ao buscar produtos:", err);
        res.status(500).json({ 
            erro: "Erro ao buscar produtos",
            detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Rota padrão para verificar se o servidor está rodando
app.get("/", (req, res) => {
    res.json({ mensagem: "API de produtos está funcionando" });
});

const porta = process.env.PORTA4 || 3003;
app.listen(porta, () => {
    console.log(`Servidor rodando na porta ${porta}`);
});