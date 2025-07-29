require('dotenv').config();
const express = require('express');
const conexao = require('./conexao.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const app = express();
let db = new conexao();
app.use(express.json());
app.use(cors());


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

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '../img/index_carousel') // Pasta onde as imagens serão salvas
  },
  filename: function (req, file, cb) {
    // Gera um nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'carrossel-' + uniqueSuffix + '.' + file.originalname.split('.').pop())
  }
})

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos!'), false)
    }
  }
})


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
        buscar: 'GET /pessoa/:id_pessoa/enderecos',
        atualizar: 'PUT /pessoa/:id_pessoa/enderecos'
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
  try {
    const { email, senha } = req.body;
    
    // Buscar usuário
    const [users] = await db.query(
      'SELECT id_pessoa, nome, email, senha, id_tipo_usuario FROM pessoa WHERE email = ?', 
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const user = users[0];
    
    // Buscar informações de login
    const [logins] = await db.query('SELECT * FROM login WHERE id_pessoa = ?', [user.id_pessoa]);
    if (logins.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const login = logins[0];
    
    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, login.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    
    const token = jwt.sign(
  { 
    userId: user.id_pessoa, // Certifique-se que está usando id_pessoa
    email: user.email,
    tipo_usuario: user.id_tipo_usuario 
  },
  process.env.SEGREDO_JWT,
  { expiresIn: '1h' }
);

    console.log('Token JWT gerado:', token);
    
    const isAdmin = user.email === "greenl.adm@gmail.com" || user.id_tipo_usuario === 1;

      // Retornar token e user com isAdmin
      res.json({ 
        token, 
        user: { 
          id_pessoa: user.id_pessoa,
          email: user.email,
          tipo_usuario: user.id_tipo_usuario,
          isAdmin 
        } 
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro no servidor' });
  }

  // Middleware de autenticação


});

app.get('/profile', async (req, res) => {
  try {
    // Verificar token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    const decoded = jwt.verify(token, SEGREDO_JWT);
    
    // Buscar usuário
    const [users] = await db.query('SELECT * FROM pessoa WHERE id_pessoa = ?', [decoded.id_pessoa]);
    console.log('Usuários encontrados:', users);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const user = users[0];
    
    // Remover dados sensíveis antes de enviar
    delete user.cpf;
    
    res.json(user);
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
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
app.get('/pessoa/:id_pessoa', verificarToken, async (req, res) => {
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

// buscar pedidos do usuário
app.get('/pessoa/:id_pessoa/pedidos', async (req, res) => {
  try {
    const idPessoa = req.params.id_pessoa;
    const [rows] = await db.query(
      'SELECT * FROM pedidos WHERE id_pessoa = ?',
      [idPessoa]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum pedido encontrado para este usuário' });
    }

    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar pedidos:', err);
    res.status(500).json({ error: 'Erro ao buscar pedidos', details: err.message });
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
app.get('/pessoa/:id_pessoa/enderecos', async (req, res) => {
    try {
        const idPessoa = req.params.id_pessoa;

        // Execute a consulta e capture o resultado completo
        const queryResult = await db.query(
            'SELECT id_endereco, uf, cep, cidade, bairro, endereco, complemento FROM enderecos WHERE id_pessoa = ?',
            [idPessoa]
        );
        console.log("Resultado bruto da consulta GET de endereço:", queryResult);

        let rows;
        // Adapte esta parte dependendo do que seu db.query realmente retorna
        // Se db.query retorna [rows, fields], então:
        if (Array.isArray(queryResult) && Array.isArray(queryResult[0])) {
            rows = queryResult[0];
        } else { // Se db.query retorna apenas as rows diretamente:
            rows = queryResult;
        }

        // Verifique se 'rows' é um array e se tem elementos antes de acessar .length
        if (Array.isArray(rows) && rows.length > 0) {
            res.json(rows[0]); // Retorna o primeiro endereço encontrado
        } else {
            // Se nenhum endereço for encontrado, retorna 404
            return res.status(404).json({ error: 'Endereço não encontrado' });
        }
    } catch (err) {
        console.error('Erro detalhado ao buscar endereço:', err); // Log mais detalhado
        res.status(500).json({ error: 'Erro ao buscar endereço', details: err.message }); // Inclua detalhes do erro
        console.error('Erro detalhado ao buscar endereço:', err); // Log mais detalhado
        res.status(500).json({ error: 'Erro ao buscar endereço', details: err.message }); // Inclua detalhes do erro
    }
});
app.put('/pessoa/:id_pessoa/enderecos', async (req, res) => {
    try {
        const { uf, cep, cidade, bairro, endereco, complemento } = req.body;
        const idPessoa = parseInt(req.params.id_pessoa);
        if (isNaN(idPessoa) || idPessoa <= 0) {
            console.error('Erro de validação: ID de pessoa inválido para atualização/inserção de endereço:', req.params.id_pessoa);
            return res.status(400).json({ error: 'ID inválido' });
        }

        // Verifica se já existe um endereço para esta pessoa
        const queryResult = await db.query('SELECT id_endereco FROM enderecos WHERE id_pessoa = ?', [idPessoa]);
        
        let existingRows;
        if (Array.isArray(queryResult) && Array.isArray(queryResult[0])) {
            existingRows = queryResult[0];
        } else {
            existingRows = queryResult;
        }

        if (Array.isArray(existingRows) && existingRows.length > 0) {
            // Se o endereço existe, atualiza
            await db.query(
                'UPDATE enderecos SET uf = ?, cep = ?, cidade = ?, bairro = ?, endereco = ?, complemento = ? WHERE id_pessoa = ?',
                [uf, cep, cidade, bairro, endereco, complemento, idPessoa]
            );
            console.log(`Endereço atualizado para pessoa ID: ${idPessoa}`);
        } else {
            // Se o endereço não existe, insere um novo
            await db.query(
                'INSERT INTO enderecos (id_pessoa, uf, cep, cidade, bairro, endereco, complemento) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [idPessoa, uf, cep, cidade, bairro || null, endereco || null, complemento || null]
            );
            console.log(`Novo endereço inserido para pessoa ID: ${idPessoa}`);
        }

        res.json({ message: 'Endereço atualizado com sucesso' });
    } catch (err) {
        console.error('Erro detalhado ao tentar atualizar/inserir endereço:', err); // Log mais detalhado
        res.status(500).json({ error: 'Erro ao atualizar endereço', details: err.message });
    }
});
// Rota para listar todos os usuários (apenas para ADMs)
app.get('/pessoa', async (req, res) => {
    try {
        // Verificar se o usuário é ADM
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }else{ console.log('Token do ADM recebido:', token);}
        
        const decoded = jwt.verify(token, SEGREDO_JWT);
       
        
        // Verificar se o usuário é administrador
        const [isAdmin] = await db.query('SELECT email FROM pessoa WHERE id_pessoa = ?', [decoded.id_pessoa]);
        if (isAdmin.length === 0 || isAdmin[0].email !== "greenl.adm@gmail.com") {
          console.log('Usuário não é administrador:', decoded.id_pessoa)
          return res.status(403).json({ error: 'Acesso negado - apenas administradores' });
        }
        
        // Buscar todos os usuários (exceto senhas)
        const [rows] = await db.query(`SELECT id_pessoa, nome, email, telefone, cpf, id_tipo_usuario, situacao, imagem_perfil 
            FROM pessoa`);
        
        res.json(rows);
    } catch (err) {
        console.error('Erro ao listar usuários:', err);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

// GET /pedidos/todos
app.get('/pedidos/todos', async (req, res) => {
  try {
    const [pedidos] = await conexao.execute(`
      SELECT 
        p.id_pedido,
        p.numero_pedido,
        p.data_hora,
        p.situacao,
        p.valor_total,
        pe.nome AS nome_usuario,
        pe.email,
        pe.telefone,
        pp.nome_produto,
        pp.quantidade,
        pp.preco_unitario
      FROM pedidos p
      JOIN pessoa pe ON pe.id_pessoa = p.id_pessoa
      JOIN pedido_produto pp ON pp.id_pedido = p.id_pedido
      ORDER BY p.data_hora DESC
    `);
    
    res.json(pedidos);
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    res.status(500).json({ erro: 'Erro ao buscar pedidos' });
  }
});


// GET /pedidos/todos
app.get('/pedidos/todos', async (req, res) => {
  try {
    const [pedidos] = await conexao.execute(`
      SELECT 
        p.id_pedido,
        p.numero_pedido,
        p.data_hora,
        p.situacao,
        p.valor_total,
        pe.nome AS nome_usuario,
        pe.email,
        pe.telefone,
        pp.nome_produto,
        pp.quantidade,
        pp.preco_unitario
      FROM pedidos p
      JOIN pessoa pe ON pe.id_pessoa = p.id_pessoa
      JOIN pedido_produto pp ON pp.id_pedido = p.id_pedido
      ORDER BY p.data_hora DESC
    `);
    
    res.json(pedidos);
  } catch (err) {
    console.error("Erro ao buscar pedidos:", err);
    res.status(500).json({ erro: 'Erro ao buscar pedidos' });
  }
});


//Rota atualizar tipo de usuário
app.put('/pessoa/:id_pessoa/tipo', async (req, res) => {
    try {
        const { id_tipo_usuario } = req.body;
        const idPessoa = parseInt(req.params.id_pessoa);
        
        if (isNaN(idPessoa) || idPessoa <= 0) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        // Verifica se o tipo de usuário é válido
        if (![1, 2].includes(id_tipo_usuario)) {
            return res.status(400).json({ error: 'Tipo de usuário inválido' });
        }

        const [result] = await db.query(
            'UPDATE pessoa SET id_tipo_usuario = ? WHERE id_pessoa = ?',
            [id_tipo_usuario, idPessoa]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json({ message: 'Tipo de usuário atualizado com sucesso' });
    } catch (err) {
        console.error('Erro ao atualizar tipo de usuário:', err);
        res.status(500).json({ error: 'Erro ao atualizar tipo de usuário' });
    }
});

// Rota para obter imagens do carrossel
app.get('/carousel-images', (req, res) => {
    try {
        // Simulando leitura do arquivo JSON
        const carouselData = require('./carousel-index.json');
        res.json(carouselData);
    } catch (err) {
        console.error('Erro ao carregar imagens do carrossel:', err);
        res.status(500).json({ error: 'Erro ao carregar imagens do carrossel' });
    }
});

// Rota para deletar imagem do carrossel
app.post('/delete-carousel-image', (req, res) => {
    try {
        const { imageName } = req.body;
        
        // Simulando atualização do arquivo JSON
        const carouselData = require('./carousel-index.json');
        const updatedData = carouselData.filter(img => img.nomeImagem !== imageName);
        
        // Aqui você salvaria o updatedData de volta no arquivo JSON
        // fs.writeFileSync('./carousel-index.json', JSON.stringify(updatedData, null, 2));
        
        res.json({ success: true, message: 'Imagem removida com sucesso' });
    } catch (err) {
        console.error('Erro ao remover imagem do carrossel:', err);
        res.status(500).json({ success: false, message: 'Erro ao remover imagem' });
    }
});

// Rota para upload de novas imagens do carrossel
app.post('/upload-carousel-images', upload.array('carouselImages'), (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: 'Nenhuma imagem enviada' });
        }
        
        // Simulando atualização do carrossel
        const carouselData = require('./carousel-index.json');
        
        files.forEach(file => {
            // Aqui você moveria o arquivo para o diretório de imagens
            // e adicionaria ao carrossel-index.json
            const newImage = {
                nomeImagem: file.originalname
            };
            carouselData.push(newImage);
        });
        
        // Aqui você salvaria o carouselData de volta no arquivo JSON
        // fs.writeFileSync('./carousel-index.json', JSON.stringify(carouselData, null, 2));
        
        res.json({ success: true, message: 'Imagens adicionadas com sucesso' });
    } catch (err) {
        console.error('Erro ao adicionar imagens ao carrossel:', err);
        res.status(500).json({ success: false, message: 'Erro ao adicionar imagens' });
    }
});

// ==================== INICIAR SERVIDOR ====================
const PORTA8 = process.env.PORTA8 || 3008;
app.listen(PORTA8, () => {
  console.log(`✅ Servidor rodando na porta ${PORTA8}`);
  console.log(`🔗 Acesse a documentação em http://localhost:${PORTA8}/`);
  console.log(`🔗 Acesse a API em http://localhost:${PORTA8}/pessoa`);

});