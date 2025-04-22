const Conexao = require('./conexao'); //importando a classe Conexao. Tudo que for da classe Conexao essa variável tem e é por ela que instanciamos também
const green_line = new Conexao();

function criarPessoa(nome, email, telefone, cpf) {
    const sql = 'INSERT INTO pessoa (nome, email, telefone, cpf_cnpj, tipo_pessoa) VALUES (?, ?, ?, ?, "F")';
    const params = [nome, email, telefone, cpf];

    green_line.query(sql, params)
        .then(() => {
            console.log('Pessoa criada com sucesso!');
        })
        .catch(err => {
            console.error('Erro ao criar pessoa:', err.message);
        });
}
criarPessoa('Kauã', 'kaua@email.com', '123456789', '12345678900');