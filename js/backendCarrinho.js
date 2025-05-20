require("dotenv").config();
const express = require("express");
const cors = require("cors");
const database = require('./conexao');
const app = express();
const db = new database();

// Configurações
app.use(express.json());
app.use(cors());

// Rota para buscar produtos
app.post('/buscar-produtos', async (req, res) => {
    try {
        const { id_pessoa } = req.body;

        if (!id_pessoa) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "ID da pessoa é obrigatório"
            });
        }

        console.log(`Buscando produtos para ID: ${id_pessoa}`);

        // Consulta ao banco de dados - forma correta
        const resultado = await db.query("SELECT * FROM vw_carrinho_itens_detalhados WHERE id_pessoa = ? AND situacao ='P'", [id_pessoa]);
        
        return res.json({
            sucesso: true,
            produtos: resultado
        });



    } catch (erro) {
        console.error("Erro ao buscar produtos:", erro);
        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno no servidor",
            detalhes: erro.message
        });
    }
});

// Rota de teste
app.get('/teste', (req, res) => {
    res.json({ mensagem: "API está funcionando!" });
});

// Iniciar servidor
const PORT = process.env.PORTA7 || 3006;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});