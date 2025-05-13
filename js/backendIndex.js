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
    const condicao = req.query;
    if (condicao.length == 0) {
        console.log('condicao não tem nada');
    }
    let produtos;
    try {
        let select = 'SELECT * FROM produto';
        let select2 = 'SELECT * FROM produto WHERE ?'
        if (condicao.lenght == 0) {
            produtos = await db.query(select);
        }
        else {
            produtos = await db.query(select2, [condicao])
        }


        if (!produtos || produtos.length === 0) {
            return res.status(404).json({ mensagem: "Nenhum produto encontrado" });
        }

        res.json({
            dados: produtos,
            pagina: parseInt(pagina),
            por_pagina: parseInt(limite)
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