// Configuração das variáveis de ambiente
require("dotenv").config();

// Importação dos módulos necessários
const express = require('express');
const cors = require('cors');

// Criação da aplicação Express
const app = express();

// Middlewares
app.use(express.json()); // Para interpretar JSON no corpo das requisições
app.use(cors()); // Para habilitar CORS

// Objeto para armazenar o estado de forma mais segura
const estadoLogin = {
    trocarDeConta: 0,
    ultimaAtualizacao: null
};

// Rota POST para atualizar o estado
app.post("/loginDados", (req, res) => {
    const novoValor = Number(req.body.trocar) || 0;
    estadoLogin.trocarDeConta = novoValor;
    estadoLogin.ultimaAtualizacao = new Date();
    
    console.log('Estado atualizado:', estadoLogin);
    res.json({ 
        status: 'sucesso',
        dadosRecebidos: estadoLogin.trocarDeConta,
        atualizadoEm: estadoLogin.ultimaAtualizacao
    });
});

// Rota GET para consultar o estado
app.get("/loginDados", (req, res) => {
    res.json({
        status: 'sucesso',
        dadosRecebidos: estadoLogin.trocarDeConta,
        atualizadoEm: estadoLogin.ultimaAtualizacao
    });
});

// Inicia o servidor na porta especificada no .env
const porta = process.env.PORTA3 || 3002;
app.listen(porta, () => {
    console.log(`Servidor de autenticação rodando na porta ${porta}`);
    console.log(`Valor inicial de trocarDeConta: ${estadoLogin.trocarDeConta}`);
});