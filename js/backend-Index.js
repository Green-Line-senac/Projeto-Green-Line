const express = require('express');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());
const trocarDeConta = 0;

//BACKEND
app.get("/loginDados", async (req, res) => {
    trocarDeConta = req.query;
    res.json({trocarDeConta});
});