const formularioLogin = document.getElementById('formularioLogin');

formularioLogin.addEventListener('submit', function (e) {
    e.preventDefault();

    const usuario = document.getElementById('usuario').value.trim();
    const senha = document.getElementById('senha').value.trim();

    if (!usuario || !senha) {
        console.log('Preencha todos os campos.');
        return;
    }

    verificarConta(usuario, senha);
});

async function verificarConta(usuario, senha) {
    const mensagemUsuario = document.getElementById('mensagem-superior'); 
    try {
        const resposta = await fetch('http://localhost:3001/verificarConta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, senha })
        });

        const dados = await resposta.json();
        console.log(dados);

        switch (dados.dadosValidos) {
            case 0:
                console.log('Conta não existente');
                mensagemUsuario.className = "d-block alert text-bg-danger fw-bold -2 text-center mb-2";
                mensagemUsuario.textContent = 'Conta não existente. Faça um cadastro para prosseguir.';
                break;
            case 1:
                console.log('Email não verificado');
                mensagemUsuario.className = "d-block alert text-bg-warning fw-bold -2 text-center mb-2";
                mensagemUsuario.textContent = 'Seu email não está verificado. Enviamos um novo token no seu email.';
                break;
            case 2:
                console.log('Login bem-sucedido');
                window.location.href = '/index.html';
                break;
            case 3:
                console.log('Usuário ou senha incorretos');
                mensagemUsuario.className = "d-block alert text-bg-danger fw-bold -2 text-center mb-2";
                mensagemUsuario.textContent = 'Usuário ou senha incorretos. Verifique suas credenciais e tente novamente.';
                break;
            default:
                console.log('Resposta inesperada:', dados);
        }
    } catch (erro) {
        console.error('Erro ao verificar conta:', erro);
    }
}
