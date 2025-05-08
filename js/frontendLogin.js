const formularioLogin = document.getElementById('formularioLogin');

formularioLogin.addEventListener('submit', async function (e) {
    e.preventDefault();

    const usuario = document.getElementById('usuario').value.trim();
    const senha = document.getElementById('senha').value.trim();
    const mensagemUsuario = document.getElementById('mensagem-superior');

    if (!usuario || !senha) {
        mensagemUsuario.className = "d-block alert text-bg-warning fw-bold -2 text-center mb-2";
        mensagemUsuario.textContent = 'Por favor, preencha todos os campos.';
        return;
    }

    try {
        const resposta = await fetch('http://localhost:3001/verificarConta', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usuario, senha })
        });

        const dados = await resposta.json();
        console.log('Resposta do servidor:', dados);

        switch (dados.dadosValidos) {
            case 0:
                mensagemUsuario.className = "d-block alert text-bg-danger fw-bold -2 text-center mb-2";
                mensagemUsuario.textContent = 'Conta não existente. Faça um cadastro para prosseguir.';
                break;
            case 1:
                mensagemUsuario.className = "d-block alert text-bg-warning fw-bold -2 text-center mb-2";
                mensagemUsuario.textContent = 'Seu email não está verificado. Enviamos um novo token no seu email.';
                break;
            case 2:
                // Atualiza o estado no servidor de autenticação
                const respostaAuth = await fetch('http://localhost:3002/loginDados', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trocar: 1 })
                });
                
                if (!respostaAuth.ok) throw new Error('Falha ao atualizar estado de login');
                
                localStorage.setItem("usuario", usuario);
                window.location.href = '/index.html';
                break;
            case 3:
                mensagemUsuario.className = "d-block alert text-bg-danger fw-bold -2 text-center mb-2";
                mensagemUsuario.textContent = 'Usuário ou senha incorretos. Verifique suas credenciais.';
                break;
            default:
                mensagemUsuario.className = "d-block alert text-bg-warning fw-bold -2 text-center mb-2";
                mensagemUsuario.textContent = 'Resposta inesperada do servidor.';
        }
    } catch (erro) {
        console.error('Erro no processo de login:', erro);
        mensagemUsuario.className = "d-block alert text-bg-danger fw-bold -2 text-center mb-2";
        mensagemUsuario.textContent = 'Erro ao conectar com o servidor. Tente novamente.';
    }
});