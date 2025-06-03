// Dados do usuário
let usuarioLogado = null;
// URL da API
const api = {
    online: "https://green-line-web.onrender.com",
    perfil: "http://localhost:3008",
    index: "http://localhost:3002"
}

// Função para carregar dados do usuário
async function carregarDadosUsuario() {
    try {
        const idPessoa = Number(localStorage.getItem('id_pessoa'));
        console.log(idPessoa);
        
        if (!idPessoa) {
            window.location.href = '../index.html';
            return;
        }

        const response = await fetch(`${api.perfil}/pessoa/${idPessoa}`);
        
        if (!response.ok) {
            throw new Error('Erro ao carregar dados do usuário');
        }

        usuarioLogado = await response.json();
        console.log(usuarioLogado);
        
        await mostrarPerfil(usuarioLogado);
    } catch (error) {
        console.error('Erro ao carregar perfil:', error);
        alert('Erro ao carregar perfil. Redirecionando para login...');
        window.location.href = '../index.html';
    }
}

const semphoto = 'https://w7.pngwing.com/pngs/81/570/png-transparent-profile-logo-computer-icons-user-user-blue-heroes-logo-thumbnail.png';

// Mostrar perfil com dados do usuário
function mostrarPerfil(usuario) {
    console.log('Mostrando perfil do usuário:', usuario);
    if (!usuario) return;
    console.log('Dados do usuário:', usuario);
    
    // Preenche os dados na página
    document.getElementById('profileName').textContent = usuario[0].nome || 'Nome não informado';
    document.getElementById('profileEmail').textContent = usuario[0].email || 'Email não informado';
    document.getElementById('profileEmailContent').textContent = usuario[0].email || 'Email não informado';
    document.getElementById('profileFullName').textContent = usuario[0].nome || 'Nome não informado';
    document.getElementById('profilePhone').textContent = usuario[0].telefone || 'Telefone não informado';
    document.getElementById('profileCpf').textContent = usuario[0].cpf || 'CPF não informado';
    document.getElementById('profileStatus').textContent = usuario[0].situacao === 'A' ? 'Ativo' : 'Inativo';
    
    // Imagem de perfil
    if (usuario.imagem_perfil === null || usuario.imagem_perfil === '') {
        document.getElementById('profileAvatar').src = semphoto;
    }
}

// Configura os event listeners
function setupEventListeners() {
    // Navegação entre seções
    document.querySelectorAll('.nav-item').forEach(item => {
        if (!item.onclick) {
            item.addEventListener('click', function() {
                if (this.dataset.section) {
                    // Remove a classe active de todos os itens
                    document.querySelectorAll('.nav-item').forEach(navItem => {
                        navItem.classList.remove('active');
                    });
                    
                    // Adiciona a classe active apenas no item clicado
                    this.classList.add('active');
                    
                    // Esconde todas as seções
                    document.querySelectorAll('.main-content > div').forEach(section => {
                        section.classList.add('hidden');
                    });
                    
                    // Mostra apenas a seção selecionada
                    document.getElementById(`${this.dataset.section}-section`).classList.remove('hidden');
                }
            });
        }
    });

    // Upload de imagem de perfil
    document.getElementById('avatarInput').addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            try {
                const reader = new FileReader();
                reader.onload = function(event) {
                    document.getElementById('profileAvatar').src = event.target.result;
                    atualizarImagemPerfil(event.target.result);
                };
                reader.readAsDataURL(file);
            } catch (error) {
                console.error('Erro ao atualizar imagem:', error);
                alert('Erro ao atualizar imagem de perfil');
            }
        }
    });

    // Edição de campos
    document.querySelectorAll('.editable').forEach(item => {
        item.addEventListener('click', function() {
            const currentValue = this.textContent;
            const fieldName = this.id.replace('profile', '').toLowerCase();
            
            const newValue = prompt(`Editar ${fieldName}:`, currentValue);
            if (newValue && newValue !== currentValue) {
                this.textContent = newValue;
            }
        });
    });

    // Botão salvar
    document.getElementById('savePersonalBtn').addEventListener('click', async function() {
        try {
            const idPessoa = localStorage.getItem('id_pessoa');
            const updatedData = {
                nome: document.getElementById('profileFullName').textContent,
                telefone: document.getElementById('profilePhone').textContent
            };

            const response = await fetch(`${api.perfil}/pessoa/${idPessoa}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                alert('Dados atualizados com sucesso!');
                await carregarDadosUsuario();
            } else {
                throw new Error('Erro ao atualizar dados');
            }
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            alert('Erro ao salvar alterações');
        }
    });
}

// Configurações do usuário
function setupSettings() {
    // Modo Noturno
    const darkModeToggle = document.getElementById('darkModeToggle');
    darkModeToggle.addEventListener('change', toggleDarkMode);
    
    // Carrega configurações salvas
    loadSettings();
    
    // Deletar conta
    document.getElementById('deleteAccountBtn').addEventListener('click', showDeleteModal);
    document.getElementById('cancelDeleteBtn').addEventListener('click', hideDeleteModal);
    document.getElementById('confirmDeleteBtn').addEventListener('click', deleteAccount);
    
    // Endereço
    document.getElementById('updateAddressBtn').addEventListener('click', showAddressModal);
    document.getElementById('cancelAddressBtn').addEventListener('click', hideAddressModal);
    document.getElementById('addressForm').addEventListener('submit', saveAddress);
    
    // Pagamento
    document.getElementById('addPaymentMethodBtn').addEventListener('click', showPaymentModal);
    document.getElementById('cancelPaymentBtn').addEventListener('click', hidePaymentModal);
    document.getElementById('paymentForm').addEventListener('submit', addPaymentMethod);
    
    // Fechar modais
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.add('hidden');
        });
    });
}

function toggleDarkMode() {
    const isDarkMode = document.getElementById('darkModeToggle').checked;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
}

function loadSettings() {
    // Carrega modo noturno
    const darkMode = localStorage.getItem('darkMode') === 'true';
    document.getElementById('darkModeToggle').checked = darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    
    // Carrega endereço
    loadUserAddress();
    
    // Carrega métodos de pagamento
    loadPaymentMethods();
}

async function loadUserAddress() {
    try {
        const idPessoa = localStorage.getItem('id_pessoa');
        const response = await fetch(`${api.perfil}/pessoa/${idPessoa}/endereco`);
        
        if (response.ok) {
            const address = await response.json();
            document.getElementById('addressContent').innerHTML = `
                <p><strong>CEP:</strong> ${address.cep || 'Não informado'}</p>
                <p><strong>Endereço:</strong> ${address.logradouro || 'Não informado'}</p>
                <p><strong>Número:</strong> ${address.numero || 'Não informado'}</p>
                <p><strong>Complemento:</strong> ${address.complemento || 'Nenhum'}</p>
                <p><strong>Cidade:</strong> ${address.cidade || 'Não informado'}</p>
                <p><strong>Estado:</strong> ${address.estado || 'Não informado'}</p>
            `;
        } else {
            document.getElementById('addressContent').innerHTML = '<p>Nenhum endereço cadastrado</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar endereço:', error);
    }
}

async function loadPaymentMethods() {
    try {
        const idPessoa = localStorage.getItem('id_pessoa');
        const response = await fetch(`${api.perfil}/pessoa/${idPessoa}/pagamentos`);
        
        if (response.ok) {
            const methods = await response.json();
            let html = '<div class="payment-methods-list">';
            
            methods.forEach(method => {
                html += `
                    <div class="payment-method">
                        <i class="fab fa-cc-${method.tipo.toLowerCase()}"></i>
                        <span>${method.tipo} ****${method.numero.slice(-4)}</span>
                        <button class="btn-remove-payment" data-id="${method.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            });
            
            html += '</div>';
            document.getElementById('paymentMethods').innerHTML = html;
            
            // Adiciona eventos aos botões de remover
            document.querySelectorAll('.btn-remove-payment').forEach(btn => {
                btn.addEventListener('click', removePaymentMethod);
            });
        } else {
            document.getElementById('paymentMethods').innerHTML = '<p>Nenhum método de pagamento cadastrado</p>';
        }
    } catch (error) {
        console.error('Erro ao carregar métodos de pagamento:', error);
    }
}

function showDeleteModal() {
    document.getElementById('deleteModal').classList.remove('hidden');
}

function hideDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
}

async function deleteAccount() {
    try {
        const idPessoa = localStorage.getItem('id_pessoa');
        const response = await fetch(`${api.perfil}/pessoa/${idPessoa}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Conta deletada com sucesso. Redirecionando...');
            logout();
        } else {
            throw new Error('Erro ao deletar conta');
        }
    } catch (error) {
        console.error('Erro ao deletar conta:', error);
        alert('Erro ao deletar conta. Tente novamente.');
    } finally {
        hideDeleteModal();
    }
}

function showAddressModal() {
    document.getElementById('addressModal').classList.remove('hidden');
}

function hideAddressModal() {
    document.getElementById('addressModal').classList.add('hidden');
}

async function saveAddress(e) {
    e.preventDefault();
    try {
        const idPessoa = localStorage.getItem('id_pessoa');
        const formData = {
            cep: document.getElementById('cep').value,
            logradouro: document.getElementById('logradouro').value,
            numero: document.getElementById('numero').value,
            complemento: document.getElementById('complemento').value,
            cidade: document.getElementById('cidade').value,
            estado: document.getElementById('estado').value
        };
        
        const response = await fetch(`${api.perfil}/pessoa/${idPessoa}/endereco`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            alert('Endereço atualizado com sucesso!');
            loadUserAddress();
            hideAddressModal();
        } else {
            throw new Error('Erro ao atualizar endereço');
        }
    } catch (error) {
        console.error('Erro ao salvar endereço:', error);
        alert('Erro ao salvar endereço');
    }
}

function showPaymentModal() {
    document.getElementById('paymentModal').classList.remove('hidden');
}

function hidePaymentModal() {
    document.getElementById('paymentModal').classList.add('hidden');
}

async function addPaymentMethod(e) {
    e.preventDefault();
    try {
        const idPessoa = localStorage.getItem('id_pessoa');
        const formData = {
            tipo: document.getElementById('paymentType').value,
            numero: document.getElementById('cardNumber').value
        };
        
        const response = await fetch(`${api.perfil}/pessoa/${idPessoa}/pagamentos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            alert('Método de pagamento adicionado com sucesso!');
            loadPaymentMethods();
            hidePaymentModal();
        } else {
            throw new Error('Erro ao adicionar método de pagamento');
        }
    } catch (error) {
        console.error('Erro ao adicionar método de pagamento:', error);
        alert('Erro ao adicionar método de pagamento');
    }
}

async function removePaymentMethod(e) {
    const methodId = e.currentTarget.dataset.id;
    try {
        const idPessoa = localStorage.getItem('id_pessoa');
        const response = await fetch(`${api.perfil}/pessoa/${idPessoa}/pagamentos/${methodId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Método de pagamento removido com sucesso!');
            loadPaymentMethods();
        } else {
            throw new Error('Erro ao remover método de pagamento');
        }
    } catch (error) {
        console.error('Erro ao remover método de pagamento:', error);
        alert('Erro ao remover método de pagamento');
    }
}

// Função para atualizar imagem de perfil
async function atualizarImagemPerfil(imageData) {
    try {
        const idPessoa = localStorage.getItem('id_pessoa');
        const response = await fetch(`${api.perfil}/pessoa/${idPessoa}/imagem`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imagem_perfil: imageData })
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar imagem');
        }
    } catch (error) {
        console.error('Erro:', error);
        throw error;
    }
}

// Logout
async function logout() {
    try {
        const respostaLogout = await fetch(`${api.index}/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!respostaLogout.ok) {
            throw new Error('Erro ao fazer logout - Status: ' + respostaLogout.status);
        }

        const resposta = await respostaLogout.json();
        
        if(resposta.status == "sucesso") {
            console.log('Logout realizado com sucesso');
            localStorage.removeItem('usuario');
            localStorage.removeItem('id_pessoa');
            localStorage.clear();
            window.location.href = '../index.html'; 
        } else {
            console.error('Erro ao realizar logout:', resposta.mensagem);
            alert('Erro ao realizar logout. Tente novamente.');
        }
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao fazer logout. Tente novamente.');
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarDadosUsuario();
    setupEventListeners();
    setupSettings();
});