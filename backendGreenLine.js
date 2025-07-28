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
const multer = require('multer');

const app = express();
app.use(express.json({ limit: "100mb" }));
app.use(cors());
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "..")));

const db = new Database();
const funcoesUteis = new funcoes();
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
       VALUES (?, ?, ?, ?, 2, ?, 'P', 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png')`,
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
    console.log(`Preparando para enviar email para ${email}`, {
      tipo,
      assunto,
    });

    await funcoesUteis.enviarEmail(email, assunto, tipo, pedido);

    console.log(`Email enviado com sucesso para ${email}`);

    return res.json({
      conclusao: 2,
      mensagem: "Email enviado com sucesso",
      detalhes: { email, tipo },
    });
  } catch (erro) {
    console.error("Falha no envio de email:", {
      erro: erro.message,
      email,
      tipo,
    });

    return res.status(500).json({
      conclusao: 3,
      mensagem: "Falha ao enviar email",
      erro: process.env.NODE_ENV === "development" ? erro.message : undefined,
    });
  }
});

// ==================== ROTA DE SOLICITAÇÃO DE ATUALIZAÇÕES DE PEDIDO ====================
app.post("/solicitar-atualizacoes", async (req, res) => {
  const { email, numeroPedido } = req.body;
  if (!email || !numeroPedido) {
    return res.status(400).json({ mensagem: "Email e número do pedido são obrigatórios." });
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
    res.status(500).json({ mensagem: "Erro ao enviar atualizações por e-mail." });
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
    let tipoUsuario = '';
    let isAdmin = false;

    if (id_tipo_usuario === 1) {
      tipoUsuario = 'Administrador';
      isAdmin = true;
    } else if (id_tipo_usuario === 2) {
      tipoUsuario = 'Cliente';
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
                peso_kg, dimensoes, ativo, imagem_1, imagem_2, categoria
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      parseInt(outrosDados.quantidade_avaliacao) || 0,
      parseInt(outrosDados.estoque) || 0,
      parseInt(outrosDados.parcelas) || 0,
      parseFloat(outrosDados.peso) || 0,
      outrosDados.dimensoes || "0x0x0",
      outrosDados.ativo ? 1 : 0,
      imagem_1 ||
      "https://www.malhariapradense.com.br/wp-content/uploads/2017/08/produto-sem-imagem.png",
      imagem_2 ||
      "https://www.malhariapradense.com.br/wp-content/uploads/2017/08/produto-sem-imagem.png",
      outrosDados.categoria,
    ]);

    res.status(201).json({
      success: true,
      produtoId: result.insertId,
      mensagem: "Produto cadastrado com sucesso",
    });
  } catch (error) {
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
  console.log("Pedido recebido:", pedido);

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

    // Processar pagamento
    if (
      pedido.formaPagamentoVendas === "PIX" ||
      pedido.formaPagamentoVendas === "BB"
    ) {
      console.log("Processando pagamento PIX/BB...");
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
        pedido.formaPagamentoVendas, // Aqui é direto "PIX" ou "BB"
        pedido.total,
        pedido.nomeTitular,
        pedido.metodoEntrega,
        pedido.previsaoEntrega,
        pedido.frete,
        pedido.subtotal,
        pedido.desconto,
      ]);
    } else if (
      pedido.formaPagamentoVendas.metodoPagamento === "CC" ||
      pedido.formaPagamentoVendas.metodoPagamento === "DEB"
    ) {
      console.log("Processando pagamento com cartão...");
      const tipoPagamento =
        pedido.formaPagamentoVendas.metodoPagamento === "CC"
          ? "CRÉDITO"
          : "DÉBITO";

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
        pedido.formaPagamentoVendas.parcelas?.replace("x", "") || 1,
        pedido.formaPagamentoVendas.numeroCartao,
        pedido.formaPagamentoVendas.nomeCartao,
        pedido.formaPagamentoVendas.validadeCartao,
        pedido.formaPagamentoVendas.cvv,
        pedido.nomeTitular,
        pedido.metodoEntrega,
        pedido.previsaoEntrega,
        pedido.frete,
        pedido.subtotal,
        pedido.desconto,
      ]);
    } else {
      return res
        .status(400)
        .json({ error: "Método de pagamento inválido", codigo: -3 });
    }

    // Restante do código permanece igual...
    const ultimoPedido = await db.query(
      "SELECT id_pedido FROM pedidos WHERE numero_pedido = ? ORDER BY id_pedido DESC LIMIT 1",
      [pedido.numeroPedido]
    );
    const idPedido = ultimoPedido[0].id_pedido;
    console.log("ID do pedido inserido:", idPedido);

    // Inserir produtos do pedido e atualizar estoque
    for (const produto of pedido.produtos) {
      const produtoExistente = await db.query(
        "SELECT id_produto, estoque FROM produto WHERE nome_produto = ? LIMIT 1",
        [produto.nome]
      );

      if (!produtoExistente || produtoExistente.length === 0) {
        console.error(`Produto não encontrado: ${produto.nome}`);
        continue;
      }

      const produtoInfo = produtoExistente[0];
      const estoqueAtual = produtoInfo.estoque;
      const quantidadeComprada = produto.quantidade;

      // Verificar se há estoque suficiente
      if (estoqueAtual < quantidadeComprada) {
        console.error(`Estoque insuficiente para ${produto.nome}. Disponível: ${estoqueAtual}, Solicitado: ${quantidadeComprada}`);
        return res.status(400).json({
          error: `Estoque insuficiente para o produto ${produto.nome}. Disponível: ${estoqueAtual}`,
          codigo: -4,
          produto: produto.nome,
          estoqueDisponivel: estoqueAtual,
          quantidadeSolicitada: quantidadeComprada
        });
      }

      // Inserir produto no pedido
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

      // Atualizar estoque do produto
      const novoEstoque = estoqueAtual - quantidadeComprada;
      await db.query(
        "UPDATE produto SET estoque = ? WHERE id_produto = ?",
        [novoEstoque, produtoInfo.id_produto]
      );

      console.log(`Estoque atualizado para ${produto.nome}: ${estoqueAtual} -> ${novoEstoque}`);
    }

    return res.status(200).json({
      mensagem: "Pedido cadastrado com sucesso",
      idPedido: idPedido,
    });
  } catch (erro) {
    console.error("Erro ao salvar pedido:", erro);
    return res
      .status(500)
      .json({ erro: "Erro ao processar pedido", codigo: -2 });
  }
});
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
      "SELECT id_pessoa, nota, comentario, data FROM avaliacoes WHERE id_produto = ? ORDER BY data DESC",
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
    console.log(idPessoa);

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
  }
});
app.put('/pessoa/:id_pessoa/enderecos', async (req, res) => {
  try {
    const { uf, cep, cidade, bairro, endereco, complemento } = req.body;
    const idPessoa = req.params.id_pessoa;

    // Execute a consulta e capture o resultado completo
    const queryResult = await db.query('SELECT id_endereco FROM enderecos WHERE id_pessoa = ?', [idPessoa]);
    console.log("Resultado bruto da consulta de existência de endereço:", queryResult);

    let existingRows;
    // Adapte esta parte dependendo do que seu db.query realmente retorna
    // Se db.query retorna [rows, fields], então:
    if (Array.isArray(queryResult) && Array.isArray(queryResult[0])) {
      existingRows = queryResult[0];
    } else { // Se db.query retorna apenas as rows diretamente:
      existingRows = queryResult;
    }

    // Verifique se existingRows é um array e se tem elementos antes de acessar .length
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      // Atualiza existente
      await db.query(
        'UPDATE enderecos SET uf = ?, cep = ?, cidade = ?, bairro = ?, endereco = ?, complemento = ? WHERE id_pessoa = ?',
        [uf, cep, cidade, bairro, endereco, complemento, idPessoa]
      );
    } else {
      // Cria novo
      await db.query(
        'INSERT INTO enderecos (id_pessoa, uf, cep, cidade, bairro, endereco, complemento) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [idPessoa, uf, cep, cidade, bairro || null, endereco || null, complemento || null]
      );
    }

    res.json({ message: 'Endereço atualizado com sucesso' });
  } catch (err) {
    console.error('Erro detalhado ao tentar atualizar/inserir endereço:', err); // Log mais detalhado
    res.status(500).json({ error: 'Erro ao atualizar endereço', details: err.message }); // Inclua detalhes do erro
  }
});
// Rota para listar todos os usuários (apenas para ADMs)
app.get('/pessoa', async (req, res) => {
  try {
    // Verificar se o usuário é ADM
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    } else { console.log('Token do ADM recebido:', token); }

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

// ==================== ROTA DE TESTE ====================
app.get("/teste", (req, res) => {
  res.json({ mensagem: "API está funcionando!" });
});

// ==================== INICIAR SERVIDOR ====================
app.listen(3010, () => {
  console.log("🚀 SERVIDOR RODANDO NO ONLINE");
});
