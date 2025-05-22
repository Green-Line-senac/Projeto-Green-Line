// Configuração das variáveis de ambiente
require("dotenv").config();

// Importação dos módulos necessários
const express = require("express");
const cors = require("cors");
const Conexao = require("./conexao");

// Criação da aplicação Express
const app = express();
const db = new Conexao();

// Middlewares
app.use(express.json()); // Para interpretar JSON no corpo das requisições
app.use(cors()); // Para habilitar CORS

let estadoLogin = {
    usuario: null,
    id_pessoa: null,
    tipo_usuario: 2,
    quantidade_produtos: 0,
    trocarDeConta: 0,
    ultimaAtualizacao: null
};

// Rota POST com validação
app.post("/loginDados", async (req, res) => {
    console.log("Corpo recebido:", req.body); // Debug crucial

    if (!req.body || !req.body.usuario) {
        return res.status(400).json({ erro: "Usuário é obrigatório" });
    }

    const { usuario, trocar } = req.body;

    try {
        const respostaPessoa = await db.query(
            "SELECT id_pessoa, id_tipo_usuario FROM pessoa WHERE nome = ?", 
            [usuario]
        );
        
        if (respostaPessoa.length > 0) {
            estadoLogin.id_pessoa = Number(respostaPessoa[0].id_pessoa);
            estadoLogin.tipo_usuario = Number(respostaPessoa[0].id_tipo_usuario);

            const respostaCarrinho = await db.query(
                "SELECT SUM(quantidade_pendente) AS numero_carrinho FROM vw_quantidade_pendente WHERE id_pessoa = ?", 
                [estadoLogin.id_pessoa] 
            );

            estadoLogin.quantidade_produtos = respostaCarrinho.length > 0 ? Number(respostaCarrinho[0].numero_carrinho || 0) : 0;
        } else {
            estadoLogin.id_pessoa = null;
        }

        estadoLogin.usuario = usuario;
        estadoLogin.trocarDeConta = Number(trocar) || 0;
        estadoLogin.ultimaAtualizacao = new Date();

        res.json({
            status: "sucesso",
            usuario: estadoLogin.usuario,
            id_pessoa: estadoLogin.id_pessoa,
            tipo_usuario: estadoLogin.tipo_usuario,
            quantidade: estadoLogin.quantidade_produtos,
            trocar: estadoLogin.trocarDeConta,
            atualizadoEm: estadoLogin.ultimaAtualizacao
        });
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ erro: "Erro interno no servidor", detalhes: error.message });
    }
});

// Rota GET
app.get("/loginDados", (req, res) => {
    res.json(estadoLogin);
});

// Rota para buscar produtos em promoção
app.get("/produtos", async (req, res) => {
    try {
        const produtos = await db.query(`
            SELECT * FROM produto 
            WHERE promocao = true AND ativo = true
            ORDER BY id_produto DESC
            LIMIT 12
        `);

        res.json({
            success: true,
            data: produtos || []
        });
    } catch (err) {
        console.error("Erro ao buscar produtos:", err);
        res.status(500).json({
            erro: "Erro ao buscar produtos",
            detalhes: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    }
});

// Inicia o servidor na porta especificada no .env
const porta = process.env.PORTA3 || 3000;
app.listen(porta, () => {
    console.log(`Servidor de autenticação rodando na porta ${porta}`);
    console.log(`Valor inicial de trocarDeConta: ${estadoLogin.trocarDeConta}`);
});