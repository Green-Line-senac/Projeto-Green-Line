const formularioCadastro = document.getElementById('formularioCadastro');
const senha = document.getElementById('password');
formularioCadastro.addEventListener('submit', function (e) {
    e.preventDefault();

    const nome = document.getElementById('username').value;
    const nomeErro = document.getElementById('nomeErro');
    const cpf = document.getElementById('cpf').value;
    const cpfErro = document.getElementById('cpfErro');
    const email = document.getElementById('email').value;
    const emailErro = document.getElementById('emailErro');
    const telefone = document.getElementById('telefone').value;
    const telefoneErro = document.getElementById('telefoneErro');
    senha = document.getElementById('password').value;
    const senhaErro = document.getElementById('senhaErro');

    let infoVal = true;

    // Limpa mensagens de erro
    nomeErro.textContent = "";
    cpfErro.textContent = "";
    emailErro.textContent = "";
    telefoneErro.textContent = "";
    senhaErro.textContent = "";

    // Validações
    const nameRegex = /^[a-zA-Z\s]{1,30}$/;
    if (!nameRegex.test(nome)) {
        nomeErro.classList.remove('d-none');
        nomeErro.classList.add('d-block');
        nomeErro.textContent = `Nome Inválido`;
        infoVal = false;
    }

    const emailRegex = /^([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/;
    if (!emailRegex.test(email)) {
        emailErro.textContent = `E-mail inválido`;
        emailErro.classList.remove('d-none');
        emailErro.classList.add('d-block');
        infoVal = false;
    }

    const phoneRegex = /^[1-9]{2}9\d{8}$/;
    if (!phoneRegex.test(telefone)) {
        telefoneErro.textContent = `Telefone Inválido`;
        infoVal = false;
    }

    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;
    if (!cpfRegex.test(cpf)) {
        cpfErro.textContent = `Cadastro de Pessoa Física Inválido`;
        infoVal = false;
    }

    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%?&])[A-Za-z\d@$!%?&]{8,}$/;
    if (!passRegex.test(senha)) {
        senhaErro.textContent =
            "A senha deve ter pelo menos 8 caracteres, incluindo 1 letra maiúscula, 1 número e 1 caractere especial.";
        infoVal = false;
    }

    if (infoVal) {
        alert("Cadastro realizado com sucesso!");
        formularioCadastro.submit();
    }
});

//INPUT SENHA
const botaoVerSenha = document.getElementById('togglePassword');
const olho = document.getElementById('olho');
contador = 0;
botaoVerSenha.addEventListener('click', function (e) {

    if (contador == 0) {
        olho.classList.remove('bi-eye');
        olho.classList.remove('text-white');
        olho.classList.add('bi-eye-slash');
        olho.classList.add('text-dark');
        senha.type = 'text';
        contador = 1;
    }
    else {
        olho.classList.remove('bi-eye-slash');
        olho.classList.add('bi-eye');
        olho.classList.add('text-white');
        olho.classList.remove('text-dark');
        senha.type = 'password';
        contador = 0;
    }
});