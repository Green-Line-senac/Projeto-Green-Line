require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const app = express();
// Configurações
app.use(express.json());
app.use(cors());

app.get("/checar-cep",async(req,res) => {
    let cep = req.query.cep;
    console.log("CEP recebido:", cep);
    if (!cep) {
        return res.status(400).json({ error: "CEP não informado",codigo: -1 });
    }

    cep = cep.replace(/\D/g, ''); 

    if(cep.length != 8 ){
        return res.status(400).json({ error: "CEP inválido", codigo: -3 });
    }
    try{
        let requisicao = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
        let resposta = requisicao.data; //necessário o data para pegar somente os dados
        if(resposta.erro){
            return res.status(404).json({ error: "CEP não encontrado", codigo: -4 });
        }
        return res.status(200).json(resposta);  
    }catch (error) {
        console.error("Erro ao consultar CEP:", error);
        return res.status(500).json({ error: "Erro ao consultar CEP", codigo: -2 });
    }

});

app.listen(process.env.PORTA9 || 3009, () => {
    console.log(`Servidor rodando na porta ${process.env.PORTA9 || 3009}`);
});