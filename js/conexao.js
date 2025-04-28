const mysql = require('mysql2'); //importando as funções do mysql e as armazenando numa variável

class Conexao {
    constructor() {
        this.connection = mysql.createConnection({
            host: '127.0.0.1',
            port: 3306, // Ajuste a porta se necessário
            user: 'root',
            password: 'SUASENHA',
            database: 'green_line'
        });

        this.connection.connect((err) => {
            if (err) {
                console.error('Erro ao conectar:', err.message);
                throw err;
            }
            console.log('Conexão bem-sucedida!');
        });
        /*
            SERIA ASSIM SEM OS =>
                this.connection.connect(function(err) {
                    if (err) {
                        console.error('Erro ao conectar:', err.message);
                        throw err;
                    }
                        console.log('Conexão bem-sucedida!');
                    });
        */
    }
    //MÉTODOS

    query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.connection.query(sql, params, (err, results) => {
                if (err) {
                    return reject(err);
                }
                resolve(results);
            });
        });
    }
    /*EXPLICAÇÃO MÉTODO QUERY
        Contém dois parâmetros: 
            sql -> local onde coloca a string comando SQL
            
            params -> um array opcional para colocar os valores dos - ? - das consultas SQL
            
            Retorna uma Promises, usada para gerenciar consultas SQL.
            Essa Classe retorna dois parâmetros:
                resolve(results): caso a query encontrou algo. O results é um array, então você pode iterar sobre ele para acessar cada objeto

                reject(err): chamado quando ocorre um erro na execução da consulta
            O uso de Promises permite junto com o then
        
        Exemplo: 

        const Database = require('./database'); // Importa a classe Database
        const db = new Database(); // Cria uma instância

        const sql = 'SELECT * FROM produtos WHERE categoria = ?';
        const params = ['sustentável'];

        db.query(sql, params)
        .then((results) => {
        console.log('Produtos encontrados:', results);
            })
        .catch((error) => {
        console.error('Erro na consulta:', error.message);
        });

        Explicação:
        - O comando SQL usa ? como um marcador de posição para valores dinâmicos.
        - O array params fornece o valor 'sustentável' para substituir o ?.
        - O método query executa a consulta no banco de dados:- Se for bem-sucedida, os resultados são exibidos no console.
        - Se ocorrer erro, ele será tratado no catch.
    */

    close() {
        this.connection.end((err) => {
            if (err) {
                console.error('Erro ao fechar a conexão:', err.message);
            } else {
                console.log('Conexão encerrada.');
            }
        });
    }
    //PARA TESTAR - Lembrando que o código pode ser executado diretamente na ordem em que aparece no arquivo. Então:

}

module.exports = Conexao; //permite que as outras classes utilizem. É similar aos imports também só que para outras classes