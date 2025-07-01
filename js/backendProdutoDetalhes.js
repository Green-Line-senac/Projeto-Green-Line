const express = require("express");
const cors = require("cors");
const Conexao = require("./conexao");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(cors({ origin: "*" }));

// Inicializa a conexão com o banco de dados
const db = new Conexao();

// POST - Criar nova avaliação
router.post('/', async (req, res) => {
  try {
    const { id_produto, id_pessoa, nota, comentario } = req.body;
    
    // Validações básicas
    if (!id_produto || !id_pessoa || !nota) {
      return res.status(400).json({ 
        sucesso: false,
        mensagem: 'Dados incompletos' 
      });
    }

    // Verifica se o usuário já avaliou este produto
    const [avaliacaoExistente] = await db.query(
      'SELECT * FROM avaliacoes WHERE id_produto = ? AND id_pessoa = ?',
      [id_produto, id_pessoa]
    );

    if (avaliacaoExistente.length > 0) {
      // Atualiza avaliação existente
      await db.query(
        'UPDATE avaliacoes SET nota = ?, comentario = ? WHERE id_avaliacao = ?',
        [nota, comentario, avaliacaoExistente[0].id_avaliacao]
      );
    } else {
      // Cria nova avaliação
      await db.query(
        'INSERT INTO avaliacoes (id_produto, id_pessoa, nota, comentario) VALUES (?, ?, ?, ?)',
        [id_produto, id_pessoa, nota, comentario]
      );
    }

    res.json({ 
      sucesso: true,
      mensagem: 'Avaliação salva com sucesso!' 
    });

  } catch (error) {
    console.error('Erro ao salvar avaliação:', error);
    res.status(500).json({ 
      sucesso: false,
      mensagem: 'Erro interno no servidor' 
    });
  }
});

// GET - Listar avaliações de um produto
router.get('/', async (req, res) => {
  try {
    const { id_produto } = req.query;

    if (!id_produto) {
      return res.status(400).json({ 
        sucesso: false,
        mensagem: 'ID do produto não informado' 
      });
    }


    
    // Busca avaliações
    const [avaliacoes] = await db.query(
      `SELECT a.*, p.nome as nome_pessoa 
       FROM avaliacoes a
       JOIN pessoas p ON a.id_pessoa = p.id_pessoa
       WHERE a.id_produto = ?
       ORDER BY a.data DESC
       LIMIT 5`,
      [id_produto]
    );

    // Calcula média
    const [media] = await db.query(
      'SELECT AVG(nota) as media, COUNT(*) as total FROM avaliacoes WHERE id_produto = ?',
      [id_produto]
    );

    res.json({
      sucesso: true,
      avaliacoes,
      media: Number(media[0].media) || 0,
      total: media[0].total || 0
    });

  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    res.status(500).json({ 
      sucesso: false,
      mensagem: 'Erro ao buscar avaliações' 
    });
  }
});

module.exports = router;