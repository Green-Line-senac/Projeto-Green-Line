require('dotenv').config();
const express = require('express');
const conexao = require('../conexao.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
let db = new conexao();
app.use(express.json());
app.use(cors());

/*
// Configuração do MySQL
let db;
mysql.createConnection({
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
})
.then(connection => {
  db = connection;
  console.log('✅ Conectado ao MySQL');
})
.catch(err => {
  console.error('❌ Erro no MySQL:', err.message);
});*/

// ==================== FUNÇÕES AUXILIARES ====================
const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const gerarHashSenha = async (senha) => {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(senha, salt);
  return { hash, salt };
};

// ==================== ROTAS ====================

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'API de Usuários Segura',
    endpoints: {
      cadastro: 'POST /pessoa',
      login: 'POST /login',
      listar: 'GET /pessoa',
      buscar: 'GET /pessoa/:id_pessoa',
      atualizar: 'PUT /pessoa/:id_pessoa',
      deletar: 'DELETE /pessoa/:id_pessoa',
      endereco: {
        buscar: 'GET /pessoa/:id_pessoa/endereco',
        atualizar: 'PUT /pessoa/:id_pessoa/endereco'
      },
      pagamentos: {
        listar: 'GET /pessoa/:id_pessoa/pagamentos',
        adicionar: 'POST /pessoa/:id_pessoa/pagamentos',
        remover: 'DELETE /pessoa/:id_pessoa/pagamentos/:id'
      },
      imagem: 'PUT /pessoa/:id_pessoa/imagem'
    }
  });
});

// [1] CADASTRO (POST)
app.post('/pessoa', async (req, res) => {
  const { nome, email, telefone, cpf, id_tipo_usuario, senha, situacao, imagem_perfil } = req.body;

  // Validações
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  }

  if (!validarEmail(email)) {
    return res.status(400).json({ error: 'Formato de e-mail inválido' });
  }

  if (senha.length < 2) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 2 caracteres' });
  }

  try {
    // Verifica se usuário já existe
    const [existing] = await db.query('SELECT id_pessoa FROM pessoa WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }

    // Gera hash da senha
    const { hash, salt } = await gerarHashSenha(senha);

    // Insere no banco
    const [result] = await db.query('INSERT INTO pessoa SET ?', {
      nome,
      email,
      telefone,
      cpf,
      id_tipo_usuario: id_tipo_usuario || 1, // Default para usuário comum
      senha_hash: hash,
      senha_salt: salt,
      situacao: situacao || 'A', // Default para ativo
      imagem_perfil: imagem_perfil || null
    });

    res.status(201).json({
      id_pessoa: result.insertId,
      message: 'Usuário criado com sucesso',
      pessoa: { nome, email, telefone, cpf, id_tipo_usuario, situacao, imagem_perfil }
    });

  } catch (err) {
    console.error('Erro no cadastro:', err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// [2] LOGIN (POST)
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  try {
    // Busca pessoa
    const [pessoa] = await db.query('SELECT * FROM pessoa WHERE email = ?', [email]);
    if (pessoa.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = pessoa[0];

    // Verifica senha
    const senhaValida = await bcrypt.compare(senha, user.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gera token simples (em produção, use JWT)
    const token = crypto.randomBytes(16).toString('hex');

    res.json({
      id_pessoa: user.id_pessoa,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
      cpf: user.cpf,
      id_tipo_usuario: user.id_tipo_usuario,
      situacao: user.situacao,
      imagem_perfil: user.imagem_perfil,
      token
    });

  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// [3] LISTAR USUÁRIOS (GET)
app.get('/pessoa', async (req, res) => {
  try {
    let rows;
    const resposta = await db.query('SELECT id_pessoa, nome, email, telefone, cpf, id_tipo_usuario, situacao, imagem_perfil FROM pessoa');
    console.log(resposta);
    rows = resposta;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// [4] BUSCAR USUÁRIO POR ID (GET)
app.get('/pessoa/:id_pessoa', async (req, res) => {
  try {
    console.log('Buscando usuário com ID:', req.params.id_pessoa);
    const id = parseInt(req.params.id_pessoa);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    let rows;
    const resposta = await db.query(
      'SELECT id_pessoa, nome, email, telefone, cpf, id_tipo_usuario, situacao, imagem_perfil FROM pessoa WHERE id_pessoa = ?',
      [id]
    );
    console.log('Resposta da consulta:', resposta);
    rows = resposta;
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        details: `Nenhum usuário encontrado com o ID ${id}`
      });
    }
    
    res.json(rows);
  } catch (err) {
    console.error('Erro detalhado:', err);
    res.status(500).json({ 
      error: 'Erro ao buscar usuário',
      details: err.message 
    });
  }
});

// [5] ATUALIZAR USUÁRIO (PUT)
app.put("/pessoa/:id_pessoa", async (req, res) => {
  const { id_pessoa } = req.params;
  const { nome, telefone } = req.body;

  try {
    const [result] = await db.query(
      "UPDATE pessoa SET nome = ?, telefone = ? WHERE id_pessoa = ?",
      [nome, telefone, id_pessoa]
    );
    if (result.affectedRows > 0) {
      res.json({ message: "Pessoa atualizada com sucesso" });
    } else {
      res.status(404).json({ error: "Pessoa não encontrada" });
    }
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar pessoa" });
  }
});

// [6] DELETAR USUÁRIO (DELETE)
app.delete('/pessoa/:id_pessoa', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM pessoa WHERE id_pessoa = ?', [req.params.id_pessoa]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

// [7] OBTER DADOS DO USUÁRIO LOGADO (GET)
app.get('/pessoa/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    // Em produção, decodifique o token JWT para obter o ID
    const userId = req.body.userId || req.query.userId;
    
    const [rows] = await db.query(
      'SELECT id_pessoa, nome, email, telefone, cpf, situacao, imagem_perfil FROM pessoa WHERE id_pessoa = ?',
      [userId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    res.status(500).json({ 
      error: 'Erro ao buscar usuário',
      details: err.message 
    });
  }
});

// [8] ATUALIZAR IMAGEM DE PERFIL (PUT)
app.put('/pessoa/:id_pessoa/imagem', async (req, res) => {
    try {
        const { imagem_perfil } = req.body;
        const id = parseInt(req.params.id_pessoa);
        
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        const [result] = await db.query(
            'UPDATE pessoa SET imagem_perfil = ? WHERE id_pessoa = ?',
            [imagem_perfil, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json({ message: 'Imagem de perfil atualizada com sucesso' });
    } catch (err) {
        console.error('Erro ao atualizar imagem:', err);
        res.status(500).json({ error: 'Erro ao atualizar imagem de perfil' });
    }
});

// [9] ROTAS PARA ENDEREÇO
app.get('/pessoa/:id_pessoa/endereco', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM enderecos WHERE id_pessoa = ?', [req.params.id_pessoa]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Endereço não encontrado' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar endereço' });
    }
});

app.put('/pessoa/:id_pessoa/endereco', async (req, res) => {
    try {
        const { cep, logradouro, numero, complemento, cidade, estado } = req.body;
        const idPessoa = req.params.id_pessoa;

        // Verifica se já existe endereço
        const [existing] = await db.query('SELECT id FROM enderecos WHERE id_pessoa = ?', [idPessoa]);
        
        if (existing.length > 0) {
            // Atualiza existente
            await db.query(
                'UPDATE enderecos SET cep = ?, logradouro = ?, numero = ?, complemento = ?, cidade = ?, estado = ? WHERE id_pessoa = ?',
                [cep, logradouro, numero, complemento, cidade, estado, idPessoa]
            );
        } else {
            // Cria novo
            await db.query(
                'INSERT INTO enderecos (id_pessoa, cep, logradouro, numero, complemento, cidade, estado) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [idPessoa, cep, logradouro, numero, complemento, cidade, estado]
            );
        }
        
        res.json({ message: 'Endereço atualizado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar endereço' });
    }
});

// [10] ROTAS PARA MÉTODOS DE PAGAMENTO
app.get('/pessoa/:id_pessoa/pagamentos', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, tipo, numero FROM metodos_pagamento WHERE id_pessoa = ?', [req.params.id_pessoa]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar métodos de pagamento' });
    }
});

app.post('/pessoa/:id_pessoa/pagamentos', async (req, res) => {
    try {
        const { tipo, numero } = req.body;
        await db.query(
            'INSERT INTO metodos_pagamento (id_pessoa, tipo, numero) VALUES (?, ?, ?)',
            [req.params.id_pessoa, tipo, numero]
        );
        res.status(201).json({ message: 'Método de pagamento adicionado' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao adicionar método de pagamento' });
    }
});

app.delete('/pessoa/:id_pessoa/pagamentos/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM metodos_pagamento WHERE id = ? AND id_pessoa = ?', [req.params.id, req.params.id_pessoa]);
        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: 'Erro ao remover método de pagamento' });
    }
});



// ==================== INICIAR SERVIDOR ====================
const PORTA8 = process.env.PORTA8 || 3008;
app.listen(PORTA8, () => {
  console.log(`✅ Servidor rodando na porta ${PORTA8}`);
  console.log(`🔗 Acesse a documentação em http://localhost:${PORTA8}/`);
  console.log(`🔗 Acesse a API em http://localhost:${PORTA8}/pessoa`);

});