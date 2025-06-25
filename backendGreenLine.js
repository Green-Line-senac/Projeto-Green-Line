require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Database = require("./conexao");
const funcoes = require("./funcoes");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

let estadoLogin = {
    usuario: null,
    id_pessoa: null,
    tipo_usuario: 2,
    quantidade_produtos: 0,
    trocarDeConta: 0,
    ultimaAtualizacao: null
};

const app = express();
app.use(express.json({ limit: "100mb" }));
app.use(cors());
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, '..')));

const db = new Database();
const funcoesUteis = new funcoes();
const segredo = process.env.SEGREDO_JWT;

//BACKEND CADASTRO
app.post("/cadastrarUsuario", async (req, res) => {
  const { nome, email, cpf, telefone, senha } = req.body;

  const inserirPessoa = `INSERT INTO pessoa(nome, email, cpf, telefone,id_tipo_usuario, senha, situacao, imagem_perfil) 
    VALUES (?, ?, ?, ?, 2, ?, 'P', 'perfil.png')`;
  const selecionarId = `SELECT id_pessoa FROM pessoa WHERE email = ? ORDER BY id_pessoa DESC LIMIT 1`;

  try {
    const senhaCriptografada = await bcrypt.hash(senha, 10);
    await db.query(inserirPessoa, [
      nome,
      email,
      cpf,
      telefone,
      senhaCriptografada,
    ]);

    const resultadoId = await db.query(selecionarId, [email]);
    if (resultadoId.length === 0) {
      return res
        .status(400)
        .json({ erro: "Erro ao recuperar o ID da pessoa." });
    }
    try {
      await funcoesUteis.enviarEmail(email);
    } catch (erro) {
      return res.status(500).json({ erro: "Erro ao enviar o email" });
    }
    res
      .status(200)
      .json({
        mensagem:
          "Cadastro realizado com sucesso! Verifique seu e-mail para confirmação.",
      });
  } catch (err) {
    res.status(500).json({ erro: "Erro durante o processo de cadastro." });
  }
});

app.get("/validar", async (req, res) => {
  const { token } = req.query;
  const atualizarSituacao =
    "UPDATE pessoa SET situacao = 'A' WHERE id_pessoa = ?";
  const sql =
    "SELECT id_pessoa FROM pessoa WHERE situacao = 'P' AND email = ?;";

  try {
    const payload = jwt.verify(token, segredo);
    const email = payload.email;

    const resultado = await db.query(sql, [email]);

    if (resultado.length > 0) {
      const id_pessoa = resultado[0].id_pessoa;
      try {
        await db.query(atualizarSituacao, [id_pessoa]);
        res.sendFile(path.resolve(__dirname, "public/confirmacaoLogin.html"), (err) => {
          if (err) {
            res.status(404).send("Página não encontrada!");
          }
        });
      } catch (erro) {
        res.sendFile(path.resolve(__dirname, "public/erro.html"));
      }
    } else {
      res.sendFile(path.resolve(__dirname, "public/erro.html"));
    }
  } catch (erro) {
    res.sendFile(path.join(__dirname, "public/tokenExpirado.html"));
  }
});

app.get("/verificarEmail", async (req, res) => {
  const { email } = req.query;
  const sql = "SELECT COUNT(*) AS total FROM pessoa WHERE email = ?";

  try {
    const verificacao = await db.query(sql, [email]);
    const existe = verificacao[0].total > 0;
    res.json({ existe });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao verificar o email" });
  }
});

app.get("/verificarCPF", async (req, res) => {
  const { cpf } = req.query;
  const sql = "SELECT COUNT(*) AS total FROM pessoa WHERE cpf = ?";

  try {
    const verificacao = await db.query(sql, [cpf]);
    const existe = verificacao[0].total > 0;
    res.json({ existe });
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao verificar o cpf" });
  }
});

// ==================== BACKEND PRODUTOS ====================
app.get("/produto", async (req, res) => {
  try {
    const produtos = await db.query("SELECT * FROM produto");

    if (!produtos || produtos.length === 0) {
      return res.status(404).json({ mensagem: "Nenhum produto encontrado" });
    }

    res.json(produtos);
  } catch (err) {
    res.status(500).json({
      erro: "Erro ao buscar produtos",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

app.post("/pedidos", async (req, res) => {
  res.status(200).json({ mensagem: "Pedido recebido" });
});

app.post("/carrinho", async (req, res) => {
  let { id_pessoa, id_produto, quantidade } = req.body;

  if (!id_pessoa || !id_produto || !quantidade) {
    return res.status(400).json({
      codigo: 0,
      mensagem: "Dados incompletos",
    });
  }

  try {
    let carrinhos = await db.query(
      "SELECT id_carrinho FROM carrinho WHERE id_pessoa = ? AND situacao = ?",
      [id_pessoa, "P"]
    );

    let id_carrinho;

    if (carrinhos.length === 0) {
      let result = await db.query(
        'INSERT INTO carrinho (id_pessoa, situacao) VALUES (?, "P")',
        [id_pessoa]
      );
      id_carrinho = result.insertId;
    } else {
      id_carrinho = carrinhos[0].id_carrinho;
    }

    const itens = await db.query(
      "SELECT * FROM view_carrinho_produtos WHERE id_pessoa = ? AND id_produto = ? AND situacao_item = ? ",
      [id_pessoa, id_produto, "P"]
    );

    if (itens.length > 0) {
      return res.status(200).json({
        codigo: 1,
        mensagem: "ITEM_DUPLICADO",
        sucesso: false,
      });
    }

    await db.query(
      "INSERT INTO carrinho_itens (id_carrinho, id_produto, quantidade) VALUES (?, ?, ?)",
      [id_carrinho, id_produto, quantidade]
    );

    res.status(201).json({
      codigo: 2,
      mensagem: "Item adicionado ao carrinho com sucesso",
      sucesso: true,
      id_carrinho: id_carrinho,
    });
  } catch (error) {
    res.status(500).json({
      codigo: -1,
      mensagem: "Erro interno no servidor",
      sucesso: false,
    });
  }
});

app.get("/produtosEspecificos", async (req, res) => {
  try {
    let categoriaCodificada = req.query.categoria;

    if (!categoriaCodificada) {
      return res.status(400).json({
        mensagem: "Categoria não informada.",
        codigo: -1,
      });
    }

    let categoria = decodeURIComponent(categoriaCodificada);
    produtosCategoria = await db.query(
      "SELECT * FROM produto WHERE categoria = ? AND ativo = TRUE",
      [categoria]
    );

    if (produtosCategoria.length === 0) {
      return res.status(404).json({
        mensagem: "Nenhum produto encontrado para essa categoria.",
        codigo: 0,
      });
    }

    res.status(200).json(produtosCategoria);
  } catch (erro) {
    res.status(500).json({
      mensagem: "Erro interno no servidor ao buscar produtos.",
      codigo: -1,
      detalhes:
        process.env.NODE_ENV === "development" ? erro.message : undefined,
    });
  }
});

// ==================== BACKEND PADRÃO ====================
app.get("/enviar-email", async (req, res) => {
    const email = req.query.email?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ conclusao: 1, mensagem: "Email inválido" });
    }

    try {
        await funcoesUteis.enviarEmail(email);
        return res.json({ conclusao: 2, mensagem: "Email enviado com sucesso" });
    } catch (erro) {
        return res.status(500).json({ conclusao: 3, mensagem: "Falha ao enviar email" });
    }
});

// ==================== BACKEND LOGIN ====================
// Middleware para verificar o token JWT
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

// Rota de verificação de conta
app.post('/verificarConta', async (req, res) => {
  try {
      const { usuario, senha } = req.body;

      // Validação dos campos
      if (!usuario || !senha) {
          return res.status(400).json({ 
              dadosValidos: -1, 
              mensagem: "Usuário e senha são obrigatórios." 
          });
      }

      // Prevenção contra SQL Injection
      if (typeof usuario !== 'string' || typeof senha !== 'string') {
          return res.status(400).json({ 
              dadosValidos: -1, 
              mensagem: "Dados inválidos." 
          });
      }

      // Consulta ao banco de dados
      let sql = usuario.includes("@") 
          ? `SELECT * FROM pessoa WHERE email = ?` 
          : `SELECT * FROM pessoa WHERE nome = ?`;

      const pesquisa = await db.query(sql, [usuario]);

      if (pesquisa.length === 0) {
          return res.status(404).json({ 
              dadosValidos: 0, 
              mensagem: "Conta não encontrada." 
          });
      }

      const { id_pessoa, situacao, senha: senhaHash, id_tipo_usuario, email, nome } = pesquisa[0];

      // Verificação da situação da conta
      if (situacao !== 'A') {
          return res.status(403).json({ 
              dadosValidos: 1, 
              mensagem: "Conta pendente ou bloqueada." 
          });
      }

      // Verificação da senha
      const senhaCorreta = await bcrypt.compare(senha, senhaHash);
      if (!senhaCorreta) {
          return res.status(401).json({ 
              dadosValidos: 3, 
              mensagem: "Usuário ou senha incorretos." 
          });
      }

      // Verificação adicional para admin
      if (id_tipo_usuario === 1 && !email.endsWith('.adm@')) {
          return res.status(403).json({ 
              dadosValidos: 1, 
              mensagem: "Conta admin requer verificação adicional." 
          });
      }

      // Geração do token JWT
      const token = jwt.sign(
          { 
              id_pessoa: id_pessoa,
              email: email,
              tipo_usuario: id_tipo_usuario 
          },
          process.env.SEGREDO_JWT,
          { expiresIn: '1h' }
      );

      // Resposta de sucesso
    const isAdmin = email === "greenl.adm@gmail.com";

      // Envia isso para o frontend
      return res.status(200).json({
      dadosValidos: 2,
      token,
      user: {
          id_pessoa,
          email,
          isAdmin
      }
      });

  } catch (error) {
      console.error("Erro ao verificar conta:", error);
      return res.status(500).json({ 
          error: "Erro interno do servidor. Tente novamente mais tarde." 
      });
  }
});

// Rota para enviar e-mail de verificação
app.post("/enviarEmail", async (req, res) => {
  try {
      const { usuario } = req.body;
      
      if (!usuario) {
          return res.status(400).json({ 
              error: "Usuário é obrigatório." 
          });
      }

      await funcoesUteis.enviarEmail(usuario);
      res.status(200).json({ 
          mensagem: "E-mail enviado com sucesso." 
      });
  } catch (error) {
      console.error("Erro ao enviar e-mail:", error);
      res.status(500).json({ 
          error: "Erro ao enviar e-mail de verificação." 
      });
  }
});

// ==================== BACKEND INDEX ====================
app.post("/loginDados", async (req, res) => {
    if (!req.body || !req.body.usuario) {
        return res.status(400).json({ erro: "Usuário é obrigatório" });
    }

    const { usuario, trocar } = req.body;
    console.log("Dados recebidos para login:", { usuario, trocar });

    try {
        const respostaPessoa = await db.query(
            "SELECT id_pessoa, id_tipo_usuario FROM pessoa WHERE nome = ?",
            [usuario]
        );

        if (respostaPessoa.length > 0) {
            estadoLogin.id_pessoa = Number(respostaPessoa[0].id_pessoa);
            estadoLogin.tipo_usuario = Number(respostaPessoa[0].id_tipo_usuario);

            let respostaCarrinho = await db.query(
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
        console.log(estadoLogin);

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
        res.status(500).json({ erro: "Erro interno no servidor", detalhes: error.message });
    }
});

app.get("/loginDados", async (req, res) => {
    try {
        let respostaCarrinho = await db.query(
            "SELECT SUM(quantidade_pendente) AS numero_carrinho FROM vw_quantidade_pendente WHERE id_pessoa = ?",
            [estadoLogin.id_pessoa]
        );

        estadoLogin.quantidade_produtos = respostaCarrinho.length > 0 ? Number(respostaCarrinho[0].numero_carrinho || 0) : 0;

        res.json(estadoLogin);
    } catch (error) {
        res.status(500).json({ erro: "Erro ao buscar estado de login", detalhes: error.message });
    }
});

app.post('/logout', (req, res) => {
    estadoLogin = {
        usuario: null,
        id_pessoa: null,
        tipo_usuario: 2,
        quantidade_produtos: 0,
        trocarDeConta: 0,
        ultimaAtualizacao: null
    };
    
    res.status(200).json({ status: "sucesso", mensagem: "Usuário desconectado com sucesso" });
});

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
        res.status(500).json({
            erro: "Erro ao buscar produtos",
            detalhes: process.env.NODE_ENV === "development" ? err.message : undefined
        });
    }
});

// ==================== BACKEND CADASTRO PRODUTO ====================
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
        res.status(500).json({
            error: "Erro interno no servidor",
            detalhes: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ==================== BACKEND CARRINHO ====================
app.post('/buscar-produtos', async (req, res) => {
    try {
        const { id_pessoa } = req.body;

        if (!id_pessoa) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "ID da pessoa é obrigatório"
            });
        }

        const resultado = await db.query("SELECT * FROM vw_carrinho_itens_detalhados WHERE id_pessoa = ? AND situacao_item = 'P'", [id_pessoa]);

        return res.json({
            sucesso: true,
            produtos: resultado
        });

    } catch (erro) {
        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno no servidor",
            detalhes: erro.message
        });
    }
});

app.post('/excluir-produtos', async (req, res) => {
    try {
        const { id_produto, id_carrinho } = req.body;

        if (!id_produto && !id_carrinho) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "ID produto e carrinho não estão aqui"
            });
        }

        try {
            await db.query("UPDATE carrinho_itens SET situacao ='R' WHERE id_produto = ? AND id_carrinho = ?;", [id_produto, id_carrinho]);
        } catch (erro) {
            return res.json({
                sucesso: false,
                mensagem: "Item não excluido",
                codigo: 2
            });
        }
        return res.json({
            sucesso: true,
            mensagem: "Item Excluído com sucesso",
            codigo: 3
        });

    } catch (erro) {
        return res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno no servidor",
            codigo: 1,
            detalhes: erro.message
        });
    }
});

// ==================== BACKEND VENDAS ====================
app.get("/checar-cep",async(req,res) => {
    let cep = req.query.cep;
    if (!cep) {
        return res.status(400).json({ error: "CEP não informado",codigo: -1 });
    }

    cep = cep.replace(/\D/g, ''); 

    if(cep.length != 8 ){
        return res.status(400).json({ error: "CEP inválido", codigo: -3 });
    }
    try{
        let requisicao = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
        let resposta = requisicao.data;
        if(resposta.erro){
            return res.status(404).json({ error: "CEP não encontrado", codigo: -4 });
        }
        return res.status(200).json(resposta);  
    }catch (error) {
        return res.status(500).json({ error: "Erro ao consultar CEP", codigo: -2 });
    }
});

// ==================== ROTA DE TESTE ====================
app.get("/teste", (req, res) => {
  res.json({ mensagem: "API está funcionando!" });
});

// ==================== INICIAR SERVIDOR ====================
app.listen(3010, () => {
  console.log("🚀 SERVIDOR RODANDO NO ONLINE");
});