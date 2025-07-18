// Dados do usuário
let usuarioLogado = null;
// URL da API
const api = {
  online: "https://green-line-web.onrender.com",
  perfil: "http://localhost:3008",
  index: "http://localhost:3002",
};
const basePath = window.location.pathname.includes("green_line_web")
          ? "/green_line_web/public"
          : "/public";

// Função para carregar dados do usuário
// Função para carregar dados do usuário - VERSÃO CORRIGIDA
async function carregarDadosUsuario() {
  try {
    // 1. Verificar se o usuário está autenticado
    const token = sessionStorage.getItem("userToken");
    const idPessoa = sessionStorage.getItem("id_pessoa"); // Ou 'id_pessoa' dependendo do que você usa

    if (!token || !idPessoa) {
      console.error("Usuário não autenticado - redirecionando para login");
      window.location.href = `${basePath}/login.html`;
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
        logout();
        return;
      }
      throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
    }

    // 4. Processar os dados do usuário
    const usuarioLogado = await response.json();
    console.log("Dados do usuário carregados:", usuarioLogado);
    preencherDadosPerfil(usuarioLogado);
    await loadAddress();

    // Carregar configurações do modo noturno (se houver)
    const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', darkModeEnabled);
    document.getElementById('darkModeToggle').checked = darkModeEnabled;

  } catch (error) {
    console.error("Erro ao carregar dados do usuário:", error);
    alert("Erro ao carregar dados do usuário. Por favor, tente novamente.");
    logout(); // Considerar deslogar em caso de erro grave na carga de dados
  }
}

/* --- NOVA FUNÇÃO: carrega endereço independente dos dados do usuário --- */
async function loadAddress() {
  const idPessoa = sessionStorage.getItem("id_pessoa");
  const token = sessionStorage.getItem("userToken");
  if (!idPessoa || !token) return;

  try {
    const resp = await fetch(`http://localhost:3008/pessoa/${idPessoa}/enderecos`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
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


// Função para preencher os dados do perfil na página
function preencherDadosPerfil(usuario) {
  document.getElementById("profileName").textContent = usuario[0].nome || "Nome do Usuário";
  document.getElementById("profileEmail").textContent = usuario[0].email || "email@exemplo.com";
  document.getElementById("profileEmailContent").textContent = usuario[0].email || "email@exemplo.com"; // Email na seção de informações pessoais
  document.getElementById("profileFullName").textContent = usuario[0].nome || "Nome Completo";
  document.getElementById("profilePhone").textContent = usuario[0].telefone || "Não informado";
  document.getElementById("profileCpf").textContent = usuario[0].cpf || "Não informado";
  document.getElementById("profileStatus").textContent = usuario[0].situacao === 'A' ? 'Ativo' : 'Pendente/Inativo';

  if (usuario.imagem_perfil) {
    document.getElementById("profileAvatar").src = usuario[0].imagem_perfil;
  }
}

// Função para preencher os dados de endereço
function preencherEndereco(endereco) {

   if (Array.isArray(endereco)) endereco = endereco[0];
  const addressContent = document.getElementById("addressContent");
  addressContent.innerHTML = `
        <p>${endereco.endereco},${endereco.complemento ? ' - ' + endereco.complemento : ''}</p>
        <p>${endereco.cidade} - ${endereco.uf}, ${endereco.cep}</p>
        <p>${endereco.bairro || ''}</p>
    `;

  // Pré‑preencher modal
  document.getElementById("cep").value = endereco.cep || "";
  document.getElementById("endereco").value = endereco.endereco || "";
  document.getElementById("complemento").value = endereco.complemento || "";
  document.getElementById("cidade").value = endereco.cidade || "";
  document.getElementById("uf").value = endereco.uf || "";
  document.getElementById("bairro").value = endereco.bairro || "";


  // Guarde o id_endereco para PUT depois
  addressForm.dataset.idEndereco = endereco.id_endereco;
}

// Funções para mostrar/esconder seções
function showSection(sectionId) {
  // Esconder todas as seções
  document.querySelectorAll(".main-content > div").forEach((section) => {
    section.classList.add("hidden");
  });
  // Remover a classe 'active' de todos os itens de navegação
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });

  // Mostrar a seção desejada
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.remove("hidden");
    // Adicionar a classe 'active' ao item de navegação correspondente
    const navItem = document.querySelector(`.nav-item[data-section="${sectionId.replace('-section', '')}"]`);
    if (navItem) {
      navItem.classList.add("active");
    }
  }
}

// Event Listeners para navegação
document.addEventListener("DOMContentLoaded", () => {
  carregarDadosUsuario(); // Carrega os dados do usuário ao carregar a página

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", function () {
      const section = this.dataset.section;
      // Handle direct link for 'Meu Carrinho' separately
      if (section === 'carrinho') {
        // The HTML already handles the redirect, no need for JS showSection
        return;
      }
      // Map data-section to actual div IDs
      let targetSectionId;
      if (section === 'personal') {
          targetSectionId = 'personal-section';
      } else if (section === 'purchase-history') { // Updated from 'saved'
          targetSectionId = 'saved-section'; // HTML ID for purchase history
      } else if (section === 'gears') {
          targetSectionId = 'gears-section';
      }

      if (targetSectionId) {
          showSection(targetSectionId);
      }
    });
  });

  // Mostrar a seção "Informações Pessoais" por padrão
  showSection("personal-section");

  // Lógica para o modo noturno
  const darkModeToggle = document.getElementById('darkModeToggle');
  darkModeToggle.addEventListener('change', () => {
      if (darkModeToggle.checked) {
          document.body.classList.add('dark-mode');
          localStorage.setItem('darkMode', 'true');
      } else {
          document.body.classList.remove('dark-mode');
          localStorage.setItem('darkMode', 'false');
      }
  });

  // Lógica para editar campos de texto (Nome Completo e Telefone)
  document.querySelectorAll(".info-value.editable").forEach((element) => {
    element.addEventListener("click", function () {
      const currentValue = this.textContent;
      const input = document.createElement("input");
      input.type = "text";
      input.value = currentValue;
      input.classList.add("edit-input"); // Adicione uma classe para estilização

      this.replaceWith(input);
      input.focus();

      input.addEventListener("blur", async () => {
        const newValue = input.value.trim();
        const infoItem = document.createElement("div");
        infoItem.classList.add("info-value", "editable");
        infoItem.id = this.id; // Restaurar o ID original
        infoItem.textContent = newValue || currentValue; // Usar valor antigo se novo estiver vazio

        input.replaceWith(infoItem);
        // Re-adicionar o event listener
        infoItem.addEventListener("click", arguments.callee);

        // Atualizar dados no usuárioLogado (não salva no backend aqui, apenas prepara para o botão Salvar)
        if (infoItem.id === "profileFullName") {
          usuarioLogado.nome = newValue;
        } else if (infoItem.id === "profilePhone") {
          usuarioLogado.telefone = newValue;
        }
      });

      input.addEventListener("keypress", function(e) {
        if (e.key === 'Enter') {
          input.blur(); // Simula o blur para salvar
        }
      });
    });
  });

  // Botão Salvar Alterações para Informações Pessoais
  document.getElementById("savePersonalBtn").addEventListener("click", async () => {
    try {
      const token = sessionStorage.getItem("userToken");
      const idPessoa = sessionStorage.getItem("id_pessoa");

      const response = await fetch(`${api.online}/pessoa/${idPessoa}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: usuarioLogado.nome,
          telefone: usuarioLogado.telefone,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar informações pessoais");
      }

      alert("Informações pessoais salvas com sucesso!");
      carregarDadosUsuario(); // Recarrega para garantir que os dados exibidos estão atualizados
    } catch (error) {
      console.error("Erro ao salvar informações pessoais:", error);
      alert("Erro ao salvar informações pessoais. Por favor, tente novamente.");
    }
  });


  // Lógica para o modal de endereço
  const addressModal = document.getElementById("addressModal");
  const updateAddressBtn = document.getElementById("updateAddressBtn");
  const closeAddressModal = addressModal.querySelector(".close-modal");
  const cancelAddressBtn = document.getElementById("cancelAddressBtn");
  const addressForm = document.getElementById("addressForm");
  loadAddress();

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
    const response = await fetch(`http://localhost:3008/pessoa/${idPessoa}/enderecos`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const erro = await response.json();
      throw new Error(erro.error || "Erro ao atualizar endereço");
    }

    alert("Endereço salvo com sucesso!");
    document.getElementById("addressModal").classList.add("hidden");
    loadAddress(); // recarrega os dados na interface
  } catch (err) {
    console.error("Erro ao atualizar endereço:", err);
    alert("Erro ao atualizar endereço: " + err.message);
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
    try {
      const token = sessionStorage.getItem("userToken");
      const idPessoa = sessionStorage.getItem("id_pessoa");

      const response = await fetch(`${api.online}/pessoa/${idPessoa}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erro ao deletar conta");
      }

      alert("Conta deletada com sucesso!");
      logout(); // Desloga o usuário após a exclusão da conta
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      alert("Erro ao deletar conta. Por favor, tente novamente.");
    }
  });


  // Lógica para upload de imagem de perfil
  const avatarInput = document.getElementById('avatarInput');
  avatarInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // A imagem será salva como base64 no banco de dados.
          // Em um ambiente de produção, é melhor fazer upload para um serviço de armazenamento de arquivos.
          await atualizarImagemPerfil(e.target.result);
          document.getElementById('profileAvatar').src = e.target.result;
          alert('Imagem de perfil atualizada com sucesso!');
        } catch (error) {
          console.error("Erro ao atualizar imagem de perfil:", error);
          alert("Erro ao atualizar imagem de perfil.");
        }
      };
      reader.readAsDataURL(file);
    }
  });

});

// Função para atualizar imagem de perfil
async function atualizarImagemPerfil(imageData) {
  try {
    const idPessoa = sessionStorage.getItem("id_pessoa");
    const response = await fetch(`${api.online}/pessoa/${idPessoa}/imagem`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imagem_perfil: imageData }),
    });

    if (!response.ok) {
      throw new Error("Erro ao atualizar imagem");
    }
  } catch (error) {
    console.error("Erro:", error);
    throw error;
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
    ];

    itemsToRemove.forEach((item) => sessionStorage.removeItem(item));
    // REMOVIDA A LINHA ABAIXO: sessionStorage.clear();
    window.location.href = `${basePath}/login.html`; 

    console.log("SessionStorage limpo com sucesso.");
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    alert("Erro ao fazer logout.");
  }
}