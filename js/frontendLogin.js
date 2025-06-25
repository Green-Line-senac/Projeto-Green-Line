const api = {
    online: 'https://green-line-web.onrender.com',
    login: 'http://localhost:3001',
    index: 'http://localhost:3002',
};

// Elementos do DOM
const formularioLogin = document.getElementById('formularioLogin');
const botaoEntrar = document.getElementById('entrar-na-conta');
const mensagemUsuario = document.getElementById('mensagem-superior');
const campoUsuario = document.getElementById('usuario');
const campoSenha = document.getElementById('senha');

// Configuração inicial
if (formularioLogin && botaoEntrar && mensagemUsuario && campoUsuario && campoSenha) {
    formularioLogin.addEventListener('submit', handleLogin);
} else {
    console.error('Elementos do DOM não encontrados. Verifique os IDs dos elementos.');
}

// Função principal de login
async function handleLogin(e) {
    e.preventDefault();

    // Obter valores dos campos
    const usuario = campoUsuario.value.trim();
    const senha = campoSenha.value.trim();

    // Resetar estados
    resetarEstadoLogin();

    // Validação dos campos
    if (!validarCampos(usuario, senha)) {
        return;
    }

    try {
        const resposta = await fazerRequisicaoLogin(usuario, senha);
        
        if (!resposta.ok) {
            tratarErroResposta(resposta);
            return;
        }

        const dados = await resposta.json();
        console.log('Resposta:', dados);

        await processarRespostaLogin(dados, usuario);

    } catch (erro) {
        console.error('Erro no processo de login:', erro);
        mostrarMensagem('Falha na conexão. Tente novamente.', 'danger');
    } finally {
        reativarBotao();
    }
}

// Funções auxiliares
function resetarEstadoLogin() {
    mensagemUsuario.textContent = '';
    mensagemUsuario.className = 'd-none';
    botaoEntrar.disabled = true;
    botaoEntrar.classList.replace('btn-success', 'btn-secondary');
}

function validarCampos(usuario, senha) {
    if (!usuario || !senha) {
        mostrarMensagem('Preencha todos os campos.', 'warning');
        reativarBotao();
        return false;
    }

    if (senha.length < 4) {
        mostrarMensagem('A senha deve ter pelo menos 6 caracteres.', 'warning');
        reativarBotao();
        return false;
    }

    return true;
}

async function fazerRequisicaoLogin(usuario, senha) {
    return await fetch(`${api.online}/verificarConta`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ usuario, senha })
    });
}

function tratarErroResposta(resposta) {
    if (resposta.status === 401) {
        mostrarMensagem('Credenciais inválidas ou conta não encontrada.', 'danger');
    } else if (resposta.status === 403) {
        mostrarMensagem('Acesso não autorizado. Conta pendente ou bloqueada.', 'warning');
    } else if (resposta.status >= 500) {
        mostrarMensagem('Erro no servidor. Tente novamente mais tarde.', 'danger');
    } else {
        mostrarMensagem('Erro desconhecido. Tente novamente.', 'warning');
    }
}

async function processarRespostaLogin(dados, usuario) {
    switch (dados.dadosValidos) {
        case 0:
            mostrarMensagem('Conta não encontrada.', 'danger');
            break;
        case 1:
            await tratarContaNaoVerificada(dados, usuario);
            break;
        case 2:
            await tratarLoginBemSucedido(dados);
            break;
        case 3:
            mostrarMensagem('Credenciais inválidas.', 'danger');
            break;
        default:
            mostrarMensagem('Erro desconhecido.', 'warning');
    }
}

async function tratarContaNaoVerificada(dados, usuario) {
    mostrarMensagem("Email não verificado. Verifique sua caixa de entrada.", "warning");
    
    if (usuario.includes("@")) {
        try {
            await fetch(`${api.online}/enviarEmail`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ usuario })
            });
        } catch (erro) {
            console.error("Erro ao enviar o email: ", erro);
            mostrarMensagem('Erro ao enviar email de verificação.', 'warning');
        }
    }
}

async function tratarLoginBemSucedido(dados) {
    try {
        // Armazenar dados do usuário de forma segura
        armazenarDadosUsuario(dados);
        
        // Redirecionar conforme tipo de usuário
       const email = dados.user.email;
        const redirectUrl = dados.user.isAdmin ? 'perfilAdm.html' : 'perfil.html';

        window.location.href = redirectUrl;
        
    } catch (erro) {
        console.error("Erro ao processar login:", erro);
        mostrarMensagem('Erro ao processar login.', 'danger');
        logout(); // Limpar dados em caso de erro
    }
}


function armazenarDadosUsuario(dados) {
    try {
        localStorage.setItem("usuario", dados.user.email);
        localStorage.setItem('userToken', dados.token);
        localStorage.setItem('id_pessoa', dados.user.id_pessoa); // Corrigido para id_pessoa
        localStorage.setItem('userEmail', dados.user.email);
        localStorage.setItem('userType', dados.user.tipo_usuario);
        localStorage.setItem('isAdmin', dados.user.isAdmin);

        
        // Armazenar data de login para controle de sessão
        localStorage.setItem('loginTime', new Date().getTime());
    } catch (e) {
        console.error("Erro ao armazenar dados no localStorage:", e);
        throw new Error("Falha ao armazenar dados do usuário");
    }
}

function mostrarMensagem(texto, tipo) {
  mensagemUsuario.textContent = texto;
  mensagemUsuario.className = `d-block alert text-bg-${tipo} text-center mb-2`;
}

function reativarBotao() {
    botaoEntrar.disabled = false;
    botaoEntrar.classList.replace('btn-secondary', 'btn-success');
}

// Função de logout melhorada
function logout() {
    // Limpar todos os dados de autenticação
    const itemsToRemove = [
        'userToken', 'userId', 'userEmail', 
        'userType', 'usuario', 'loginTime'
    ];
    
    itemsToRemove.forEach(item => localStorage.removeItem(item));
    
    // Redirecionar para login com parâmetro de logout
    window.location.href = 'login.html?logout=success';
}

// Verificar parâmetro de logout na URL
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('logout') && urlParams.get('logout') === 'success') {
        mostrarMensagem('Você foi desconectado com sucesso.', 'success');
    }
});

// Exportar funções para teste (se estiver usando módulos)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleLogin,
        validarCampos,
        armazenarDadosUsuario,
        logout
    };
}
