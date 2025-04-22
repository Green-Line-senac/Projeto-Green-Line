const express = require("express");
const cors = require("cors"); // Importar o pacote CORS
const Database = require("./conexao");
const db = new Database();

const app = express();
app.use(express.json());
app.use(cors()); // Ativar o CORS para permitir requisições de outras origens

app.post("/cadastrar", (req, res) => {
    console.log("Recebendo dados:", req.body);
    const { nome, email, cpf, telefone } = req.body;
    const sql = "INSERT INTO pessoa(nome, email, cpf_cnpj, telefone, tipo_pessoa) VALUES (?, ?, ?, ?, 'F')";

    db.query(sql, [nome, email, cpf, telefone], (err, result) => {
        if (err) {
            console.error("ERRO AO INSERIR DADOS:", err);
            return res.status(500).json({ erro: "Erro ao salvar no banco de dados." });
        }

        res.json({ mensagem: "Dados recebidos e salvos com sucesso!", id: result.insertId });
    });
});

app.listen(4000, () => {
    console.log("🚀 Servidor rodando em http://localhost:4000");
});