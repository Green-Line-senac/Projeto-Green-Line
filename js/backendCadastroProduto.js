require("dotenv").config();
const express = require("express");
const cors = require("cors");
const conexao = require('./conexao.js');

const app = express();
const db = new conexao();

// Configurações
app.use(express.json({ limit: '10mb' }));
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
}));

// Rota de cadastro de produto
app.post('/cadastro-produto', async (req, res) => {
    try {
        const { imagem_1, imagem_2, ...outrosDados } = req.body;

        if (!outrosDados.nome || !outrosDados.categoria) {
            return res.status(400).json({ error: "Nome e categoria são obrigatórios" });
        }

        const sql = `
            INSERT INTO produto (
                produto, descricao, descricao_curta, preco, 
                preco_promocional, promocao, marca, avaliacao, 
                quantidade_avaliacoes, estoque, parcelas_permitidas, 
                peso_kg, dimensoes, ativo, imagem_1, imagem_2, categoria
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            outrosDados.nome,
            outrosDados.descricao_detalhada || '',
            outrosDados.descricao_curta || '',
            parseFloat(outrosDados.preco) || 0,
            parseFloat(outrosDados.preco_promocional) || 0,
            outrosDados.promocao ? 1 : 0,
            outrosDados.marca || '',
            parseInt(outrosDados.avaliacao) || 0,
            parseInt(outrosDados.quantidade_avaliacao) || 0,
            parseInt(outrosDados.estoque) || 0,
            parseInt(outrosDados.parcelas) || 0,
            parseFloat(outrosDados.peso) || 0,
            outrosDados.dimensoes || '0x0x0',
            outrosDados.ativo ? 1 : 0,
            imagem_1 || "https://www.malhariapradense.com.br/wp-content/uploads/2017/08/produto-sem-imagem.png",
            imagem_2 || "https://www.malhariapradense.com.br/wp-content/uploads/2017/08/produto-sem-imagem.png",
            outrosDados.categoria
        ]);

        res.status(201).json({
            success: true,
            produtoId: result.insertId,
            mensagem: "Produto cadastrado com sucesso"
        });

    } catch (error) {
        console.error("Erro no cadastro:", error);
        res.status(500).json({
            error: "Erro interno no servidor",
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Iniciar servidor
const PORT = process.env.PORTA6 || 3005;
app.listen(PORT, () => {
    console.log(`Servidor rodando - backendCadastroProduto - na porta ${PORT}`);
});
