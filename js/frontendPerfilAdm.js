document.addEventListener('DOMContentLoaded', function() {
    // Verificar se o usuário é ADM
    const userEmail = localStorage.getItem('userEmail') || '';
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    
    if (!isAdmin) {
        // Redirecionar para perfil normal se não for ADM
        window.location.href = 'perfil.html';
        return;
    }

    // Elementos do DOM
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.main-content > div');
    const adminSections = document.querySelectorAll('.adm-item');
    
    // Mostrar/ocultar seções
    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.add('hidden');
        });
        document.getElementById(sectionId).classList.remove('hidden');
    }
    
    // Navegação
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            if (section) {
                navItems.forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
                showSection(`${section}-section`);
            }
        });
    });
    
    // Carregar dados do usuário
    function loadUserData() {
        // Simulando dados do usuário (na prática, você faria uma requisição AJAX)
        const userData = {
            name: "Administrador",
            email: userEmail,
            fullName: "Administrador do Sistema",
            phone: "(61) 99999-9999",
            cpf: "123.456.789-00",
            status: "Ativo"
        };
        
        document.getElementById('profileName').textContent = userData.name;
        document.getElementById('profileEmail').textContent = userData.email;
        document.getElementById('profileFullName').textContent = userData.fullName;
        document.getElementById('profilePhone').textContent = userData.phone;
        document.getElementById('profileCpf').textContent = userData.cpf;
        document.getElementById('profileStatus').textContent = userData.status;
        document.getElementById('profileEmailContent').textContent = userData.email;
    }
    
    // Carregar lista de usuários (para a seção ADM)
    function loadUsersList() {
        //  requisição AJAX
        const token = localStorage.getItem('userToken');
        fetch("http://localhost:3008/pessoa", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
            .then(response => response.json())
            .then(users => {
                const usersList = document.getElementById('adminUsersList');
                usersList.innerHTML = '';
                
                users.forEach(user => {
                    const userCard = document.createElement('div');
                    userCard.className = 'user-card';
                    userCard.innerHTML = `
                        <div class="user-name">${user.nome}</div>
                        <div class="user-email">${user.email}</div>
                        <div class="user-status ${getStatusClass(user.situacao)}">${getStatusText(user.situacao)}</div>
                        <div class="user-actions">
                            <button class="btn btn-sm btn-primary edit-user" data-id="${user.id_pessoa}">Editar</button>
                            <button class="btn btn-sm btn-secondary view-orders" data-id="${user.id_pessoa}">Pedidos</button>
                        </div>
                    `;
                    usersList.appendChild(userCard);
                });
                
                // Adicionar event listeners aos botões
                document.querySelectorAll('.edit-user').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const userId = this.getAttribute('data-id');
                        openUserEditModal(userId);
                    });
                });
            })
            .catch(error => {
                console.error('Erro ao carregar usuários:', error);
            });
    }
    
    function getStatusClass(status) {
        switch(status) {
            case 'A': return 'active';
            case 'I': return 'inactive';
            case 'P': return 'pending';
            default: return '';
        }
    }
    
    function getStatusText(status) {
        switch(status) {
            case 'A': return 'Ativo';
            case 'I': return 'Inativo';
            case 'P': return 'Pendente';
            default: return status;
        }
    }
    
    // Abrir modal de edição de usuário
    function openUserEditModal(userId) {
        // Simulando requisição AJAX para obter dados do usuário
         const token = localStorage.getItem('userToken');
        fetch("http://localhost:3008/pessoa" + `/${userId}`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
            .then(response => response.json())
            .then(user => {
                document.getElementById('userId').value = user.id_pessoa;
                document.getElementById('userName').value = user.nome;
                document.getElementById('userEmail').value = user.email;
                document.getElementById('userPhone').value = user.telefone;
                document.getElementById('userStatus').value = user.situacao;
                document.getElementById('userType').value = user.id_tipo_usuario;
                
                document.getElementById('userModalTitle').textContent = `Editar Usuário: ${user.nome}`;
                document.getElementById('userManagementModal').classList.remove('hidden');
            })
            .catch(error => {
                console.error('Erro ao carregar dados do usuário:', error);
            });
    }
    
    // Carregar imagens do carrossel
    function loadCarouselImages() {
        // Simulando requisição AJAX
        fetch('/carousel-images')
            .then(response => response.json())
            .then(images => {
                const carouselContainer = document.getElementById('currentCarouselImages');
                carouselContainer.innerHTML = '';
                
                images.forEach((image, index) => {
                    const imgElement = document.createElement('div');
                    imgElement.className = 'current-carousel-image';
                    imgElement.innerHTML = `
                        <img src="../img/carousel/${image.nomeImagem}" alt="Imagem do carrossel ${index + 1}">
                        <button class="delete-image" data-image="${image.nomeImagem}">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    carouselContainer.appendChild(imgElement);
                });
                
                // Adicionar event listener para deletar imagens
                document.querySelectorAll('.delete-image').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const imageName = this.getAttribute('data-image');
                        if (confirm(`Tem certeza que deseja remover a imagem ${imageName} do carrossel?`)) {
                            deleteCarouselImage(imageName);
                        }
                    });
                });
            })
            .catch(error => {
                console.error('Erro ao carregar imagens do carrossel:', error);
            });
    }
    
    // Deletar imagem do carrossel
    function deleteCarouselImage(imageName) {
        // Simulando requisição AJAX
        fetch('/delete-carousel-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ imageName })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Imagem removida com sucesso!');
                loadCarouselImages();
            } else {
                alert('Erro ao remover imagem: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro ao remover imagem:', error);
            alert('Erro ao remover imagem');
        });
    }
    
    // Upload de novas imagens para o carrossel
    document.getElementById('uploadCarouselBtn').addEventListener('click', function() {
        const input = document.getElementById('carouselImageInput');
        if (input.files.length === 0) {
            alert('Selecione pelo menos uma imagem para enviar');
            return;
        }
        
        const formData = new FormData();
        for (let i = 0; i < input.files.length; i++) {
            formData.append('carouselImages', input.files[i]);
        }
        
        // Simulando requisição AJAX
        fetch('/upload-carousel-images', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Imagens enviadas com sucesso!');
                loadCarouselImages();
                document.getElementById('carouselImageInput').value = '';
                document.getElementById('carouselImagePreview').innerHTML = '';
            } else {
                alert('Erro ao enviar imagens: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro ao enviar imagens:', error);
            alert('Erro ao enviar imagens');
        });
    });
    
    // Pré-visualização das imagens antes de enviar
    document.getElementById('carouselImageInput').addEventListener('change', function() {
        const preview = document.getElementById('carouselImagePreview');
        preview.innerHTML = '';
        
        if (this.files) {
            Array.from(this.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'image-preview-item';
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="Pré-visualização">
                        <button class="remove-image">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    preview.appendChild(previewItem);
                    
                    // Remover imagem da pré-visualização
                    previewItem.querySelector('.remove-image').addEventListener('click', function() {
                        previewItem.remove();
                    });
                }
                reader.readAsDataURL(file);
            });
        }
    });
    
    // Event listeners para os modais
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.add('hidden');
        });
    });
    
    document.getElementById('cancelUserEditBtn').addEventListener('click', function() {
        document.getElementById('userManagementModal').classList.add('hidden');
    });
    
    // Salvar alterações do usuário
    document.getElementById('userManagementForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const userId = document.getElementById('userId').value;
        const userData = {
            nome: document.getElementById('userName').value,
            email: document.getElementById('userEmail').value,
            telefone: document.getElementById('userPhone').value,
            situacao: document.getElementById('userStatus').value,
            id_tipo_usuario: document.getElementById('userType').value
        };
        
        // Simulando requisição AJAX
        const token = localStorage.getItem('userToken');
        fetch(`http://localost:3008/pessoa/ ${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            })
        .then(response => response.json())
        .then(data => {
            alert('Usuário atualizado com sucesso!');
            document.getElementById('userManagementModal').classList.add('hidden');
            loadUsersList();
        })
        .catch(error => {
            console.error('Erro ao atualizar usuário:', error);
            alert('Erro ao atualizar usuário');
        });
    });
    
    // Deletar usuário
    document.getElementById('deleteUserBtn').addEventListener('click', function() {
        if (confirm('Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.')) {
            const userId = document.getElementById('userId').value;
            
            // Simulando requisição AJAX
            fetch(`/pessoa/${userId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                alert('Usuário deletado com sucesso!');
                document.getElementById('userManagementModal').classList.add('hidden');
                loadUsersList();
            })
            .catch(error => {
                console.error('Erro ao deletar usuário:', error);
                alert('Erro ao deletar usuário');
            });
        }
    });
    
    // Botão para adicionar novo produto
    document.getElementById('addProductBtn').addEventListener('click', function() {
        window.location.href = '../public/cadastroProdutos.html';
    });
    
    // Inicialização
    loadUserData();
    
    // Carregar dados específicos de ADM quando acessar essas seções
    adminSections.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            if (section === 'admin-users') {
                loadUsersList();
            } else if (section === 'admin-carousel') {
                loadCarouselImages();
            }
        });
    });
    
    // Logout
    window.logout = function() {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userEmail');
        window.location.href = '../index.html';
    };
});