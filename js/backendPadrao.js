require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Funcoes = require("./funcoes");
const app = express();

app.use(express.json());
app.use(cors());

const funcoesUteis = new Funcoes();

app.get("/enviar-email", async (req, res) => {
    const email = req.query.email;
    if (!email || email.length === 0) {
        return res.json({ conclusao: 1 }); // Sem email
    }
    try {
        await funcoesUteis.enviarEmail(email);
        return res.json({ conclusao: 2 }); // Email enviado
    } catch (erro) {
        console.log("Erro ao enviar o email:", erro); // Exibe erro
        return res.json({ conclusao: 3 });
    }
});

app.listen(process.env.PORTA5, () => {
    console.log(`Servidor rodando na porta ${process.env.PORTA5}`);
});