// frontendPerfilAdm.js
import { showSuccess, showError, showWarning, showInfo, showValidationError, showLoading, hideNotification } from './notifications.js';

// Dados do usuário
let usuarioLogado = null;
// Configuração inteligente de API baseada no ambiente
const isDeployment = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

const api = {
  online: "https://green-line-web.onrender.com",
  perfil: isDeployment ? "https://green-line-web.onrender.com" : "http://localhost:3008",
  index: isDeployment ? "https://green-line-web.onrender.com" : "http://localhost:3002",
};

// Função utilitária para fazer requisições com fallback automático
async function fetchWithFallback(localUrl, onlineUrl, options = {}) {
  if (isDeployment) {
    console.log('Ambiente de deploy detectado, usando servidor online...');
    return await fetch(onlineUrl, options);
  } else {
    try {
      return await fetch(localUrl, options);
    } catch (localError) {
      console.log('Servidor local não disponível, tentando servidor online...');
      return await fetch(onlineUrl, options);
    }
  }
}
const basePath = window.location.pathname.includes("green_line_web")
  ? "/green_line_web/public"
  : "/public";

async function loadCarouselImages() {
  const container = document.getElementById("currentCarouselImages");
  container.innerHTML = "Carregando imagens...";

  try {
    const response = await fetch(`${api.perfil}/carousel-images`);
    if (!response.ok) {
      throw new Error("Erro ao buscar imagens do carrossel");
    }

    const images = await response.json();
    container.innerHTML = "";

    if (images.length === 0) {
      container.innerHTML = "<p>Nenhuma imagem no carrossel. Faça upload para adicionar.</p>";
      return;
    }

    images.forEach(image => {
      const imgItem = document.createElement("div");
      imgItem.classList.add("carousel-image-item");
      imgItem.innerHTML = `
        <img src="${image.nomeImagem}" alt="Imagem do Carrossel">
        <button class="delete-carousel-image-btn" data-image-name="${image.nomeImagem}">Deletar</button>
      `;
      container.appendChild(imgItem);
    });

    document.querySelectorAll(".delete-carousel-image-btn").forEach(button => {
      button.addEventListener("click", async (e) => {
        const imageName = e.target.dataset.imageName;
        try {
          const deleteResponse = await fetch(`${api.perfil}/carousel-image/${imageName}`, {
            method: "DELETE"
          });
          if (deleteResponse.ok) {
            alert("Imagem deletada com sucesso!");
            loadCarouselImages();
          } else {
            throw new Error("Erro ao deletar imagem.");
          }
        } catch (error) {
          console.error("Erro ao deletar imagem:", error);
          alert("Erro ao deletar imagem. Tente novamente.");
        }
      });
    });

  } catch (error) {
    console.error("Erro ao carregar imagens do carrossel:", error);
    container.innerHTML = "<p>Erro ao carregar imagens. Verifique se o backend está ativo.</p>";
  }
}


document.addEventListener('DOMContentLoaded', async function () {
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true';

  if (!isAdmin) {
    showError('Acesso negado', 'Você não tem permissão para acessar esta página');
    setTimeout(() => {
      window.location.href = 'perfil.html';
    }, 2000);
    return;
  }

  function filterUsers(query) {
  query = query.toLowerCase();
  document.querySelectorAll('#adminUsersList .user-card').forEach(card => {
    const name = card.querySelector('.user-name').textContent.toLowerCase();
    const email = card.querySelector('.user-email').textContent.toLowerCase();
    card.style.display = (name.includes(query) || email.includes(query)) ? '' : 'none';
  });
}

document.getElementById('searchUserBtn')?.addEventListener('click', function () {
  const query = document.getElementById('userSearch').value;
  filterUsers(query);
});

document.getElementById('userSearch')?.addEventListener('input', function () {
  filterUsers(this.value);
});


  async function carregarDadosUsuario() {
    const loadingId = showLoading('Carregando perfil...', 'Buscando suas informações de administrador');

    try {
      // 1. Verificar se o usuário está autenticado
      const token = sessionStorage.getItem("userToken");
      const idPessoa = sessionStorage.getItem("id_pessoa");

      if (!token || !idPessoa) {
        console.error("Usuário não autenticado - redirecionando para login");
        hideNotification(loadingId);
        showError('Acesso negado', 'Você precisa fazer login para acessar esta página');
        setTimeout(() => {
          window.location.href = `${basePath}/login.html`;
        }, 2000);
        return;
      }

      // 2. Fazer a requisição com o token de autenticação
      const response = await fetch(`${api.online}/pessoa/${idPessoa}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // 3. Verificar se a resposta foi bem sucedida
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Token inválido ou expirado - forçar logout
          hideNotification(loadingId);
          showError('Sessão expirada', 'Sua sessão expirou. Faça login novamente');
          setTimeout(() => {
            logout();
          }, 2000);
          return;
        }
        throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
      }

      // 4. Processar os dados do usuário
      const data = await response.json();
      usuarioLogado = data[0];
      console.log("Dados do usuário admin carregados:", usuarioLogado);
      preencherDadosPerfil(usuarioLogado);
      await loadAddress();

      // Carregar configurações do modo noturno
      const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
      document.body.classList.toggle('dark-mode', darkModeEnabled);
      document.getElementById('darkModeToggle').checked = darkModeEnabled;

      hideNotification(loadingId);
      showSuccess('Perfil admin carregado!', 'Suas informações foram carregadas com sucesso', { duration: 3000 });

    } catch (error) {
      console.error("Erro ao carregar dados do usuário admin:", error);
      hideNotification(loadingId);
      showError('Erro ao carregar perfil', 'Não foi possível carregar suas informações. Tente novamente.');
    }
  }

   function preencherDadosPerfil(user) {

    document.getElementById("profileName").textContent = user.nome || "Nome";
    document.getElementById("profileEmail").textContent = user.email || "email@exemplo.com";
    document.getElementById("profileEmailContent").textContent = user.email || "email@exemplo.com";
    document.getElementById("profileFullName").textContent = user.nome || "Nome Completo";
    document.getElementById("profilePhone").textContent = user.telefone || "Não informado";
    document.getElementById("profileCpf").textContent = user.cpf || "Não informado";
    document.getElementById("profileStatus").textContent = user.situacao === 'A' ? 'Ativo' : 'Pendente/Inativo';

    document.getElementById("profileAvatar").src = user.imagem_perfil;
    
    const avatar = document.getElementById("profileAvatar");
    sessionStorage.setItem("avatar", avatar.src);
  

    // Alterar para inputs editáveis
    document.getElementById("profileFullName").innerHTML = `
        <input type="text" id="editNome" value="${user.nome || ''}" class="editable-input">
    `;

    document.getElementById("profilePhone").innerHTML = `
        <input type="text" id="editTelefone" value="${user.telefone || ''}" class="editable-input">
    `;
  }

  /* --- NOVA FUNÇÃO: carrega endereço independente dos dados do usuário --- */
  async function loadAddress() {
    const idPessoa = sessionStorage.getItem("id_pessoa");
    const token = sessionStorage.getItem("userToken");
    if (!idPessoa || !token) return;

    try {
      // Tenta primeiro o servidor local, depois o online
      let resp;
      try {
        resp = await fetch(`${api.online}/pessoa/${idPessoa}/enderecos`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
      } catch (localError) {
        console.log('Servidor local não disponível, tentando servidor online...');
        resp = await fetch(`${api.online}/pessoa/${idPessoa}/enderecos`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
      }

      if (!resp.ok) throw new Error("Falha no GET de endereço");
      const endereco = await resp.json();     // backend devolve objeto
      if (endereco) {
        preencherEndereco(endereco);
      } else {
        document.getElementById("addressContent").innerHTML =
          "<p>Nenhum endereço cadastrado. Clique em 'Atualizar Endereço' para adicionar.</p>";
      }
    } catch (err) {
      console.error("Erro ao buscar endereço:", err);
      document.getElementById("addressContent").innerHTML =
        "<p>Erro ao carregar endereço.</p>";
    }
  }

  function preencherEndereco(endereco) {
    if (Array.isArray(endereco)) endereco = endereco[0];
    if (!endereco) return;
    
    // Salva o endereço no sessionStorage para uso em outras páginas
    sessionStorage.setItem("enderecoUsuario", JSON.stringify(endereco));
    
    const addressContent = document.getElementById("addressContent");
    addressContent.innerHTML = `
      <p>${endereco.endereco},${endereco.complemento ? ' - ' + endereco.complemento : ''}</p>
      <p>${endereco.cidade} - ${endereco.uf}, ${endereco.cep}</p>
      <p>${endereco.bairro || ''}</p>
    `;

    // Pré-preencher modal
    document.getElementById("cep").value = endereco.cep || "";
    document.getElementById("endereco").value = endereco.endereco || "";
    document.getElementById("complemento").value = endereco.complemento || "";
    document.getElementById("cidade").value = endereco.cidade || "";
    document.getElementById("uf").value = endereco.uf || "";
    document.getElementById("bairro").value = endereco.bairro || "";

    // Guarde o id_endereco para PUT depois
    const addressForm = document.getElementById("addressForm");
    if (addressForm) {
      addressForm.dataset.idEndereco = endereco.id_endereco;
    }
  }

  // Navegação
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", function () {
      const section = this.getAttribute("data-section");
      document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
      this.classList.add("active");

      document.querySelectorAll(".main-content > div").forEach(s => s.classList.add("hidden"));
      const sectionId = section + "-section";
      document.getElementById(sectionId)?.classList.remove("hidden");

      // Carregamento dinâmico por seção
      if (section === "admin-users") loadUsersList();
      if (section === "admin-carousel") loadCarouselImages();
     if (section === "purchase-history") {
  carregarHistoricoComprasAdmin(); // se ainda usa
  carregarPedidosAdm(); // necessário
}


    });
  });

  // Modo noturno
  document.getElementById('darkModeToggle').addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    document.body.classList.toggle('dark-mode', isChecked);
    localStorage.setItem('darkMode', isChecked ? 'true' : 'false');
  });


  // Lógica para o modal de endereço
  const addressModal = document.getElementById("addressModal");
  const updateAddressBtn = document.getElementById("updateAddressBtn");
  const closeAddressModal = addressModal.querySelector(".close-modal");
  const cancelAddressBtn = document.getElementById("cancelAddressBtn");
  const addressForm = document.getElementById("addressForm");

  updateAddressBtn.addEventListener("click", () => {
    addressModal.classList.remove("hidden");
  });

  closeAddressModal.addEventListener("click", () => {
    addressModal.classList.add("hidden");
  });

  cancelAddressBtn.addEventListener("click", () => {
    addressModal.classList.add("hidden");
  });

  window.addEventListener("click", (event) => {
    if (event.target === addressModal) {
      addressModal.classList.add("hidden");
    }
  });

  document.getElementById("addressForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const loadingId = showLoading('Salvando endereço...', 'Atualizando suas informações de entrega');

    const idPessoa = sessionStorage.getItem("id_pessoa");
    const token = sessionStorage.getItem("userToken");

    const body = {
      uf: this.uf.value,
      cep: this.cep.value,
      cidade: this.cidade.value,
      bairro: this.bairro.value,
      endereco: this.endereco.value,
      complemento: this.complemento.value,
    };

    try {
      // Tenta primeiro o servidor local, depois o online
      let response;
      try {
        response = await fetch(`${api.online}/pessoa/${idPessoa}/enderecos`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(body),
        });
      } catch (localError) {
        console.log('Servidor local não disponível, tentando servidor online...');
        response = await fetch(`${api.online}/pessoa/${idPessoa}/enderecos`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(body),
        });
      }

      if (!response.ok) {
        const erro = await response.json();
        throw new Error(erro.error || "Erro ao atualizar endereço");
      }

      hideNotification(loadingId);
      showSuccess('Endereço salvo!', 'Seu endereço foi atualizado com sucesso');

      // Salva o endereço no sessionStorage para uso em outras páginas
      sessionStorage.setItem("enderecoUsuario", JSON.stringify(body));
      document.getElementById("addressModal").classList.add("hidden");
      loadAddress(); // recarrega os dados na interface
    } catch (err) {
      console.error("Erro ao atualizar endereço:", err);
      hideNotification(loadingId);
      showError('Erro ao salvar endereço', err.message || 'Não foi possível atualizar seu endereço');
    }
  });

  // Integração com ViaCEP para preenchimento automático de endereço
  function buscarEnderecoPorCep(cep) {
    // Remove caracteres não numéricos
    cep = cep.replace(/\D/g, "");
    if (cep.length !== 8) return;

    const loadingId = showLoading('Buscando CEP...', 'Consultando dados do endereço');

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then((res) => res.json())
      .then((data) => {
        hideNotification(loadingId);
        if (data.erro) {
          showError('CEP não encontrado', 'Verifique se o CEP digitado está correto');
          return;
        }
        document.getElementById("endereco").value = data.logradouro || "";
        document.getElementById("bairro").value = data.bairro || "";
        document.getElementById("cidade").value = data.localidade || "";
        document.getElementById("uf").value = data.uf || "";
        showSuccess('CEP encontrado!', 'Endereço preenchido automaticamente', { duration: 3000 });
      })
      .catch(() => {
        hideNotification(loadingId);
        showError('Erro ao buscar CEP', 'Não foi possível consultar o CEP. Tente novamente.');
      });
  }

  // Adiciona evento ao campo de CEP do modal de endereço
  const cepInput = document.getElementById("cep");
  if (cepInput) {
    cepInput.addEventListener("blur", function () {
      buscarEnderecoPorCep(this.value);
    });
    cepInput.addEventListener("keyup", function () {
      if (this.value.replace(/\D/g, "").length === 8) {
        buscarEnderecoPorCep(this.value);
      }
    });
  }

 // Lógica para upload de imagem de perfil
  const avatarInput = document.getElementById('avatarInput');
  avatarInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('Arquivo muito grande', 'A imagem deve ter no máximo 5MB');
        return;
      }

      // Validar tipo do arquivo
      if (!file.type.startsWith('image/')) {
        showError('Formato inválido', 'Por favor, selecione apenas arquivos de imagem');
        return;
      }

      const loadingId = showLoading('Atualizando foto...', 'Fazendo upload da sua nova imagem de perfil');

      const reader = new FileReader();
      reader.onload = async (e) => {
  try {
    let base64 = e.target.result;
    if (!base64.startsWith("data:image")) {
      base64 = "data:image/png;base64," + base64;
    }
    await atualizarImagemPerfil(base64);
    document.getElementById('profileAvatar').src = base64;
    hideNotification(loadingId);
    showSuccess('Foto atualizada!', 'Sua imagem de perfil foi atualizada com sucesso');
  } catch (error) {
    console.error("Erro ao atualizar imagem de perfil:", error);
    hideNotification(loadingId);
    showError('Erro ao atualizar foto', 'Não foi possível atualizar sua imagem de perfil');
  }
};
      reader.readAsDataURL(file);
    }
  });

 
  // Lógica para o modal de exclusão de conta
  const deleteModal = document.getElementById("deleteModal");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");
  const closeDeleteModal = deleteModal.querySelector(".close-modal");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

  deleteAccountBtn.addEventListener("click", () => {
    deleteModal.classList.remove("hidden");
  });

  closeDeleteModal.addEventListener("click", () => {
    deleteModal.classList.add("hidden");
  });

  cancelDeleteBtn.addEventListener("click", () => {
    deleteModal.classList.add("hidden");
  });

  window.addEventListener("click", (event) => {
    if (event.target === deleteModal) {
      deleteModal.classList.add("hidden");
    }
  });

  confirmDeleteBtn.addEventListener("click", async () => {
    const loadingId = showLoading('Excluindo conta...', 'Processando exclusão da sua conta');

    try {
      const token = sessionStorage.getItem("userToken");
      const id = document.getElementById("userId").value;


      const response = await fetch(`${api.online}/pessoa/${idPessoa}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao deletar conta");
      }

      hideNotification(loadingId);
      showSuccess('Conta excluída!', 'Sua conta foi excluída com sucesso. Você será redirecionado.');

      setTimeout(() => {
        logout(); // Desloga o usuário após a exclusão da conta
      }, 2000);
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      hideNotification(loadingId);
      showError('Erro ao excluir conta', 'Não foi possível excluir sua conta. Tente novamente.');
    }
  });

  // --- Funções ADM ---
  function loadUsersList() {
    const token = sessionStorage.getItem("userToken");
    fetch(`${api.online}/pessoa`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(users => {
        const list = document.getElementById("adminUsersList");
        list.innerHTML = "";
        users.forEach(u => {
          list.innerHTML += `
            <div class="user-card">
              <div class="user-name">${u.nome}</div>
              <div class="user-email">${u.email}</div>
              <div class="user-status">${u.situacao}</div>
              <div class="user-actions">
                <button class="btn btn-sm btn-primary edit-user" data-id="${u.id_pessoa}">Editar</button>
              </div>
            </div>
          `;
        });

        document.querySelectorAll(".edit-user").forEach(btn => {
          btn.addEventListener("click", () => openUserEditModal(btn.dataset.id));
        });
      });
  }

  function openUserEditModal(id) {
    const token = sessionStorage.getItem("userToken");
    fetch(`${api.online}/pessoa/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const u = data[0];
        document.getElementById("userId").value = u.id_pessoa;
        document.getElementById("userName").value = u.nome;
        document.getElementById("userEmail").value = u.email;
        document.getElementById("userPhone").value = u.telefone;
        document.getElementById("userStatus").value = u.situacao;
        document.getElementById("userType").value = u.id_tipo_usuario;
        document.getElementById("userManagementModal").classList.remove("hidden");

      });
  }

  document.getElementById("deleteUserBtn")?.addEventListener("click", async () => {
    const id = document.getElementById("userId").value;
    const token = sessionStorage.getItem("userToken");

    // Confirmação para evitar exclusões acidentais
    if (!confirm("Tem certeza que deseja deletar este usuário? Esta ação é irreversível.")) {
      return;
    }

    try {
      const response = await fetch(`${api.perfil}/pessoa/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao deletar usuário");
      }

      alert("Usuário deletado com sucesso!");
      document.getElementById("userManagementModal").classList.add("hidden");
      loadUsersList(); // Recarrega a lista de usuários
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      alert("Erro ao deletar usuário. Por favor, tente novamente.");
    }
  });

  document.getElementById("cancelUserEditBtn")?.addEventListener("click", () => {
    document.getElementById("userManagementModal").classList.add("hidden");
  });
  document.getElementById("close-modal")?.addEventListener("click", () => {
    document.getElementById("userManagementModal").classList.add("hidden");
  });



 document.getElementById("userManagementForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("userId").value;
    const userData = {
      situacao: document.getElementById("userStatus").value,

    };

    try {
      const response = await fetch(`${api.perfil}/admin/editar-usuario/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        let errorText = await response.text();
        let errorMessage;
        try {
          const json = JSON.parse(errorText);
          errorMessage = json.error || "Erro ao atualizar usuário";
        } catch {
          errorMessage = errorText || "Erro ao atualizar usuário";
        }
        throw new Error(errorMessage);
      }

      showSuccess('Usuário atualizado!', 'As informações do usuário foram salvas com sucesso');
      document.getElementById("userManagementModal").classList.add("hidden");
      loadUsersList();
    } catch (error) {
      showError('Erro ao salvar', error.message || 'Não foi possível atualizar o usuário');
      console.error("Detalhes do erro:", error);
    }
  });



  carregarDadosUsuario();
  document.querySelector(".nav-item.active")?.click(); // ativar seção inicial



  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
});

document.getElementById("savePersonalBtn").addEventListener("click", async () => {
  const nome = document.getElementById("editNome").value.trim();
  const telefone = document.getElementById("editTelefone").value.trim();
  const idPessoa = sessionStorage.getItem("id_pessoa");
  const token = sessionStorage.getItem("userToken");

  const loadingId = showLoading('Salvando...', 'Atualizando suas informações');

  try {
    console.log("Enviando dados para atualização:", { nome, telefone });
    const response = await fetch(`${api.perfil}/admin/atualizar/${idPessoa}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome: nome,
        telefone: telefone
      })
    });

    const responseData = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Erro na resposta:", response.status, responseData);
      throw new Error(responseData?.error || `Erro HTTP: ${response.status}`);
    }

    hideNotification(loadingId);
    showSuccess('Perfil atualizado! atualize a página', responseData.message);

  } catch (error) {
    hideNotification(loadingId);
    console.error("Erro completo:", error);
    showError('Erro ao salvar', error.message);
  }
});
// Função para atualizar imagem de perfil
async function atualizarImagemPerfil(imageData) {
  try {
    const idPessoa = sessionStorage.getItem("id_pessoa");
    const token = sessionStorage.getItem("userToken");
    console.log("Tamanho da base64 recebida:", imageData?.length);

    const response = await fetch(`${api.perfil}/pessoa/${idPessoa}/imagem`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ imagem_perfil: imageData }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error("Erro ao atualizar imagem: " + errText);
    }
  } catch (error) {
    console.error("Erro:", error);
    throw error;
  }
}



// Variável global para armazenar todos os pedidos
// Localize o botão do histórico de compras e a seção de conteúdo do histórico
const historicoBtn = document.querySelector('[data-section="purchase-history"]');
const historicoSection = document.getElementById('purchase-history-section');
const historicoContainer = document.getElementById('purchaseHistoryContent');

// Adicione um evento de clique ao botão do histórico
if (historicoBtn && historicoSection && historicoContainer) {
    historicoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // Lógica para mostrar/esconder as seções
        document.querySelectorAll('.main-content > div').forEach(section => {
            section.classList.add('hidden');
        });
        historicoSection.classList.remove('hidden');

        // Chame a função para carregar o histórico de compras
        carregarHistoricoComprasAdmin();
    });
}

// A função que carrega os pedidos de todos os usuários
async function carregarHistoricoComprasAdmin() {
    const loadingId = showLoading('Carregando Histórico...', 'Buscando todos os pedidos do sistema');
    // Limpa o conteúdo atual
    historicoContainer.innerHTML = '';

    try {
        const token = sessionStorage.getItem('userToken');
        if (!token) {
            throw new Error('Token de autenticação não encontrado.');
        }

        const response = await fetchWithFallback(
            `${api.perfil}/admin/historico-compras`,
            `${api.online}/admin/historico-compras`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error('Erro ao carregar o histórico de compras do administrador.');
        }

        const pedidos = await response.json();
        hideNotification(loadingId);

        if (pedidos.length === 0) {
            historicoContainer.innerHTML = '<p>Nenhum pedido encontrado no sistema.</p>';
            return;
        }

        pedidos.forEach(pedido => {
            const pedidoDiv = document.createElement('div');
            pedidoDiv.classList.add('pedido-card');

            let itensHtml = pedido.itens.map(item => `
                <div class="pedido-item">
                    <img src="${item.imagem_principal}" alt="${item.nome_produto}">
                    <div class="item-info">
                        <h4>${item.nome_produto}</h4>
                        <p>Quantidade: ${item.quantidade}</p>
                        <p>Preço Unitário: R$ ${item.preco.toFixed(2).replace('.', ',')}</p>
                    </div>
                </div>
            `).join('');

            const statusText = pedido.situacao === 'F' ? 'Finalizado' : 'Pendente';
            const statusClass = pedido.situacao === 'F' ? 'status-concluido' : 'status-pendente';

            pedidoDiv.innerHTML = `
                <div class="pedido-header">
                    <h3>Pedido #${pedido.id_carrinho}</h3>
                    <span class="status ${statusClass}">${statusText}</span>
                </div>
                <div class="pedido-info">
                    <p><strong>Usuário:</strong> ${pedido.nome_usuario}</p>
                    <p><strong>Data:</strong> ${pedido.data_criacao}</p>
                </div>
                <div class="pedido-itens">
                    ${itensHtml}
                </div>
            `;
            historicoContainer.appendChild(pedidoDiv);
        });

    } catch (error) {
        console.error('Erro ao carregar histórico de compras do administrador:', error);
        hideNotification(loadingId);
        showError('Erro', 'Não foi possível carregar o histórico de compras.');
    }

}

async function carregarPedidosAdm() {
  const token = sessionStorage.getItem("userToken");
  const pedidosContainer = document.getElementById("pedidos-admin");

  try {
    const response = await fetch(`${api.online}/pessoa/pedidos`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao buscar pedidos.");
    }

    const pedidos = await response.json();
    pedidosContainer.innerHTML = "";

    if (pedidos.length === 0) {
      pedidosContainer.innerHTML = "<p>Nenhum pedido encontrado.</p>";
      return;
    }

    pedidos.forEach(pedido => {
      const pedidoDiv = document.createElement("div");
      pedidoDiv.classList.add("pedido-admin-item");

      pedidoDiv.innerHTML = `
        <p><strong>ID:</strong> ${pedido.id_pedido}</p>
        <p><strong>Número:</strong> ${pedido.numero_pedido}</p>
        <p><strong>Cliente:</strong> ${pedido.nome_cliente}</p>
        <p><strong>Valor Total:</strong> R$ ${pedido.valor_total.toFixed(2)}</p>
        <p><strong>Data:</strong> ${new Date(pedido.data_hora).toLocaleString()}</p>
        <p><strong>Status:</strong> ${pedido.situacao}</p>
        <p><strong>Pagamento:</strong> ${pedido.pagamento_situacao}</p>
        <hr>
      `;

      pedidosContainer.appendChild(pedidoDiv);
    });

  } catch (error) {
    console.error("Erro ao carregar pedidos:", error);
    pedidosContainer.innerHTML = "<p>Erro ao carregar pedidos.</p>";
  }
}



// Logout
function logout() {
  try {
    // Limpar apenas os itens específicos do sessionStorage
    const itemsToRemove = [
      "userToken",
      "id_pessoa",
      "userEmail",
      "userType",
      "usuario",
      "loginTime",
      "isAdmin"
    ];

    itemsToRemove.forEach((item) => sessionStorage.removeItem(item));
    // REMOVIDA A LINHA ABAIXO: sessionStorage.clear();
    window.location.href = `${basePath}/login.html`;

    console.log("SessionStorage limpo com sucesso.");
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    showError('Erro ao sair', 'Erro ao fazer logout. Tente novamente.');
  }
}

