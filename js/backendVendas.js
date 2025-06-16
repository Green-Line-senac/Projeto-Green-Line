require("dotenv").config();
const express = require("express");
const conexao = require("./conexao");
const cors = require("cors");
const axios = require("axios");
const app = express();
const db = new conexao();
// Configurações
app.use(express.json());
app.use(cors());

app.get("/checar-cep", async (req, res) => {
  let cep = req.query.cep;
  console.log("CEP recebido:", cep);
  if (!cep) {
    return res.status(400).json({ error: "CEP não informado", codigo: -1 });
  }

  cep = cep.replace(/\D/g, "");

  if (cep.length != 8) {
    return res.status(400).json({ error: "CEP inválido", codigo: -3 });
  }
  try {
    let requisicao = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
    let resposta = requisicao.data; //necessário o data para pegar somente os dados
    if (resposta.erro) {
      return res.status(404).json({ error: "CEP não encontrado", codigo: -4 });
    }
    return res.status(200).json(resposta);
  } catch (error) {
    console.error("Erro ao consultar CEP:", error);
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

app.listen(process.env.PORTA9 || 3009, () => {
  console.log(`Servidor rodando na porta ${process.env.PORTA9 || 3009}`);
});
