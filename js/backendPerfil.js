// backendPerfil.js (Código Atualizado)

require('dotenv').config();
const express = require('express');
const conexao = require('./conexao.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

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
    const uploadPath = path.join(__dirname, '..', 'img', 'index_carousel');
    // Cria a pasta se não existir
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'carrossel-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    }
  }
});


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
        userId: user.id_pessoa, 
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


// [3] LISTAR USUÁRIOS (GET) - Versão para ADM
app.get('/pessoa', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }
        
        const decoded = jwt.verify(token, process.env.SEGREDO_JWT);
       
        // Verificar se o usuário é administrador (exemplo de e-mail fixo)
        const [isAdmin] = await db.query('SELECT email FROM pessoa WHERE id_pessoa = ?', [decoded.userId]);
        if (isAdmin.length === 0 || isAdmin[0].email !== "greenl.adm@gmail.com") {
          return res.status(403).json({ error: 'Acesso negado - apenas administradores' });
        }
        
        const [rows] = await db.query(`SELECT id_pessoa, nome, email, telefone, cpf, id_tipo_usuario, situacao, imagem_perfil 
            FROM pessoa`);
        
        res.json(rows);
    } catch (err) {
        console.error('Erro ao listar usuários:', err);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});


// [4] BUSCAR USUÁRIO POR ID (GET)
app.get('/pessoa/:id_pessoa', verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id_pessoa);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const [rows] = await db.query(
      'SELECT id_pessoa, nome, email, telefone, cpf, id_tipo_usuario, situacao, imagem_perfil FROM pessoa WHERE id_pessoa = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.json(rows);
  } catch (err) {
    console.error('Erro detalhado:', err);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// [5] ATUALIZAR USUÁRIO (PUT)
app.put("/pessoa/:id_pessoa", verificarToken, async (req, res) => {
  const { id_pessoa } = req.params;
  const { nome, telefone } = req.body;

  if (parseInt(id_pessoa) !== req.usuario.userId) {
    return res.status(403).json({ error: "Não autorizado a atualizar este perfil" });
  }

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
    console.error("Erro ao atualizar pessoa:", err);
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
app.get('/pessoa/me', verificarToken, async (req, res) => {
  try {
    const userId = req.usuario.userId;
    
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
app.put('/pessoa/:id_pessoa/imagem', verificarToken, async (req, res) => {
    try {
        const { imagem_perfil } = req.body;
        const id = parseInt(req.params.id_pessoa);
        
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        
        if (id !== req.usuario.userId) {
            return res.status(403).json({ error: 'Não autorizado a atualizar a imagem deste perfil' });
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
app.get('/pessoa/:id_pessoa/enderecos', verificarToken, async (req, res) => {
    try {
        const idPessoa = req.params.id_pessoa;
        
        if (parseInt(idPessoa) !== req.usuario.userId) {
            return res.status(403).json({ error: 'Não autorizado a ver este endereço' });
        }

        const [rows] = await db.query(
            'SELECT id_endereco, uf, cep, cidade, bairro, endereco, complemento FROM enderecos WHERE id_pessoa = ?',
            [idPessoa]
        );

        if (rows && rows.length > 0) {
            res.json(rows[0]);
        } else {
            return res.status(404).json({ error: 'Endereço não encontrado' });
        }
    } catch (err) {
        console.error('Erro detalhado ao buscar endereço:', err);
        res.status(500).json({ error: 'Erro ao buscar endereço', details: err.message });
    }
});

app.put('/pessoa/:id_pessoa/enderecos', verificarToken, async (req, res) => {
    try {
        const { uf, cep, cidade, bairro, endereco, complemento } = req.body;
        const idPessoa = req.params.id_pessoa;

        if (parseInt(idPessoa) !== req.usuario.userId) {
            return res.status(403).json({ error: 'Não autorizado a atualizar este endereço' });
        }

        const [existingRows] = await db.query('SELECT id_endereco FROM enderecos WHERE id_pessoa = ?', [idPessoa]);
        
        if (existingRows && existingRows.length > 0) {
            await db.query(
                'UPDATE enderecos SET uf = ?, cep = ?, cidade = ?, bairro = ?, endereco = ?, complemento = ? WHERE id_pessoa = ?',
                [uf, cep, cidade, bairro, endereco, complemento, idPessoa]
            );
        } else {
            await db.query(
                'INSERT INTO enderecos (id_pessoa, uf, cep, cidade, bairro, endereco, complemento) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [idPessoa, uf, cep, cidade, bairro || null, endereco || null, complemento || null]
            );
        }

        res.json({ message: 'Endereço atualizado com sucesso' });
    } catch (err) {
        console.error('Erro detalhado ao tentar atualizar/inserir endereço:', err);
        res.status(500).json({ error: 'Erro ao atualizar endereço', details: err.message });
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

// Pedidos

app.get('/pessoa/pedidos', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }
        
        const decoded = jwt.verify(token, process.env.SEGREDO_JWT);
       
        // Verificar se o usuário é administrador (exemplo de e-mail fixo)
        const [isAdmin] = await db.query('SELECT email FROM pessoa WHERE id_pessoa = ?', [decoded.userId]);
        if (isAdmin.length === 0) {
          return res.status(403).json({ error: 'Acesso negado - apenas administradores' });
        }
        
        const [rows] = await db.query(`SELECT * FROM vw_carrinho_itens_detalhados`);
        
        res.json(rows);
    } catch (err) {
        console.error('Erro ao listar usuários:', err);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

// app.get('/pessoa/pedidos', verificarToken, async (req, res) => {
//   try {
//     const { userId } = req.usuario;

//     // Verificar se é administrador
//     const [adminRows] = await db.query(
//       'SELECT id_tipo_usuario FROM pessoa WHERE id_pessoa = ?',
//       [userId]
//     );

//     if (adminRows.length === 0 || adminRows[0].id_tipo_usuario !== 1) {
//       return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem visualizar todos os pedidos.' });
//     }

//     // Consulta dos pedidos com os campos corretos
//     const [pedidos] = await db.query(`
//       SELECT 
//         p.id_pedido,
//         p.numero_pedido,
//         p.data_hora,
//         p.situacao,
//         p.valor_total,
//         p.pagamento_situacao,
//         pes.nome AS nome_cliente
//       FROM pedidos p
//       JOIN pessoa pes ON pes.id_pessoa = p.id_pessoa
//       ORDER BY p.data_hora DESC
//     `);

//     res.json(pedidos);
//   } catch (err) {
//     console.error('Erro ao buscar pedidos:', err);
//     res.status(500).json({ error: 'Erro ao buscar pedidos.' });
//   }
// });



app.get('/pessoa/:id_pessoa/pedidos', verificarToken, async (req, res) => {
    try {
        const { id_pessoa } = req.params;
        
        // Proteção: Garante que o usuário só possa ver os próprios pedidos
        if (parseInt(id_pessoa) !== req.usuario.userId) {
            return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para visualizar este histórico de pedidos.' });
        }

        const [pedidos] = await db.query(
            `SELECT
                p.id_pedido,
                p.numero_pedido,
                p.data_hora,
                p.situacao,
                p.valor_total,
                p.pagamento_situacao
            FROM pedidos p
            WHERE p.id_pessoa = ?
            ORDER BY p.data_hora DESC`,
            [id_pessoa]
        );

        res.json(pedidos);
    } catch (err) {
        console.error('Erro ao buscar pedidos do usuário:', err);
        res.status(500).json({ error: 'Erro ao buscar histórico de pedidos.' });
    }
});


// Rota para obter imagens do carrossel
app.get('/carousel-images', (req, res) => {
    try {
        const carouselData = JSON.parse(fs.readFileSync(path.join(__dirname, 'carousel-index.json'), 'utf8'));
        res.json(carouselData);
    } catch (err) {
        console.error('Erro ao carregar imagens do carrossel:', err);
        res.status(500).json({ error: 'Erro ao carregar imagens do carrossel' });
    }
});

// Rota para deletar imagem do carrossel (Método DELETE)
app.delete('/carousel-image/:imageName', (req, res) => {
    const { imageName } = req.params;
    const jsonPath = path.join(__dirname, 'carousel-index.json');
    const imagePath = path.join(__dirname, '..', 'img', 'index_carousel', imageName);
    
    try {
        // Ler o JSON
        const carouselData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        
        // Filtrar a imagem a ser deletada
        const updatedData = carouselData.filter(img => path.basename(img.nomeImagem) !== imageName);
        
        // Salvar o JSON atualizado
        fs.writeFileSync(jsonPath, JSON.stringify(updatedData, null, 2));
        
        // Deletar o arquivo de imagem
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
        
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
        
        const jsonPath = path.join(__dirname, 'carousel-index.json');
        const carouselData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        
        files.forEach(file => {
            const newImage = {
                nomeImagem: path.join('..', 'img', 'index_carousel', path.basename(file.filename))
            };
            carouselData.push(newImage);
        });
        
        fs.writeFileSync(jsonPath, JSON.stringify(carouselData, null, 2));
        
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
});