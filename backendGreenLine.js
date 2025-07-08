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
       await funcoesUteis.enviarEmail(email,"Confirmação de email", "confirmacao",null);
    } catch (erro) {
      return res.status(500).json({ erro: "Erro ao enviar o email" });
    }
    res.status(200).json({
      codigo: 200,
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
  const senhaCriptografada = await bcrypt.hash(senha, 10);
  const atualizarSituacao =
    "UPDATE pessoa SET senha = ? WHERE id_pessoa = ?";
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
    if(verificacao[0].total>0){
      res.json({codigo: 1, mensagem:"Email cadastrado"})
    }
    else{
      res.json({codigo: 2, mensagem:"Email disponível"})
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
    if(verificacao[0].total>0){
      res.json({codigo: 1, mensagem:"CPF cadastrado"})
    }
    else{
      res.json({codigo: 2, mensagem:"CPF disponível"})
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
  const { assunto, tipo, email: rawEmail,pedido} = req.body;
  
  if (!assunto || !tipo) {
    return res.status(400).json({ 
      conclusao: 1, 
      mensagem: "Assunto e tipo são obrigatórios" 
    });
  }

  // 2. Limpeza e validação do email
  const email = rawEmail?.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ 
      conclusao: 1, 
      mensagem: "Email inválido ou não fornecido" 
    });
  }

  try {
    console.log(`Preparando para enviar email para ${email}`, { tipo, assunto });
    
    await funcoesUteis.enviarEmail(email, assunto, tipo, pedido);
    
    console.log(`Email enviado com sucesso para ${email}`);
    
    return res.json({ 
      conclusao: 2, 
      mensagem: "Email enviado com sucesso",
      detalhes: { email, tipo } 
    });
  } catch (erro) {
    console.error("Falha no envio de email:", {
      erro: erro.message,
      email,
      tipo
    });
    
    return res.status(500).json({ 
      conclusao: 3, 
      mensagem: "Falha ao enviar email",
      erro: process.env.NODE_ENV === 'development' ? erro.message : undefined
    });
  }
});

// ==================== BACKEND LOGIN ====================
// Middleware para verificar o token JWT
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

    // Verificação adicional para admin
    if (id_tipo_usuario === 1 && !email.endsWith(".adm@")) {
      return res.status(403).json({
        dadosValidos: 1,
        mensagem: "Conta admin requer verificação adicional.",
      });
    }
    let respostaCarrinho = await db.query(
      "SELECT SUM(quantidade_pendente) AS numero_carrinho FROM vw_quantidade_pendente WHERE id_pessoa = ?",
      [id_pessoa]
    );
     let carrinho = respostaCarrinho.length > 0
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

    // Resposta de sucesso
    const isAdmin = email === "greenl.adm@gmail.com";

    // Envia isso para o frontend
    return res.status(200).json({
      dadosValidos: 2,
      token,
      user: {
        id_pessoa,
        email,
        isAdmin,
        carrinho
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
      [pedido.numeroPedido],
    );
    const idPedido = ultimoPedido[0].id_pedido;
    console.log("ID do pedido inserido:", idPedido);

    // Inserir produtos do pedido
    for (const produto of pedido.produtos) {
      const produtoExistente = await db.query(
        "SELECT id_produto FROM produto WHERE produto = ? LIMIT 1",
        [produto.nome]
      );

      if (!produtoExistente || produtoExistente.length === 0) {
        console.error(`Produto não encontrado: ${produto.nome}`);
        continue;
      }

      await db.query(
        `INSERT INTO pedido_produto(
          id_pedido, id_produto, quantidade, preco_unitario, nome_produto
        ) VALUES(?, ?, ?, ?, ?)`,
        [
          idPedido,
          produtoExistente[0].id_produto,
          produto.quantidade,
          produto.preco,
          produto.nome,
        ]
      );
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
    return res.status(400).json({ sucesso: false, mensagem: "Dados incompletos" });
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
      console.log("📝 Avaliação atualizada:", { id_produto, id_pessoa, nota, comentario });
      return res.json({ sucesso: true, mensagem: "Avaliação atualizada com sucesso" });
    } else {
      // Insere nova avaliação
      await db.query(
        "INSERT INTO avaliacoes (id_produto, id_pessoa, nota, comentario, data) VALUES (?, ?, ?, ?, NOW())",
        [id_produto, id_pessoa, nota, comentario || null]
      );
      console.log("✅ Nova avaliação registrada:", { id_produto, id_pessoa, nota, comentario });
      return res.json({ sucesso: true, mensagem: "Avaliação registrada com sucesso" });
    }
  } catch (err) {
    // Debug de erro
    console.error("💥 Erro ao processar avaliação:", err);
    res.status(500).json({ sucesso: false, mensagem: "Erro ao registrar avaliação" });
  }
});

// Endpoint para buscar avaliações de um produto
app.get("/avaliacoes", async (req, res) => {
  const { id_produto } = req.query;
  if (!id_produto) {
    return res.status(400).json({ sucesso: false, mensagem: "ID do produto não informado" });
  }
  try {
    const avaliacoes = await db.query(
      "SELECT id_pessoa, nota, comentario, data FROM avaliacoes WHERE id_produto = ? ORDER BY data DESC",
      [id_produto]
    );
    // Calcular média e total
    const total = avaliacoes.length;
    const media = total > 0 ? (avaliacoes.reduce((soma, a) => soma + a.nota, 0) / total).toFixed(2) : 0;
    res.json({ sucesso: true, media, total, avaliacoes });
  } catch (err) {
    res.status(500).json({ sucesso: false, mensagem: "Erro ao buscar avaliações" });
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



