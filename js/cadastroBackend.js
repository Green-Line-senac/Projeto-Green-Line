const express = require("express");
const cors = require("cors"); // Importar o pacote CORS
const Database = require("./conexao");
const db = new Database();
let id_pessoa;

const app = express();
app.use(express.json());
app.use(cors()); // Ativar o CORS para permitir requisições de outras origens

app.post("/cadastrar", (req, res) => {
    console.log("Recebendo dados:", req.body);
    const { nome, email, cpf, telefone, senha } = req.body;
    const inserirPessoa = "INSERT INTO pessoa(nome, email, cpf_cnpj, telefone, tipo_pessoa) VALUES (?, ?, ?, ?, 'F')";
    const selecionarId = "SELECT id_pessoa FROM pessoa ORDER BY id_pessoa DESC";
    const inserirUsuario = "INSERT INTO usuario(id_pessoa,senha) VALUE(?,?)";

    db.query(inserirPessoa, [nome, email, cpf, telefone,senha], (err, result) => {
        if (err) {
            console.error("ERRO AO INSERIR DADOS:", err);
            return res.status(500).json({ erro: "Erro ao salvar no banco de dados." });
        }

        res.json({ mensagem: "Dados recebidos e salvos com sucesso na tabela pessoa.", id: result.insertId });
    });
    db.query(selecionarId, (err, result) => {
        if (err) {
            console.error("ID PESSOA NÃO ENCONTRADO", err);
            return res.status(500).json({ erro: "Erro ao procurar" })
        }
        if (result.lenght > 0) {
            id_pessoa = result[0].id_pessoa;
            console.log("ID ENCONTRADO");
        }
        else {
            console.error("Nenhum resultado encontrado");
            return res.status(404).json({ erro: "ID da pessoa não encontrado." });
        }
    })
    db.query(inserirUsuario, [id_pessoa,senha], (err, result) => {
        if (err) {
            console.error("ERRO AO INSERIR DADOS:", err);
            return res.status(500).json({ erro: "Erro ao salvar no banco de dados." });
        }

        res.json({ mensagem: "Dados recebidos e salvos com sucesso na tabela pessoa.", id: result.insertId });
    });
});

app.listen(3000, () => {
    console.log("🚀 Servidor rodando em http://localhost:3000");
});