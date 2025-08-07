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
const multer = require("multer");

const app = express();
app.use(express.json({ limit: "100mb" }));
app.use(cors());
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "..")));
const templatePath = path.join(__dirname, 'templates', 'email-pedido-confirmado.html');

const db = new Database();

// Verificar se a classe funcoes foi carregada corretamente
console.log("Carregando classe funcoes...", typeof funcoes);
const funcoesUteis = new funcoes();
console.log("Instância funcoesUteis criada:", typeof funcoesUteis.enviarEmail);

const segredo = process.env.SEGREDO_JWT;



//BACKEND CADASTRO
app.post("/cadastrarUsuario", async (req, res) => {
  const { nome, email, cpf, telefone, senha } = req.body;

  if (!nome || !email || !cpf || !telefone || !senha) {
    return res.status(400).json({ erro: "Todos os campos são obrigatórios." });
  }

  try {
    // 1. Criptografa senha
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    // 2. Insere pessoa
    await db.query(
      `INSERT INTO pessoa(nome, email, cpf, telefone, id_tipo_usuario, senha, situacao, imagem_perfil) 
       VALUES (?, ?, ?, ?, 2, ?, 'P', 'https://cdn-icons-png.flaticon.com/512/6460/6460121.png')`,
      [nome, email, cpf, telefone, senhaCriptografada]
    );

    // 3. Obtém ID da pessoa inserida - FORMA CORRETA para sua classe Conexao
    const resultado = await db.query(
      `SELECT id_pessoa FROM pessoa WHERE email = ? ORDER BY id_pessoa DESC LIMIT 1`,
      [email]
    );

    if (!resultado || resultado.length === 0) {
      return res
        .status(400)
        .json({ erro: "Falha ao obter ID do usuário cadastrado." });
    }

    const idPessoa = resultado[0].id_pessoa;
    console.log("ID obtido:", idPessoa); // Para debug

    // 4. Insere endereço padrão
    await db.query(
      `INSERT INTO enderecos(uf, cep, cidade, bairro, endereco, complemento, situacao, id_pessoa) 
       VALUES('DF', NULL, NULL, NULL, NULL, NULL, 'A', ?)`,
      [idPessoa]
    );

    // 5. Envia e-mail (opcional)
    try {
      await funcoesUteis.enviarEmail(
        email,
        "Confirmação de email",
        "confirmacao",
        null
      );
    } catch (erroEmail) {
      console.error("Falha no envio do e-mail:", erroEmail);
    }

    return res.status(200).json({
      success: true,
      message: "Cadastro realizado com sucesso!",
    });
  } catch (err) {
    console.error("Erro no cadastro:", err);

    if (err.code === "ER_DUP_ENTRY") {
      const campo = err.message.includes("email") ? "E-mail" : "CPF";
      return res.status(400).json({ erro: `${campo} já está cadastrado` });
    }

    return res.status(500).json({ erro: "Erro interno no servidor" });
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
        res.sendFile(
          path.resolve(__dirname, "public/confirmacaoLogin.html"),
          (err) => {
            if (err) {
              res.status(404).send("Página não encontrada!");
            }
          }
        );
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
app.get("/redefinir-senha", async (req, res) => {
  const { token } = req.query;
  let senha = "123GL";
  const senhaCriptografada = await bcrypt.hash(senha, 10);
  const atualizarSituacao = "UPDATE pessoa SET senha = ? WHERE id_pessoa = ?";
  const sql =
    "SELECT id_pessoa FROM pessoa WHERE situacao = 'A' AND email = ?;";

  try {
    const payload = jwt.verify(token, segredo);
    const email = payload.email;

    const resultado = await db.query(sql, [email]);

    if (resultado.length > 0) {
      const id_pessoa = resultado[0].id_pessoa;
      try {
        await db.query(atualizarSituacao, [senhaCriptografada, id_pessoa]);
        res.sendFile(
          path.resolve(__dirname, "public/senhaRedefinida.html"),
          (err) => {
            if (err) {
              res.status(404).send("Página não encontrada!");
            }
          }
        );
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
    if (verificacao[0].total > 0) {
      res.json({ codigo: 1, mensagem: "Email cadastrado" });
    } else {
      res.json({ codigo: 2, mensagem: "Email disponível" });
    }
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao verificar o email" });
  }
});

app.get("/verificarCPF", async (req, res) => {
  const { cpf } = req.query;
  const sql = "SELECT COUNT(*) AS total FROM pessoa WHERE cpf = ?";

  try {
    const verificacao = await db.query(sql, [cpf]);
    if (verificacao[0].total > 0) {
      res.json({ codigo: 1, mensagem: "CPF cadastrado" });
    } else {
      res.json({ codigo: 2, mensagem: "CPF disponível" });
    }
  } catch (erro) {
    res.status(500).json({ erro: "Erro ao verificar o cpf" });
  }
});

// ==================== BACKEND PRODUTOS ====================
app.get("/produto", async (req, res) => {
  try {
    const produtos = await db.query(`
      SELECT p.*, 
             AVG(a.nota) AS avaliacao, 
             COUNT(DISTINCT a.id_avaliacao) AS numAvaliacoes
      FROM produto p
      LEFT JOIN avaliacoes a ON a.id_produto = p.id_produto
      GROUP BY p.id_produto
    `);

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
  let { id_pessoa, id_produto, quantidade, tamanho } = req.body;

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
      "INSERT INTO carrinho_itens (id_carrinho, id_produto, quantidade, tamanho) VALUES (?, ?, ?, ?)",
      [id_carrinho, id_produto, quantidade, tamanho || null]
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
      `SELECT p.*, 
              AVG(a.nota) AS avaliacao, 
              COUNT(DISTINCT a.id_avaliacao) AS numAvaliacoes
       FROM produto p
       LEFT JOIN avaliacoes a ON a.id_produto = p.id_produto
       WHERE p.categoria = ? AND p.ativo = TRUE
       GROUP BY p.id_produto`,
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
app.post("/enviar-email", async (req, res) => {
  // 1. Extrai e valida campos obrigatórios
  const { assunto, tipo, email: rawEmail, pedido } = req.body;

  if (!assunto || !tipo) {
    return res.status(400).json({
      conclusao: 1,
      mensagem: "Assunto e tipo são obrigatórios",
    });
  }

  // 2. Limpeza e validação do email
  const email = rawEmail?.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({
      conclusao: 1,
      mensagem: "Email inválido ou não fornecido",
    });
  }

  try {
    console.log("Tentando enviar email...", { email, tipo, assunto });

    if (!funcoesUteis || typeof funcoesUteis.enviarEmail !== 'function') {
      throw new Error("Função enviarEmail não está disponível");
    }

    await funcoesUteis.enviarEmail(email, assunto, tipo, pedido);

    console.log("Email enviado com sucesso");
    return res.json({
      conclusao: 2,
      mensagem: "Email enviado com sucesso",
      detalhes: { email, tipo },
    });
  } catch (erro) {
    console.error("Falha no envio de email:", {
      message: erro.message,
      stack: erro.stack,
      email,
      tipo
    });

    return res.status(500).json({
      conclusao: 3,
      mensagem: "Falha ao enviar email",
      erro: erro.message,
      stack: erro.stack
    });
  }
});

// ==================== ROTA DE SOLICITAÇÃO DE ATUALIZAÇÕES DE PEDIDO ====================
app.post("/solicitar-atualizacoes", async (req, res) => {
  const { email, numeroPedido } = req.body;
  if (!email || !numeroPedido) {
    return res
      .status(400)
      .json({ mensagem: "Email e número do pedido são obrigatórios." });
  }
  try {
    await funcoesUteis.enviarEmail(
      email,
      `Atualizações do Pedido ${numeroPedido}`,
      "atualizacao-pedido",
      { numeroPedido }
    );
    res.status(200).json({ mensagem: "Solicitação de atualizações enviada!" });
  } catch (erro) {
    console.error("Erro ao enviar atualizações por e-mail:", erro);
    res
      .status(500)
      .json({ mensagem: "Erro ao enviar atualizações por e-mail." });
  }
});

// ==================== BACKEND LOGIN ====================

// Rota de verificação de conta
app.post("/verificarConta", async (req, res) => {
  try {
    const { usuario, senha } = req.body;

    // Validação dos campos
    if (!usuario || !senha) {
      return res.status(400).json({
        dadosValidos: -1,
        mensagem: "Usuário e senha são obrigatórios.",
      });
    }

    // Prevenção contra SQL Injection
    if (typeof usuario !== "string" || typeof senha !== "string") {
      return res.status(400).json({
        dadosValidos: -1,
        mensagem: "Dados inválidos.",
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
        mensagem: "Conta não encontrada.",
      });
    }

    const {
      id_pessoa,
      situacao,
      senha: senhaHash,
      id_tipo_usuario,
      email,
      nome,
    } = pesquisa[0];

    // Verificação da situação da conta
    if (situacao !== "A") {
      return res.status(403).json({
        dadosValidos: 1,
        mensagem: "Conta pendente ou bloqueada.",
      });
    }

    // Verificação da senha
    const senhaCorreta = await bcrypt.compare(senha, senhaHash);
    if (!senhaCorreta) {
      return res.status(401).json({
        dadosValidos: 3,
        mensagem: "Usuário ou senha incorretos.",
      });
    }

    // Verificação do tipo de usuário
    let tipoUsuario = "";
    let isAdmin = false;

    if (id_tipo_usuario === 1) {
      tipoUsuario = "Administrador";
      isAdmin = true;
    } else if (id_tipo_usuario === 2) {
      tipoUsuario = "Cliente";
      isAdmin = false;
    } else {
      return res.status(403).json({
        dadosValidos: 1,
        mensagem: "Tipo de usuário inválido.",
      });
    }
    let respostaCarrinho = await db.query(
      "SELECT SUM(quantidade_pendente) AS numero_carrinho FROM vw_quantidade_pendente WHERE id_pessoa = ?",
      [id_pessoa]
    );
    let carrinho =
      respostaCarrinho.length > 0
        ? Number(respostaCarrinho[0].numero_carrinho || 0)
        : 0;

    // Geração do token JWT
    const token = jwt.sign(
      {
        id_pessoa: id_pessoa,
        email: email,
        tipo_usuario: id_tipo_usuario,
      },
      process.env.SEGREDO_JWT,
      { expiresIn: "1h" }
    );

    // Envia isso para o frontend
    return res.status(200).json({
      dadosValidos: 2,
      token,
      user: {
        id_pessoa,
        email,
        nome,
        isAdmin,
        tipoUsuario,
        carrinho,
        id_tipo_usuario,
      },
    });
  } catch (error) {
    console.error("Erro ao verificar conta:", error);
    return res.status(500).json({
      error: "Erro interno do servidor. Tente novamente mais tarde.",
    });
  }
});

// Rota para enviar e-mail de verificação
app.post("/enviarEmail", async (req, res) => {
  try {
    const { usuario } = req.body;

    if (!usuario) {
      return res.status(400).json({
        error: "Usuário é obrigatório.",
      });
    }

    await funcoesUteis.enviarEmail(usuario);
    res.status(200).json({
      mensagem: "E-mail enviado com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    res.status(500).json({
      error: "Erro ao enviar e-mail de verificação.",
    });
  }
});

//===================BACKEND RECUPERAR SENHA ==================
app.post("/recuperar-senha", async (req, res) => {
  try {
    const { email: rawEmail } = req.body;

    // Validação básica do email
    if (!rawEmail) {
      return res.status(400).json({
        conclusao: 1,
        mensagem: "Email não informado.",
      });
    }

    const email = rawEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        conclusao: 1,
        mensagem: "Email inválido.",
      });
    }

    // Verificar se o email existe no banco de dados
    const [usuario] = await db.query(
      `SELECT id_pessoa, email FROM pessoa WHERE email = ? LIMIT 1`,
      [email]
    );

    // Sempre retornar sucesso, mesmo se o email não existir (para evitar vazamento)
    if (!usuario || usuario.length === 0) {
      console.log(
        `Tentativa de recuperação para email não cadastrado: ${email}`
      );
      return res.status(200).json({
        conclusao: 2,
        mensagem:
          "Se o email estiver cadastrado, você receberá instruções em breve.",
      });
    }

    // Se o email existe, enviar o email de recuperação
    await funcoesUteis.enviarEmail(
      email,
      "Redefinir senha - GreenLine",
      "recuperacao"
    );

    return res.status(200).json({
      conclusao: 2,
      mensagem:
        "Se o email estiver cadastrado, você receberá instruções em breve.",
    });
  } catch (erro) {
    console.error("Erro no processo de recuperação:", erro);
    return res.status(500).json({
      conclusao: 3,
      mensagem: "Erro interno no servidor ao processar recuperação de senha.",
    });
  }
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
      data: produtos || [],
    });
  } catch (err) {
    res.status(500).json({
      erro: "Erro ao buscar produtos",
      detalhes:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ==================== BACKEND CADASTRO PRODUTO ====================
app.post("/cadastro-produto", async (req, res) => {
  try {
    const { imagem_1, imagem_2, ...outrosDados } = req.body;

    if (!outrosDados.nome || !outrosDados.categoria) {
      return res
        .status(400)
        .json({ error: "Nome e categoria são obrigatórios" });
    }

    const sql = `
            INSERT INTO produto (
                produto, descricao, descricao_curta, preco, 
                preco_promocional, promocao, marca, avaliacao, 
                quantidade_avaliacoes, estoque, parcelas_permitidas, 
                peso_kg, dimensoes, ativo, imagem_1, imagem_2, categoria,
                tem_tamanho, tamanhos, tem_medidas, comprimento, 
                largura_medida, altura_medida, diametro, capacidade, 
                unidade_medida, observacoes_medidas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    const result = await db.query(sql, [
      outrosDados.nome,
      outrosDados.descricao || "",
      outrosDados.descricao_curta || "",
      parseFloat(outrosDados.preco) || 0,
      parseFloat(outrosDados.preco_promocional) || 0,
      outrosDados.promocao ? 1 : 0,
      outrosDados.marca || "",
      parseInt(outrosDados.avaliacao) || 0,
      parseInt(outrosDados.quantidade_avaliacoes) || 0,
      parseInt(outrosDados.estoque) || 0,
      parseInt(outrosDados.parcelas_permitidas) || 1,
      parseFloat(outrosDados.peso_kg) || 0,
      outrosDados.dimensoes || "0x0x0",
      outrosDados.ativo ? 1 : 0,
      imagem_1 ||
      "https://www.malhariapradense.com.br/wp-content/uploads/2017/08/produto-sem-imagem.png",
      imagem_2 ||
      "https://www.malhariapradense.com.br/wp-content/uploads/2017/08/produto-sem-imagem.png",
      outrosDados.categoria,
      // Novos campos de tamanho e medidas
      outrosDados.tem_tamanho ? 1 : 0,
      outrosDados.tamanhos || null,
      outrosDados.tem_medidas ? 1 : 0,
      outrosDados.comprimento ? parseFloat(outrosDados.comprimento) : null,
      outrosDados.largura_medida ? parseFloat(outrosDados.largura_medida) : null,
      outrosDados.altura_medida ? parseFloat(outrosDados.altura_medida) : null,
      outrosDados.diametro ? parseFloat(outrosDados.diametro) : null,
      outrosDados.capacidade ? parseFloat(outrosDados.capacidade) : null,
      outrosDados.unidade_medida || null,
      outrosDados.observacoes_medidas || null
    ]);

    res.status(201).json({
      success: true,
      produtoId: result.insertId,
      mensagem: "Produto cadastrado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao cadastrar produto:", error);
    res.status(500).json({
      error: "Erro interno no servidor",
      detalhes:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ==================== BACKEND CARRINHO ====================
app.post("/buscar-produtos", async (req, res) => {
  try {
    const { id_pessoa } = req.body;

    if (!id_pessoa) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID da pessoa é obrigatório",
      });
    }

    const resultado = await db.query(
      "SELECT * FROM vw_carrinho_itens_detalhados WHERE id_pessoa = ? AND situacao_item = 'P'",
      [id_pessoa]
    );

    return res.json({
      sucesso: true,
      produtos: resultado,
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor",
      detalhes: erro.message,
    });
  }
});

app.post("/excluir-produtos", async (req, res) => {
  try {
    const { id_produto, id_carrinho } = req.body;

    if (!id_produto && !id_carrinho) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID produto e carrinho não estão aqui",
      });
    }

    try {
      await db.query(
        "UPDATE carrinho_itens SET situacao ='R' WHERE id_produto = ? AND id_carrinho = ?;",
        [id_produto, id_carrinho]
      );
    } catch (erro) {
      return res.json({
        sucesso: false,
        mensagem: "Item não excluido",
        codigo: 2,
      });
    }
    return res.json({
      sucesso: true,
      mensagem: "Item Excluído com sucesso",
      codigo: 3,
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor",
      codigo: 1,
      detalhes: erro.message,
    });
  }
});

// ==================== BACKEND VENDAS ====================
app.get("/checar-cep", async (req, res) => {
  let cep = req.query.cep;
  if (!cep) {
    return res.status(400).json({ error: "CEP não informado", codigo: -1 });
  }

  cep = cep.replace(/\D/g, "");

  if (cep.length != 8) {
    return res.status(400).json({ error: "CEP inválido", codigo: -3 });
  }
  try {
    let requisicao = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
    let resposta = requisicao.data;
    if (resposta.erro) {
      return res.status(404).json({ error: "CEP não encontrado", codigo: -4 });
    }
    return res.status(200).json(resposta);
  } catch (error) {
    console.error("Erro detalhado ao consultar CEP:", error);
    return res.status(500).json({ error: "Erro ao consultar CEP", codigo: -2 });
  }
});
app.post("/salvar-pedido", async (req, res) => {
  let pedido = req.body;

  try {
    // Validação básica
    if (
      !pedido ||
      !pedido.numeroPedido ||
      !pedido.produtos ||
      pedido.produtos.length === 0 ||
      !pedido.idPessoa
    ) {
      return res
        .status(400)
        .json({ error: "Dados do pedido inválidos", codigo: -1 });
    }

    console.log("✅ Validação básica passou");

    const formaPagamento = pedido.formaPagamentoVendas;

    // Se for string (PIX ou BB)
    if (formaPagamento === "PIX" || formaPagamento === "BB") {
      const sql = `
        INSERT INTO pedidos(
          numero_pedido,
          id_pessoa,
          tipo_pagamento,
          valor_total,
          nome_titular,
          metodo_entrega,
          previsao_entrega,
          valor_frete,
          subtotal,
          desconto
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      await db.query(sql, [
        pedido.numeroPedido,
        pedido.idPessoa,
        formaPagamento,
        pedido.total,
        pedido.nomeTitular,
        pedido.metodoEntrega,
        pedido.previsaoEntrega,
        pedido.frete,
        pedido.subtotal,
        pedido.desconto,
      ]);
    }

    // Se for objeto (Cartão)
    else if (
      typeof formaPagamento === "object" &&
      (formaPagamento.metodoPagamento === "CC" ||
        formaPagamento.metodoPagamento === "DEB")
    ) {
      const tipoPagamento =
        formaPagamento.metodoPagamento === "CC" ? "CRÉDITO" : "DÉBITO";

      const sql = `
        INSERT INTO pedidos(
          numero_pedido,
          id_pessoa,
          tipo_pagamento,
          valor_total,
          num_parcelas,
          numero_cartao,
          nome_cartao,
          validade_cartao,
          cvv,
          nome_titular,
          metodo_entrega,
          previsao_entrega,
          valor_frete,
          subtotal,
          desconto
        ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      await db.query(sql, [
        pedido.numeroPedido,
        pedido.idPessoa,
        tipoPagamento,
        pedido.total,
        formaPagamento.parcelas?.replace("x", "") || 1,
        formaPagamento.numeroCartao,
        formaPagamento.nomeCartao,
        formaPagamento.validadeCartao,
        formaPagamento.cvv,
        pedido.nomeTitular,
        pedido.metodoEntrega,
        pedido.previsaoEntrega,
        pedido.frete,
        pedido.subtotal,
        pedido.desconto,
      ]);
    }

    // Forma de pagamento inválida
    else {
      return res
        .status(400)
        .json({ error: "Método de pagamento inválido", codigo: -3 });
    }

    // Obter ID do pedido recém inserido
    const ultimoPedido = await db.query(
      "SELECT id_pedido FROM pedidos WHERE numero_pedido = ? ORDER BY id_pedido DESC LIMIT 1",
      [pedido.numeroPedido]
    );
    const idPedido = ultimoPedido[0].id_pedido;

    // Inserir produtos e atualizar estoque

    for (const produto of pedido.produtos) {
      const produtoExistente = await db.query(
        "SELECT id_produto, produto, estoque FROM produto WHERE produto = ? LIMIT 1",
        [produto.nome]
      );

      if (!produtoExistente || produtoExistente.length === 0) {
        // Tentar buscar por ID se disponível
        if (produto.id_produto) {
          const produtoPorId = await db.query(
            "SELECT id_produto, produto, estoque FROM produto WHERE id_produto = ? LIMIT 1",
            [produto.id_produto]
          );

          if (produtoPorId && produtoPorId.length > 0) {
            produtoExistente[0] = produtoPorId[0];
          } else {
            continue;
          }
        } else {
          continue;
        }
      }

      const produtoInfo = produtoExistente[0];
      const estoqueAtual = parseInt(produtoInfo.estoque) || 0;
      const quantidadeComprada = parseInt(produto.quantidade) || 1;

      if (estoqueAtual < quantidadeComprada) {
        return res.status(400).json({
          error: `Estoque insuficiente para o produto ${produto.nome}. Disponível: ${estoqueAtual}`,
          codigo: -4,
          produto: produto.nome,
          estoqueDisponivel: estoqueAtual,
          quantidadeSolicitada: quantidadeComprada,
        });
      }

      await db.query(
        `INSERT INTO pedido_produto(
          id_pedido, id_produto, quantidade, preco_unitario, nome_produto
        ) VALUES(?, ?, ?, ?, ?)`,
        [
          idPedido,
          produtoInfo.id_produto,
          quantidadeComprada,
          produto.preco,
          produto.nome,
        ]
      );

      const novoEstoque = estoqueAtual - quantidadeComprada;

      // Executar update do estoque
      await db.query("UPDATE produto SET estoque = ? WHERE id_produto = ?", [
        novoEstoque,
        produtoInfo.id_produto,
      ]);
    }

    // ✅ Enviar email de confirmação
    try {
      // Buscar dados do cliente para o email
      const clienteData = await db.query(
        "SELECT nome, email FROM pessoa WHERE id_pessoa = ?",
        [pedido.idPessoa]
      );

      if (clienteData && clienteData.length > 0) {
        const cliente = clienteData[0];

        // Preparar dados do pedido para o email
        const metodoPagamento = typeof pedido.formaPagamentoVendas === 'string'
          ? pedido.formaPagamentoVendas
          : (pedido.formaPagamentoVendas?.metodoPagamento || 'Não informado');

        const pedidoParaEmail = {
          numeroPedido: pedido.numeroPedido || 'N/A',
          nomeTitular: pedido.nomeTitular || cliente.nome || 'Cliente',
          nomeCliente: cliente.nome || 'Cliente',
          email: cliente.email,
          dataConfirmacao: new Date().toLocaleDateString('pt-BR'),
          metodoPagamento: metodoPagamento,
          total: parseFloat(pedido.total) || 0,
          subtotal: parseFloat(pedido.subtotal) || parseFloat(pedido.total) || 0,
          frete: parseFloat(pedido.frete) || 0,
          metodoEntrega: pedido.metodoEntrega || 'Entrega padrão',
          previsaoEntrega: pedido.previsaoEntrega || '5-7 dias úteis',
          endereco: pedido.endereco || pedido.enderecoCompleto || 'Endereço não informado',
          produtos: pedido.produtos || []
        };

        await funcoesUteis.enviarEmail(
          cliente.email,
          `Pedido Confirmado - ${pedido.numeroPedido}`,
          "pedido_confirmado",
          pedidoParaEmail
        );
      }
    } catch (emailError) {
      console.error("Erro ao enviar email de confirmação:", emailError);
      // Não falha o pedido por causa do email
    }

    // ✅ Finaliza com sucesso e encerra a função
    console.log("🎉 === PEDIDO SALVO COM SUCESSO ===");
    console.log("📊 Resumo do processamento:");
    console.log("   - ID do pedido:", idPedido);
    console.log("   - Número do pedido:", pedido.numeroPedido);
    console.log("   - Produtos processados:", pedido.produtos.length);
    console.log("   - Total do pedido:", pedido.total);
    console.log("🏁 === FIM DA ROTA /salvar-pedido ===");

    return res.status(200).json({
      mensagem: "Pedido cadastrado com sucesso",
      idPedido: idPedido,
      produtosProcessados: pedido.produtos.length
    });

    // 🚫 Nada deve vir depois deste return
  } catch (erro) {
    console.error("💥 === ERRO CRÍTICO NA ROTA /salvar-pedido ===");
    console.error("🔥 Tipo do erro:", erro.name);
    console.error("🔥 Mensagem:", erro.message);
    console.error("🔥 Stack trace:", erro.stack);
    console.error("🔥 Dados do pedido que causaram erro:", JSON.stringify(pedido, null, 2));
    console.error("💥 === FIM DO ERRO ===");

    return res.status(500).json({
      erro: "Erro ao processar pedido",
      codigo: -2,
      detalhe: erro.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== ROTA PARA CANCELAR PEDIDO E RESTAURAR ESTOQUE ====================
app.post("/cancelar-pedido", async (req, res) => {
  const { idPedido, numeroPedido, motivo } = req.body;

  if (!idPedido && !numeroPedido) {
    return res.status(400).json({ error: "ID ou número do pedido é obrigatório" });
  }

  try {
    let pedidoId = idPedido;
    let pedidoNumero = numeroPedido;

    // Se foi passado número do pedido, buscar o ID
    if (numeroPedido && !idPedido) {
      const pedidoBusca = await db.query(
        "SELECT id_pedido FROM pedido WHERE numero_pedido = ?",
        [numeroPedido]
      );

      if (!pedidoBusca || pedidoBusca.length === 0) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }

      pedidoId = pedidoBusca[0].id_pedido;
    }

    console.log(`Iniciando cancelamento do pedido ${pedidoNumero || pedidoId}...`);

    // Verificar se o pedido existe e pode ser cancelado
    const pedidoExistente = await db.query(
      "SELECT * FROM pedido WHERE id_pedido = ? AND situacao IN ('P', 'C')",
      [pedidoId]
    );

    if (!pedidoExistente || pedidoExistente.length === 0) {
      return res.status(404).json({
        error: "Pedido não encontrado ou não pode ser cancelado"
      });
    }

    // Buscar produtos do pedido
    const produtosPedido = await db.query(
      "SELECT pp.id_produto, pp.quantidade, p.produto FROM pedido_produto pp JOIN produto p ON pp.id_produto = p.id_produto WHERE pp.id_pedido = ?",
      [pedidoId]
    );

    // Restaurar estoque para cada produto
    for (const item of produtosPedido) {
      await db.query(
        "UPDATE produto SET estoque = estoque + ? WHERE id_produto = ?",
        [item.quantidade, item.id_produto]
      );

      console.log(`Estoque restaurado para ${item.produto}: +${item.quantidade}`);
    }

    // Atualizar status do pedido para cancelado
    await db.query(
      "UPDATE pedido SET situacao = 'X', data_cancelamento = NOW(), motivo_cancelamento = ? WHERE id_pedido = ?",
      [motivo || 'Cancelado pelo sistema', pedidoId]
    );

    // Enviar email de notificação de cancelamento
    try {
      const clienteData = await db.query(
        "SELECT nome, email FROM pessoa WHERE id_pessoa = ?",
        [pedidoBusca[0].id_pessoa]
      );

      if (clienteData && clienteData.length > 0) {
        const cliente = clienteData[0];

        await funcoesUteis.enviarEmail(
          cliente.email,
          `Pedido Cancelado - ${pedidoNumero}`,
          "pedido_cancelado",
          {
            numeroPedido: pedidoNumero,
            nomeCliente: cliente.nome,
            motivo: motivo || 'Cancelado pelo sistema',
            dataCancelamento: new Date().toLocaleDateString('pt-BR')
          }
        );

        console.log(`📧 Email de cancelamento enviado para: ${cliente.email}`);
      }
    } catch (emailError) {
      console.error("❌ Erro ao enviar email de cancelamento:", emailError);
    }

    console.log(`Pedido ${pedidoNumero || pedidoId} cancelado com sucesso. Estoque restaurado.`);

    return res.status(200).json({
      mensagem: "Pedido cancelado com sucesso",
      idPedido: pedidoId,
      numeroPedido: pedidoNumero,
      produtosRestaurados: produtosPedido.length
    });

  } catch (error) {
    console.error("Erro ao cancelar pedido:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ==================== ROTA PARA VERIFICAR ESTOQUE ====================
app.get("/verificar-estoque/:idProduto", async (req, res) => {
  const { idProduto } = req.params;

  try {
    const produto = await db.query(
      "SELECT id_produto, produto, estoque FROM produto WHERE id_produto = ?",
      [idProduto]
    );

    if (!produto || produto.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    return res.status(200).json({
      id_produto: produto[0].id_produto,
      nome: produto[0].produto,
      estoque: produto[0].estoque
    });

  } catch (error) {
    console.error("Erro ao verificar estoque:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ==================== ROTA DE DIAGNÓSTICO DO BANCO ====================
app.get("/diagnostico-banco", async (req, res) => {
  try {
    console.log("🔍 Iniciando diagnóstico do banco de dados...");

    // Teste 1: Conectividade básica
    const testeConexao = await db.query("SELECT 1 as teste");
    console.log("✅ Teste de conexão:", testeConexao);

    // Teste 2: Verificar estrutura da tabela produto
    const estruturaTabela = await db.query("DESCRIBE produto");
    console.log("📋 Estrutura da tabela produto:", estruturaTabela);

    // Teste 3: Contar produtos
    const totalProdutos = await db.query("SELECT COUNT(*) as total FROM produto");
    console.log("📊 Total de produtos:", totalProdutos);

    // Teste 4: Listar alguns produtos com estoque
    const produtosComEstoque = await db.query(
      "SELECT id_produto, produto, estoque FROM produto WHERE estoque > 0 LIMIT 5"
    );
    console.log("🛍️ Produtos com estoque:", produtosComEstoque);

    // Teste 5: Verificar se há produtos com estoque zero
    const produtosSemEstoque = await db.query(
      "SELECT COUNT(*) as total FROM produto WHERE estoque = 0"
    );
    console.log("📦 Produtos sem estoque:", produtosSemEstoque);

    return res.status(200).json({
      sucesso: true,
      testes: {
        conexao: testeConexao,
        estruturaTabela: estruturaTabela,
        totalProdutos: totalProdutos[0].total,
        produtosComEstoque: produtosComEstoque,
        produtosSemEstoque: produtosSemEstoque[0].total
      }
    });

  } catch (error) {
    console.error("❌ Erro no diagnóstico:", error);
    return res.status(500).json({
      erro: "Erro no diagnóstico",
      detalhes: error.message,
      stack: error.stack
    });
  }
});

// ==================== ROTA DE TESTE PARA ESTOQUE ====================
app.post("/teste-estoque", async (req, res) => {
  const { idProduto, novoEstoque } = req.body;

  try {
    console.log(`🧪 TESTE: Atualizando estoque do produto ${idProduto} para ${novoEstoque}`);

    // Verificar estoque atual
    const produtoAntes = await db.query(
      "SELECT id_produto, produto, estoque FROM produto WHERE id_produto = ?",
      [idProduto]
    );

    if (!produtoAntes || produtoAntes.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const estoqueAntes = produtoAntes[0].estoque;
    console.log(`📊 Estoque antes: ${estoqueAntes}`);

    // Atualizar estoque
    const updateResult = await db.query(
      "UPDATE produto SET estoque = ? WHERE id_produto = ?",
      [novoEstoque, idProduto]
    );

    console.log(`📝 Resultado do UPDATE:`, updateResult);

    // Verificar estoque após update
    const produtoDepois = await db.query(
      "SELECT id_produto, produto, estoque FROM produto WHERE id_produto = ?",
      [idProduto]
    );

    const estoqueDepois = produtoDepois[0].estoque;
    console.log(`📊 Estoque depois: ${estoqueDepois}`);

    const sucesso = parseInt(estoqueDepois) === parseInt(novoEstoque);

    return res.status(200).json({
      sucesso: sucesso,
      produto: produtoAntes[0].produto,
      estoqueAntes: estoqueAntes,
      estoqueDepois: estoqueDepois,
      estoqueEsperado: novoEstoque,
      updateResult: updateResult
    });

  } catch (error) {
    console.error("Erro no teste de estoque:", error);
    return res.status(500).json({ error: "Erro interno do servidor", detalhes: error.message });
  }
});

// ==================== ROTA PARA BUSCAR PEDIDO POR NÚMERO ====================
app.get("/buscar-pedido/:numeroPedido", async (req, res) => {
  let { numeroPedido } = req.params;

  try {
    // Decodificar URL e normalizar o número do pedido
    numeroPedido = decodeURIComponent(numeroPedido);

    console.log(`Número do pedido recebido: "${numeroPedido}"`);

    // Tentar buscar com e sem # para garantir que encontre
    let pedido = [];

    // Primeiro, tentar buscar exatamente como veio
    pedido = await db.query(`
      SELECT 
        p.id_pedido,
        p.numero_pedido,
        p.data_pedido,
        p.valor_total,
        p.situacao,
        p.forma_pagamento,
        p.endereco_entrega,
        p.previsao_entrega,
        p.data_cancelamento,
        p.motivo_cancelamento,
        pe.nome as nome_cliente,
        pe.email
      FROM pedido p
      LEFT JOIN pessoa pe ON p.id_pessoa = pe.id_pessoa
      WHERE p.numero_pedido = ?
      LIMIT 1
    `, [numeroPedido]);

    // Se não encontrou, tentar com # adicionado
    if (!pedido || pedido.length === 0) {
      const numeroComHash = numeroPedido.startsWith('#') ? numeroPedido : '#' + numeroPedido;
      console.log(`Tentando buscar com #: "${numeroComHash}"`);

      pedido = await db.query(`
        SELECT 
          p.id_pedido,
          p.numero_pedido,
          p.data_pedido,
          p.valor_total,
          p.situacao,
          p.forma_pagamento,
          p.endereco_entrega,
          p.previsao_entrega,
          p.data_cancelamento,
          p.motivo_cancelamento,
          pe.nome as nome_cliente,
          pe.email
        FROM pedido p
        LEFT JOIN pessoa pe ON p.id_pessoa = pe.id_pessoa
        WHERE p.numero_pedido = ?
        LIMIT 1
      `, [numeroComHash]);
    }

    // Se ainda não encontrou, tentar sem # 
    if (!pedido || pedido.length === 0) {
      const numeroSemHash = numeroPedido.startsWith('#') ? numeroPedido.substring(1) : numeroPedido;
      console.log(`Tentando buscar sem #: "${numeroSemHash}"`);

      pedido = await db.query(`
        SELECT 
          p.id_pedido,
          p.numero_pedido,
          p.data_pedido,
          p.valor_total,
          p.situacao,
          p.forma_pagamento,
          p.endereco_entrega,
          p.previsao_entrega,
          p.data_cancelamento,
          p.motivo_cancelamento,
          pe.nome as nome_cliente,
          pe.email
        FROM pedido p
        LEFT JOIN pessoa pe ON p.id_pessoa = pe.id_pessoa
        WHERE p.numero_pedido = ?
        LIMIT 1
      `, [numeroSemHash]);
    }

    console.log(`Resultado da busca: ${pedido.length} pedido(s) encontrado(s)`);

    if (!pedido || pedido.length === 0) {
      return res.status(404).json({
        error: "Pedido não encontrado",
        codigo: -1
      });
    }

    const pedidoInfo = pedido[0];

    // Buscar produtos do pedido
    const produtos = await db.query(`
      SELECT 
        pp.quantidade,
        pp.preco_unitario,
        pp.nome_produto,
        p.imagem_1
      FROM pedido_produto pp
      LEFT JOIN produto p ON pp.id_produto = p.id_produto
      WHERE pp.id_pedido = ?
    `, [pedidoInfo.id_pedido]);

    // Determinar status do pedido
    const statusPedido = determinarStatusPedido(pedidoInfo.situacao, pedidoInfo.data_pedido);

    // Montar resposta
    const resposta = {
      numero: pedidoInfo.numero_pedido,
      data: new Date(pedidoInfo.data_pedido).toLocaleDateString('pt-BR'),
      dataCompleta: new Date(pedidoInfo.data_pedido).toLocaleString('pt-BR'),
      total: `R$ ${parseFloat(pedidoInfo.valor_total).toFixed(2).replace('.', ',')}`,
      situacao: pedidoInfo.situacao,
      pagamento: formatarFormaPagamento(pedidoInfo.forma_pagamento),
      endereco: pedidoInfo.endereco_entrega || 'Endereço não informado',
      previsao: pedidoInfo.previsao_entrega || 'A definir',
      cliente: pedidoInfo.nome_cliente || 'Cliente',
      email: pedidoInfo.email,
      produtos: produtos.map(prod => ({
        nome: prod.nome_produto,
        quantidade: prod.quantidade,
        preco: parseFloat(prod.preco_unitario),
        subtotal: parseFloat(prod.preco_unitario) * parseInt(prod.quantidade),
        imagem: prod.imagem_1
      })),
      status: statusPedido,
      cancelado: pedidoInfo.situacao === 'X',
      motivoCancelamento: pedidoInfo.motivo_cancelamento,
      dataCancelamento: pedidoInfo.data_cancelamento ?
        new Date(pedidoInfo.data_cancelamento).toLocaleString('pt-BR') : null
    };

    console.log(`Pedido encontrado: ${numeroPedido}`);
    return res.status(200).json(resposta);

  } catch (error) {
    console.error("Erro ao buscar pedido:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Função auxiliar para determinar status do pedido
function determinarStatusPedido(situacao, dataPedido) {
  const agora = new Date();
  const dataP = new Date(dataPedido);
  const diffHoras = (agora - dataP) / (1000 * 60 * 60);

  let status = [
    { nome: 'Pedido Confirmado', data: dataP.toLocaleString('pt-BR'), ativo: true, icone: 'bi-check-circle-fill' },
    { nome: 'Em Preparação', data: 'Em breve', ativo: false, icone: 'bi-box-seam' },
    { nome: 'Em Transporte', data: 'Em breve', ativo: false, icone: 'bi-truck' },
    { nome: 'Entregue', data: 'Em breve', ativo: false, icone: 'bi-house-door' }
  ];

  if (situacao === 'X') {
    // Pedido cancelado
    return [
      { nome: 'Pedido Confirmado', data: dataP.toLocaleString('pt-BR'), ativo: true, icone: 'bi-check-circle-fill' },
      { nome: 'Cancelado', data: 'Pedido foi cancelado', ativo: true, icone: 'bi-x-circle-fill' }
    ];
  }

  // Simular progresso baseado no tempo
  if (diffHoras > 2) {
    status[1].ativo = true;
    status[1].data = 'Em preparação';
  }

  if (diffHoras > 24) {
    status[2].ativo = true;
    status[2].data = 'Em transporte';
  }

  if (diffHoras > 72) {
    status[3].ativo = true;
    status[3].data = 'Entregue';
  }

  return status;
}

// Função auxiliar para formatar forma de pagamento
function formatarFormaPagamento(formaPagamento) {
  if (!formaPagamento) return 'Não informado';

  if (typeof formaPagamento === 'string') {
    switch (formaPagamento) {
      case 'PIX': return 'PIX';
      case 'BB': return 'Boleto Bancário';
      case 'DEB': return 'Cartão de Débito';
      default: return formaPagamento;
    }
  }

  // Se for objeto (cartão de crédito)
  if (typeof formaPagamento === 'object') {
    return `Cartão de Crédito (${formaPagamento.parcelas || '1x'})`;
  }

  return 'Não informado';
}

// Endpoint para registrar avaliação
app.post("/avaliacoes", async (req, res) => {
  // Debug: Exibe o corpo recebido
  console.log("📥 Requisição recebida:", req.body);

  const { id_produto, id_pessoa, nota, comentario } = req.body;

  // Validação básica dos dados
  if (!id_produto || !id_pessoa || !nota) {
    console.warn("⚠️ Dados incompletos:", { id_produto, id_pessoa, nota });
    return res
      .status(400)
      .json({ sucesso: false, mensagem: "Dados incompletos" });
  }

  try {
    // Verifica se já existe avaliação para o mesmo produto e pessoa
    const existe = await db.query(
      "SELECT id_avaliacao FROM avaliacoes WHERE id_produto = ? AND id_pessoa = ?",
      [id_produto, id_pessoa]
    );
    console.log("🔍 Avaliação existente:", existe);

    if (existe.length > 0) {
      // Atualiza avaliação existente
      await db.query(
        "UPDATE avaliacoes SET nota = ?, comentario = ?, data = NOW() WHERE id_avaliacao = ?",
        [nota, comentario || null, existe[0].id_avaliacao]
      );
      console.log("📝 Avaliação atualizada:", {
        id_produto,
        id_pessoa,
        nota,
        comentario,
      });
      return res.json({
        sucesso: true,
        mensagem: "Avaliação atualizada com sucesso",
      });
    } else {
      // Insere nova avaliação
      await db.query(
        "INSERT INTO avaliacoes (id_produto, id_pessoa, nota, comentario, data) VALUES (?, ?, ?, ?, NOW())",
        [id_produto, id_pessoa, nota, comentario || null]
      );
      console.log("✅ Nova avaliação registrada:", {
        id_produto,
        id_pessoa,
        nota,
        comentario,
      });
      return res.json({
        sucesso: true,
        mensagem: "Avaliação registrada com sucesso",
      });
    }
  } catch (err) {
    // Debug de erro
    console.error("💥 Erro ao processar avaliação:", err);
    res
      .status(500)
      .json({ sucesso: false, mensagem: "Erro ao registrar avaliação" });
  }
});

// Endpoint para buscar avaliações de um produto
app.get("/avaliacoes", async (req, res) => {
  const { id_produto } = req.query;
  if (!id_produto) {
    return res
      .status(400)
      .json({ sucesso: false, mensagem: "ID do produto não informado" });
  }
  try {
    const avaliacoes = await db.query(
      "SELECT a.id_pessoa, a.nota, a.comentario, a.data, p.nome FROM avaliacoes a LEFT JOIN pessoa p ON a.id_pessoa = p.id_pessoa WHERE a.id_produto = ? ORDER BY a.data DESC",
      [id_produto]
    );
    // Calcular média e total
    const total = avaliacoes.length;
    const media =
      total > 0
        ? (avaliacoes.reduce((soma, a) => soma + a.nota, 0) / total).toFixed(2)
        : 0;
    res.json({ sucesso: true, media, total, avaliacoes });
  } catch (err) {
    res
      .status(500)
      .json({ sucesso: false, mensagem: "Erro ao buscar avaliações" });
  }
});

/*BACKEND PERFIL */
const verificarToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "Token não fornecido." });

  try {
    const tokenFormatado = token.replace("Bearer ", "");
    const decoded = jwt.verify(tokenFormatado, process.env.SEGREDO_JWT);
    req.usuario = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Token inválido ou expirado." });
  }
};

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "../img/index_carousel"); // Pasta onde as imagens serão salvas
  },
  filename: function (req, file, cb) {
    // Gera um nome único para o arquivo
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "carrossel-" + uniqueSuffix + "." + file.originalname.split(".").pop()
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Apenas arquivos de imagem são permitidos!"), false);
    }
  },
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
app.get("/", (req, res) => {
  res.json({
    message: "API de Usuários Segura",
    endpoints: {
      cadastro: "POST /pessoa",
      login: "POST /login",
      listar: "GET /pessoa",
      buscar: "GET /pessoa/:id_pessoa",
      atualizar: "PUT /pessoa/:id_pessoa",
      deletar: "DELETE /pessoa/:id_pessoa",
      endereco: {
        buscar: "GET /pessoa/:id_pessoa/enderecos",
        atualizar: "PUT /pessoa/:id_pessoa/enderecos",
      },
      imagem: "PUT /pessoa/:id_pessoa/imagem",
    },
  });
});

// [1] CADASTRO (POST)
app.post("/pessoa", async (req, res) => {
  const {
    nome,
    email,
    telefone,
    cpf,
    id_tipo_usuario,
    senha,
    situacao,
    imagem_perfil,
  } = req.body;

  // Validações
  if (!nome || !email || !senha) {
    return res
      .status(400)
      .json({ error: "Nome, e-mail e senha são obrigatórios" });
  }

  if (!validarEmail(email)) {
    return res.status(400).json({ error: "Formato de e-mail inválido" });
  }

  if (senha.length < 2) {
    return res
      .status(400)
      .json({ error: "Senha deve ter no mínimo 2 caracteres" });
  }

  try {
    // Verifica se usuário já existe
    const [existing] = await db.query(
      "SELECT id_pessoa FROM pessoa WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "E-mail já cadastrado" });
    }

    // Gera hash da senha
    const { hash, salt } = await gerarHashSenha(senha);

    // Insere no banco
    const [result] = await db.query("INSERT INTO pessoa SET ?", {
      nome,
      email,
      telefone,
      cpf,
      id_tipo_usuario: id_tipo_usuario || 1, // Default para usuário comum
      senha_hash: hash,
      senha_salt: salt,
      situacao: situacao || "A", // Default para ativo
      imagem_perfil: imagem_perfil || null,
    });

    res.status(201).json({
      id_pessoa: result.insertId,
      message: "Usuário criado com sucesso",
      pessoa: {
        nome,
        email,
        telefone,
        cpf,
        id_tipo_usuario,
        situacao,
        imagem_perfil,
      },
    });
  } catch (err) {
    console.error("Erro no cadastro:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// [2] LOGIN (POST)
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Buscar usuário
    const [users] = await db.query(
      "SELECT id_pessoa, nome, email, senha, id_tipo_usuario FROM pessoa WHERE email = ?",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const user = users[0];

    // Buscar informações de login
    const [logins] = await db.query("SELECT * FROM login WHERE id_pessoa = ?", [
      user.id_pessoa,
    ]);
    if (logins.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const login = logins[0];

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, login.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      {
        userId: user.id_pessoa, // Certifique-se que está usando id_pessoa
        email: user.email,
        tipo_usuario: user.id_tipo_usuario,
      },
      process.env.SEGREDO_JWT,
      { expiresIn: "1h" }
    );

    console.log("Token JWT gerado:", token);

    const isAdmin =
      user.email === "greenl.adm@gmail.com" || user.id_tipo_usuario === 1;

    // Retornar token e user com isAdmin
    res.json({
      token,
      user: {
        id_pessoa: user.id_pessoa,
        email: user.email,
        tipo_usuario: user.id_tipo_usuario,
        isAdmin,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro no servidor" });
  }

  // Middleware de autenticação
});

app.get("/profile", async (req, res) => {
  try {
    // Verificar token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    const decoded = jwt.verify(token, SEGREDO_JWT);

    // Buscar usuário
    const [users] = await db.query("SELECT * FROM pessoa WHERE id_pessoa = ?", [
      decoded.id_pessoa,
    ]);
    console.log("Usuários encontrados:", users);
    if (users.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = users[0];

    // Remover dados sensíveis antes de enviar
    delete user.cpf;

    res.json(user);
  } catch (error) {
    console.error(error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido" });
    }
    res.status(500).json({ error: "Erro no servidor" });
  }
});

//[3] LISTAR USUÁRIOS (GET)
app.get("/pessoa", async (req, res) => {
  try {
    let rows;
    const resposta = await db.query(
      "SELECT id_pessoa, nome, email, telefone, cpf, id_tipo_usuario, situacao, imagem_perfil FROM pessoa"
    );
    console.log(resposta);
    rows = resposta;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

// [4] BUSCAR USUÁRIO POR ID (GET)
app.get("/pessoa/:id_pessoa", verificarToken, async (req, res) => {
  try {
    console.log("Buscando usuário com ID:", req.params.id_pessoa);
    const id = parseInt(req.params.id_pessoa);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }
    let rows;
    const resposta = await db.query(
      "SELECT id_pessoa, nome, email, telefone, cpf, id_tipo_usuario, situacao, imagem_perfil FROM pessoa WHERE id_pessoa = ?",
      [id]
    );
    console.log("Resposta da consulta:", resposta);
    rows = resposta;

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Usuário não encontrado",
        details: `Nenhum usuário encontrado com o ID ${id}`,
      });
    }

    res.json(rows);
  } catch (err) {
    console.error("Erro detalhado:", err);
    res.status(500).json({
      error: "Erro ao buscar usuário",
      details: err.message,
    });
  }
});

// [5] ATUALIZAR USUÁRIO (PUT)
// Rota pública: Atualiza nome, telefone, email, situacao e tipo de qualquer usuário sem token
// Atualização simplificada (sem token, sem validação de tipo)
app.put("/admin/atualizar/:id_pessoa", async (req, res) => {
  try {
    const idPessoa = parseInt(req.params.id_pessoa);
    const { nome, telefone } = req.body;

    // Converte undefined em null
    const values = [
      nome ?? null,
      telefone ?? null,
      idPessoa
    ];

    const resultado = await db.query(
      'UPDATE pessoa SET nome = ?, telefone = ? WHERE id_pessoa = ?',
      values
    );

    // `resultado` não é um array diretamente — mysql2 retorna um objeto com duas partes

    res.json({ message: "Usuário atualizado com sucesso" });
  } catch (err) {
    console.error("Erro ao atualizar usuário:", err);
    res.status(500).json({
      error: "Erro interno no servidor",
      details: err.message,
    });
  }
});


app.put("/admin/editar-usuario/:id_pessoa", async (req, res) => {
  const idPessoa = parseInt(req.params.id_pessoa);
  
  if (isNaN(idPessoa)) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    // Verificar se o usuário a ser editado existe
   const [userExists] = await db.query(
  'SELECT id_pessoa FROM pessoa WHERE id_pessoa = ?', 
  [idPessoa]
);
    
    if (userExists.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Campos que podem ser atualizados
    const { situacao } = req.body;
    const dadosAtualizacao = {};

    if (situacao !== undefined) dadosAtualizacao.situacao = situacao;

    if (Object.keys(dadosAtualizacao).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido fornecido para atualização' });
    }

    // Atualizar no banco
    await db.query(
  'UPDATE pessoa SET situacao =  ? WHERE id_pessoa = ?',
  [dadosAtualizacao.situacao, idPessoa]
);

    res.status(200).json({ 
      message: "Usuário atualizado com sucesso",
      updated_fields: Object.keys(dadosAtualizacao)
    });

  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    res.status(500).json({ 
      error: "Erro interno do servidor ao atualizar usuário",
      details: error.message
    });
  }
});


// [6] DELETAR USUÁRIO (DELETE)
app.delete("/pessoa/:id_pessoa", async (req, res) => {
  try {
    const [result] = await db.query("DELETE FROM pessoa WHERE id_pessoa = ?", [
      req.params.id_pessoa,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar usuário" });
  }
});
app.get('/pessoa/pedidos', verificarToken, async (req, res) => {
  try {
    const userId = req.usuario.userId;

    const [adminRows] = await db.query(
      'SELECT id_tipo_usuario FROM pessoa WHERE id_pessoa = ?',
      [userId]
    );

    if (adminRows.length === 0 || adminRows[0].id_tipo_usuario !== 1) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem visualizar todos os pedidos.' });
    }

    const [pedidos] = await db.query(`
      SELECT 
        p.id_pedido,
        p.numero_pedido,
        p.data_hora,
        p.situacao,
        p.valor_total,
        p.pagamento_situacao,
        pes.nome AS nome_cliente
      FROM pedidos p
      JOIN pessoa pes ON pes.id_pessoa = p.id_pessoa
      ORDER BY p.data_hora DESC
    `);

    res.json(pedidos);
  } catch (err) {
    console.error('Erro ao buscar pedidos:', err);
    res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
});


app.get('/pessoa/:id_pessoa/pedidos', verificarToken, async (req, res) => {
  try {
    const { id_pessoa } = req.params;

    // Proteção: Garante que o usuário só possa ver os próprios pedidos
    if (parseInt(id_pessoa) !== req.usuario.userId) {
      return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para visualizar este histórico de pedidos.' });
    }

    // Buscar pedidos do usuário
    const pedidos = await db.query(
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

    // Para cada pedido, buscar os produtos
    const pedidosComProdutos = await Promise.all(
      pedidos.map(async (pedido) => {
        const produtos = await db.query(
          `SELECT
                        pp.id_produto,
                        pp.nome_produto as nome,
                        pp.quantidade,
                        pp.preco_unitario,
                        p.imagem_1 as imagem
                    FROM pedido_produto pp
                    LEFT JOIN produto p ON pp.id_produto = p.id_produto
                    WHERE pp.id_pedido = ?`,
          [pedido.id_pedido]
        );

        return {
          ...pedido,
          produtos: produtos || []
        };
      })
    );

    res.json(pedidosComProdutos);
  } catch (err) {
    console.error('Erro ao buscar pedidos do usuário:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico de pedidos.' });
  }
});

// Rota para o histórico de compras para o administrador
app.get("/admin/historico-compras", async (req, res) => {
  try {
    const todosPedidos = await db.query(
      `SELECT 
                c.id_carrinho,
                c.situacao,
                DATE_FORMAT(c.data_hora, '%d/%m/%Y %H:%i') as data_criacao,
                ci.id_item as id_carrinho_item,
                ci.quantidade,
                p.produto as nome_produto,
                p.preco,
                p.imagem_1 as imagem_principal,
                pe.nome as nome_usuario
            FROM carrinho c
            JOIN carrinho_itens ci ON c.id_carrinho = ci.id_carrinho
            JOIN produto p ON ci.id_produto = p.id_produto
            JOIN pessoa pe ON c.id_pessoa = pe.id_pessoa
            ORDER BY c.data_hora DESC;`
    );

    const pedidosAgrupados = todosPedidos.reduce((acc, item) => {
      const pedidoExistente = acc.find(p => p.id_carrinho === item.id_carrinho);
      if (pedidoExistente) {
        pedidoExistente.itens.push({
          nome_produto: item.nome_produto,
          quantidade: item.quantidade,
          // Garante que 'preco' é um número
          preco: parseFloat(item.preco),
          imagem_principal: item.imagem_principal,
        });
      } else {
        acc.push({
          id_carrinho: item.id_carrinho,
          nome_usuario: item.nome_usuario,
          data_criacao: item.data_criacao,
          situacao: item.situacao,
          itens: [{
            nome_produto: item.nome_produto,
            quantidade: item.quantidade,
            // Garante que 'preco' é um número
            preco: parseFloat(item.preco),
            imagem_principal: item.imagem_principal,
          }]
        });
      }
      return acc;
    }, []);

    res.status(200).json(pedidosAgrupados);
  } catch (erro) {
    console.error("Erro ao buscar todos os históricos de compras:", erro);
    res.status(500).json({ mensagem: "Erro interno no servidor." });
  }
});

app.get('/admin/pedidos-finalizados', verificarToken, async (req, res) => {
  try {
    const user = req.usuario;

    // Somente admins
    if (user.tipo_usuario !== 1) {
      return res.status(403).json({ error: 'Apenas administradores podem acessar esta rota.' });
    }

    const [rows] = await db.query(`
      SELECT 
        p.id_pedido,
        p.numero_pedido,
        DATE_FORMAT(p.data_hora, '%d/%m/%Y %H:%i') AS data_pedido,
        p.valor_total,
        p.situacao,
        p.pagamento_situacao,
        pes.nome AS nome_cliente,
        pr.produto AS nome_produto,
        pr.imagem_1 AS imagem_produto,
        pi.quantidade,
        pi.preco_unitario
      FROM pedidos p
      JOIN pessoa pes ON pes.id_pessoa = p.id_pessoa
      JOIN pedido_itens pi ON pi.id_pedido = p.id_pedido
      JOIN produto pr ON pr.id_produto = pi.id_produto
      ORDER BY p.data_hora DESC;
    `);

    const pedidosAgrupados = rows.reduce((acc, item) => {
      let pedido = acc.find(p => p.id_pedido === item.id_pedido);
      if (!pedido) {
        pedido = {
          id_pedido: item.id_pedido,
          numero_pedido: item.numero_pedido,
          data_pedido: item.data_pedido,
          valor_total: item.valor_total,
          situacao: item.situacao,
          pagamento_situacao: item.pagamento_situacao,
          nome_cliente: item.nome_cliente,
          itens: []
        };
        acc.push(pedido);
      }

      pedido.itens.push({
        nome_produto: item.nome_produto,
        imagem_produto: item.imagem_produto,
        quantidade: item.quantidade,
        preco_unitario: parseFloat(item.preco_unitario)
      });

      return acc;
    }, []);

    res.status(200).json(pedidosAgrupados);
  } catch (erro) {
    console.error('Erro ao buscar pedidos finalizados:', erro);
    res.status(500).json({ mensagem: 'Erro interno no servidor.' });
  }
});

// Rota para pedidos reais (tabela pedidos + pedido_produto) para admin
app.get("/admin/pedidos", verificarToken, async (req, res) => {
  try {
    const { userId } = req.usuario;

    // Verifica se é admin
    const [adminRows] = await db.query('SELECT id_tipo_usuario FROM pessoa WHERE id_pessoa = ?', [userId]);
    if (!adminRows.length || adminRows[0].id_tipo_usuario !== 1) {
      return res.status(403).json({ error: "Apenas administradores têm acesso." });
    }

    const [pedidosComProdutos] = await db.query(`
            SELECT 
                p.id_pedido,
                p.numero_pedido,
                p.data_hora,
                p.situacao,
                p.valor_total,
                p.pagamento_situacao,
                pe.nome AS nome_cliente,
                pr.produto AS nome_produto,
                pr.imagem_1 AS imagem_produto,
                pp.quantidade,
                pp.preco_unitario
            FROM pedidos p
            JOIN pessoa pe ON p.id_pessoa = pe.id_pessoa
            JOIN pedido_produto pp ON p.id_pedido = pp.id_pedido
            JOIN produto pr ON pp.id_produto = pr.id_produto
            ORDER BY p.data_hora DESC
        `);

    // Agrupar por pedido
    const agrupado = pedidosComProdutos.reduce((acc, item) => {
      const existente = acc.find(p => p.id_pedido === item.id_pedido);
      const produto = {
        nome_produto: item.nome_produto,
        imagem_produto: item.imagem_produto,
        quantidade: item.quantidade,
        preco_unitario: parseFloat(item.preco_unitario)
      };

      if (existente) {
        existente.produtos.push(produto);
      } else {
        acc.push({
          id_pedido: item.id_pedido,
          numero_pedido: item.numero_pedido,
          data_pedido: item.data_hora,
          situacao: item.situacao,
          pagamento_situacao: item.pagamento_situacao,
          valor_total: item.valor_total,
          nome_cliente: item.nome_cliente,
          produtos: [produto]
        });
      }

      return acc;
    }, []);

    res.status(200).json(agrupado);

  } catch (erro) {
    console.error("Erro ao buscar pedidos do admin:", erro);
    res.status(500).json({ mensagem: "Erro interno ao buscar pedidos." });
  }
});

// [7] OBTER DADOS DO USUÁRIO LOGADO (GET)
app.get("/pessoa/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Token não fornecido" });
    }

    // Em produção, decodifique o token JWT para obter o ID
    const userId = req.body.userId || req.query.userId;

    const [rows] = await db.query(
      "SELECT id_pessoa, nome, email, telefone, cpf, situacao, imagem_perfil FROM pessoa WHERE id_pessoa = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Erro ao buscar usuário:", err);
    res.status(500).json({
      error: "Erro ao buscar usuário",
      details: err.message,
    });
  }
});

// [8] ATUALIZAR IMAGEM DE PERFIL (PUT)
app.put("/pessoa/:id_pessoa/imagem", async (req, res) => {
  try {
    const { imagem_perfil } = req.body;
    const id = parseInt(req.params.id_pessoa);

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const [result] = await db.query(
      "UPDATE pessoa SET imagem_perfil = ? WHERE id_pessoa = ?",
      [imagem_perfil, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({ message: "Imagem de perfil atualizada com sucesso" });
  } catch (err) {
    console.error("Erro ao atualizar imagem:", err);
    res.status(500).json({ error: "Erro ao atualizar imagem de perfil" });
  }
});

// [9] ROTAS PARA ENDEREÇO
app.get("/pessoa/:id_pessoa/enderecos", async (req, res) => {
  try {
    const idPessoa = req.params.id_pessoa;
    console.log(idPessoa);

    // Execute a consulta e capture o resultado completo
    const queryResult = await db.query(
      "SELECT id_endereco, uf, cep, cidade, bairro, endereco, complemento FROM enderecos WHERE id_pessoa = ?",
      [idPessoa]
    );
    console.log("Resultado bruto da consulta GET de endereço:", queryResult);

    let rows;
    // Adapte esta parte dependendo do que seu db.query realmente retorna
    // Se db.query retorna [rows, fields], então:
    if (Array.isArray(queryResult) && Array.isArray(queryResult[0])) {
      rows = queryResult[0];
    } else {
      // Se db.query retorna apenas as rows diretamente:
      rows = queryResult;
    }

    // Verifique se 'rows' é um array e se tem elementos antes de acessar .length
    if (Array.isArray(rows) && rows.length > 0) {
      res.json(rows[0]); // Retorna o primeiro endereço encontrado
    } else {
      // Se nenhum endereço for encontrado, retorna 404
      return res.status(404).json({ error: "Endereço não encontrado" });
    }
  } catch (err) {
    console.error("Erro detalhado ao buscar endereço:", err); // Log mais detalhado
    res
      .status(500)
      .json({ error: "Erro ao buscar endereço", details: err.message }); // Inclua detalhes do erro
  }
});
app.put("/pessoa/:id_pessoa/enderecos", async (req, res) => {
  try {
    const { uf, cep, cidade, bairro, endereco, complemento } = req.body;
    const idPessoa = req.params.id_pessoa;

    // Execute a consulta e capture o resultado completo
    const queryResult = await db.query(
      "SELECT id_endereco FROM enderecos WHERE id_pessoa = ?",
      [idPessoa]
    );
    console.log(
      "Resultado bruto da consulta de existência de endereço:",
      queryResult
    );

    let existingRows;
    // Adapte esta parte dependendo do que seu db.query realmente retorna
    // Se db.query retorna [rows, fields], então:
    if (Array.isArray(queryResult) && Array.isArray(queryResult[0])) {
      existingRows = queryResult[0];
    } else {
      // Se db.query retorna apenas as rows diretamente:
      existingRows = queryResult;
    }

    // Verifique se existingRows é um array e se tem elementos antes de acessar .length
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      // Atualiza existente
      await db.query(
        "UPDATE enderecos SET uf = ?, cep = ?, cidade = ?, bairro = ?, endereco = ?, complemento = ? WHERE id_pessoa = ?",
        [uf, cep, cidade, bairro, endereco, complemento, idPessoa]
      );
    } else {
      // Cria novo
      await db.query(
        "INSERT INTO enderecos (id_pessoa, uf, cep, cidade, bairro, endereco, complemento) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          idPessoa,
          uf,
          cep,
          cidade,
          bairro || null,
          endereco || null,
          complemento || null,
        ]
      );
    }

    res.json({ message: "Endereço atualizado com sucesso" });
  } catch (err) {
    console.error("Erro detalhado ao tentar atualizar/inserir endereço:", err); // Log mais detalhado
    res
      .status(500)
      .json({ error: "Erro ao atualizar endereço", details: err.message }); // Inclua detalhes do erro
  }
});

//Rota atualizar tipo de usuário
app.put("/pessoa/:id_pessoa/tipo", async (req, res) => {
  try {
    const { id_tipo_usuario } = req.body;
    const idPessoa = parseInt(req.params.id_pessoa);

    if (isNaN(idPessoa) || idPessoa <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // Verifica se o tipo de usuário é válido
    if (![1, 2].includes(id_tipo_usuario)) {
      return res.status(400).json({ error: "Tipo de usuário inválido" });
    }

    const [result] = await db.query(
      "UPDATE pessoa SET id_tipo_usuario = ? WHERE id_pessoa = ?",
      [id_tipo_usuario, idPessoa]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({ message: "Tipo de usuário atualizado com sucesso" });
  } catch (err) {
    console.error("Erro ao atualizar tipo de usuário:", err);
    res.status(500).json({ error: "Erro ao atualizar tipo de usuário" });
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

// ==================== ROTA DE TESTE ====================
app.get("/teste", (req, res) => {
  res.json({ mensagem: "API está funcionando!" });
});

// ==================== ROTAS PARA PÁGINAS ESTÁTICAS ====================
// Rota específica para página de pedido confirmado
app.get('/pedido_confirmado.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pedido_confirmado.html'));
});

// Rota específica para página de acompanhar pedido
app.get('/acompanhar_pedido.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'acompanhar_pedido.html'));
});

// Rota específica para página de contato
app.get('/contato.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contato.html'));
});

// Rota específica para página de perfil
app.get('/perfil.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'perfil.html'));
});

// Rota específica para página de produtos
app.get('/produtos.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'produtos.html'));
});

// Rota específica para página sobre
app.get('/sobre.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sobre.html'));
});

// Rota específica para política de privacidade
app.get('/politica_privacidade.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'politica_privacidade.html'));
});

// Rota específica para termos de uso
app.get('/termos_de_uso.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'termos_de_uso.html'));
});

// Rota catch-all para outras páginas HTML na pasta public
app.get('/:filename.html', (req, res) => {
  const fileName = req.params.filename + '.html';
  const filePath = path.join(__dirname, 'public', fileName);

  // Verifica se o arquivo existe
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Página não encontrada');
  }
});

console.log("📄 Template de pedido confirmado:", fs.existsSync(templatePath) ? "✅ Encontrado" : "❌ Não encontrado");

console.log("🚀 === SERVIDOR PRONTO PARA RECEBER REQUISIÇÕES ===");

// ==================== SETUP TABELA CONTATOS ====================
async function criarTabelaContatos() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS contatos (
        id_contato INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        mensagem TEXT NOT NULL,
        data_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('novo', 'lido', 'respondido') DEFAULT 'novo',
        ip_origem VARCHAR(45),
        user_agent TEXT,
        INDEX idx_email (email),
        INDEX idx_data (data_envio),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Tabela 'contatos' verificada/criada com sucesso");
  } catch (error) {
    console.warn("⚠️ Erro ao criar tabela contatos:", error.message);
  }
}

// Criar tabela na inicialização
criarTabelaContatos();

// ==================== BACKEND CONTATO ====================
app.post("/contato", async (req, res) => {
  try {
    const { nome, email, assunto, tipo } = req.body;

    // Validação básica
    if (!nome || !email || !assunto) {
      return res.status(400).json({
        conclusao: 1,
        mensagem: "Nome, email e mensagem são obrigatórios"
      });
    }

    // Validação do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        conclusao: 1,
        mensagem: "Email inválido"
      });
    }

    // Validação do nome
    if (nome.length < 2 || nome.length > 50) {
      return res.status(400).json({
        conclusao: 1,
        mensagem: "Nome deve ter entre 2 e 50 caracteres"
      });
    }

    // Validação da mensagem
    if (assunto.length < 10 || assunto.length > 1000) {
      return res.status(400).json({
        conclusao: 1,
        mensagem: "Mensagem deve ter entre 10 e 1000 caracteres"
      });
    }

    console.log("📧 Nova mensagem de contato recebida:", { nome, email, tipo });

    // Capturar informações adicionais
    const ipOrigem = req.ip || req.connection.remoteAddress || 'desconhecido';
    const userAgent = req.get('User-Agent') || 'desconhecido';

    // Salvar no banco de dados
    try {
      await db.query(
        `INSERT INTO contatos (nome, email, mensagem, data_envio, status, ip_origem, user_agent) 
         VALUES (?, ?, ?, NOW(), 'novo', ?, ?)`,
        [nome, email, assunto, ipOrigem, userAgent]
      );
      console.log("✅ Mensagem salva no banco de dados");
    } catch (dbError) {
      console.warn("⚠️ Erro ao salvar no banco (continuando):", dbError.message);
      // Continua mesmo se não conseguir salvar no banco
    }

    // Enviar email de notificação para a empresa
    try {
      const funcoesUteis = new funcoes();

      // Email para a empresa
      await funcoesUteis.enviarEmail(
        "greenline.ecologic@gmail.com",
        `Nova mensagem de contato - ${nome}`,
        "contato_empresa",
        {
          nome,
          email,
          mensagem: assunto,
          dataEnvio: new Date().toLocaleString('pt-BR')
        }
      );

      // Email de confirmação para o cliente
      await funcoesUteis.enviarEmail(
        email,
        "Mensagem recebida - GreenLine",
        "contato_confirmacao",
        {
          nome,
          mensagem: assunto,
          dataEnvio: new Date().toLocaleString('pt-BR')
        }
      );

      console.log("✅ Emails de contato enviados com sucesso");
    } catch (emailError) {
      console.error("❌ Erro ao enviar emails:", emailError.message);
      // Não falha a requisição por causa do email
    }

    return res.status(200).json({
      conclusao: 2,
      mensagem: "Mensagem enviada com sucesso! Responderemos em breve."
    });

  } catch (erro) {
    console.error("❌ Erro no processamento do contato:", erro);
    return res.status(500).json({
      conclusao: 3,
      mensagem: "Erro interno no servidor"
    });
  }
});

// ==================== TESTE DE EMAIL ====================
app.post("/teste-email", async (req, res) => {
  try {
    console.log("🧪 INICIANDO TESTE DE EMAIL");

    const funcoesUteis = new funcoes();

    await funcoesUteis.enviarEmail(
      "gabreel47@gmail.com",
      "Teste de Email - GreenLine",
      "teste-verificacao"
    );

    return res.status(200).json({
      conclusao: 2,
      mensagem: "Email de teste enviado com sucesso!"
    });

  } catch (erro) {
    console.error("❌ ERRO NO TESTE DE EMAIL:", erro);
    return res.status(500).json({
      conclusao: 3,
      mensagem: "Falha no teste de email: " + erro.message
    });
  }
});

// ==================== INICIAR SERVIDOR ====================
app.listen(3010, () => {
  console.log("🚀 === SERVIDOR GREEN LINE INICIADO - v2.0 ===");
  console.log("🌐 Porta: 3010");
  console.log("📧 Sistema de email:", process.env.EMAIL_USER ? "✅ Configurado" : "❌ Não configurado");
  console.log("🔐 JWT Secret:", process.env.SEGREDO_JWT ? "✅ Configurado" : "❌ Não configurado");
  console.log("🗄️ Banco de dados: Conectado");
  console.log("📁 Templates de email: Verificando...");

});
