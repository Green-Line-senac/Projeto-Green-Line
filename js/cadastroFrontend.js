const formularioCadastro = document.getElementById('formularioCadastro');
let dadosUsuario = [];
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
    const senha = document.getElementById('password').value;
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
        infoVal = false;
    }

    const emailRegex = /^([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/;
    if (!emailRegex.test(email)) {
        emailErro.classList.remove('d-none');
        emailErro.classList.add('d-block');
        infoVal = false;
    }

    const phoneRegex = /^\(\d{2}\)\s9\d{4}-\d{4}$/;
    if (!phoneRegex.test(telefone)) {
        telefoneErro.classList.remove('d-none');
        telefoneErro.classList.add('d-block');
        infoVal = false;
    }

    const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;
    if (!cpfRegex.test(cpf)) {
        cpfErro.classList.remove('d-none');
        cpfErro.classList.add('d-block');
        infoVal = false;
    }
    // Expressão regular para pelo menos 1 letra e 1 número
    const passRegex = /^(?=.*[a-zA-Z])(?=.*\d).{5,}$/;
    if (!passRegex.test(senha)) {
        senhaErro.classList.remove('d-none');
        senhaErro.classList.add('d-block');
    } else {
        senhaErro.classList.add('d-none');
    }


    if (infoVal) {
        dadosUsuario = { nome, email, cpf, telefone, senha };
        fetch("http://localhost:3000/cadastrar", { // URL correta do backend
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dadosUsuario)
        })
            .then(response => response.json())
            .then(data => {
                console.log("Resposta do servidor:", data);
                // Redireciona após o sucesso do cadastro
                window.location.href = "../login.html";
            })
            .catch(error => console.error("Erro ao cadastrar:", error));
    }

});

//MÁSCARAS
//CPF
document.getElementById('cpf').addEventListener('input', function (e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    e.target.value = value;
});
//TELEFONE
document.getElementById('telefone').addEventListener('input', function (e) {
    let value = e.target.value.replace(/\D/g, ''); // Remove caracteres não numéricos
    value = value.replace(/(\d{2})(\d)/, '($1) $2'); // Adiciona parênteses e espaço após DDD
    value = value.replace(/(\d{5})(\d)/, '$1-$2'); // Adiciona hífen no meio do número
    e.target.value = value;
});

