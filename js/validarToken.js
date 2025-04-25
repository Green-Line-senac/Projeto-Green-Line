const express = require("express"); // Framework para construção de APIs web
const cors = require("cors"); // Middleware para habilitar requisições cross-origin
const Database = require("./conexao"); // Arquivo para conexão com banco de dados local
const jwt = require("jsonwebtoken");
const porta = 3000;

// Instanciando objetos necessários
const db = new Database(); // Instância para acessar funções de banco de dados
const app = express(); // Instância do express para criar e configurar o servidor

// Middlewares essenciais
app.use(express.json()); // Permite o uso de JSON no corpo das requisições
app.use(cors()); // Libera acessos de diferentes origens ao servidor

app.get("/validar",async(req,res)=>{
    const {token} = req.query; //aqui ele captura o token contido na URL
    const segredo = 'green_line-ecologic';

    try{
        const payload = jwt.verify(token,segredo); //tira as informações do token
        const email = payload.email; //armazenamos o dado tirado do token

        const sql = "SELECT * FROM pessoa WHERE email = ?";
        const resultado = await db.query(sql,[email]);

        if(resultado.length > 0){
            res.send("<h1>Email confirmado.</h1><p>Acesso à plataforma liberado");
        }
        else{
            res.send("<h1>Erro! Email não encontrado</h1><p>Tente cadastrar novamente.</p>")
        }
    }
    catch(erro){
        console.error("Erro no token:", erro);
        res.send("<h1>Token expirado ou inválido</h1><p>Tente cadastrar-se novamente</p>");
    }
});
// Configuração do servidor para ouvir requisições
app.listen(porta, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${porta}`);
});