import { showSuccess, showError, showWarning, showInfo, showValidationError, showLoading, hideNotification } from './notifications.js';

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
  const loadingId = showLoading(
    "Carregando perfil...",
    "Buscando suas informações"
  );

  try {
    // 1. Verificar se o usuário está autenticado
    const token = sessionStorage.getItem("userToken");
    const idPessoa = sessionStorage.getItem("id_pessoa"); // Ou 'id_pessoa' dependendo do que você usa

    if (!token || !idPessoa) {
      console.error("Usuário não autenticado - redirecionando para login");
      hideNotification(loadingId);
      showError(
        "Acesso negado",
        "Você precisa fazer login para acessar esta página"
      );
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
        showError(
          "Sessão expirada",
          "Sua sessão expirou. Faça login novamente"
        );
        setTimeout(() => {
          logout();
        }, 2000);
        return;
      }
      throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
    }

    // 4. Processar os dados do usuário
    usuarioLogado = await response.json();
    console.log("Dados do usuário carregados:", usuarioLogado);
    preencherDadosPerfil(usuarioLogado);
    await loadAddress();

    // Carregar configurações do modo noturno (se houver)
    const darkModeEnabled = localStorage.getItem("darkMode") === "true";
    document.body.classList.toggle("dark-mode", darkModeEnabled);
    document.getElementById("darkModeToggle").checked = darkModeEnabled;

    hideNotification(loadingId);
    showSuccess(
      "Perfil carregado!",
      "Suas informações foram carregadas com sucesso",
      { duration: 3000 }
    );
  } catch (error) {
    console.error("Erro ao carregar dados do usuário:", error);
    hideNotification(loadingId);
    showError(
      "Erro ao carregar perfil",
      "Não foi possível carregar suas informações. Tente novamente."
    );
  }
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
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (localError) {
      console.log("Servidor local não disponível, tentando servidor online...");
      resp = await fetch(`${api.online}/pessoa/${idPessoa}/enderecos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    if (!resp.ok) throw new Error("Falha no GET de endereço");
    const endereco = await resp.json(); // backend devolve objeto
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
  document.getElementById("profileName").textContent =
    usuario[0].nome || "Nome do Usuário";
  document.getElementById("profileEmail").textContent =
    usuario[0].email || "email@exemplo.com";
  document.getElementById("profileEmailContent").textContent =
    usuario[0].email || "email@exemplo.com"; // Email na seção de informações pessoais
  document.getElementById("profileFullName").textContent =
    usuario[0].nome || "Nome Completo";
  document.getElementById("profilePhone").textContent =
    usuario[0].telefone || "Não informado";
  document.getElementById("profileCpf").textContent =
    usuario[0].cpf || "Não informado";
  document.getElementById("profileStatus").textContent =
    usuario[0].situacao === "A" ? "Ativo" : "Pendente/Inativo";

  if (usuario.imagem_perfil) {
    document.getElementById("profileAvatar").src = usuario[0].imagem_perfil;
  }
}

// Função para preencher os dados de endereço
function preencherEndereco(endereco) {
  if (Array.isArray(endereco)) endereco = endereco[0];
  // Salva o endereço no sessionStorage para uso em outras páginas
  sessionStorage.setItem("enderecoUsuario", JSON.stringify(endereco));
  const addressContent = document.getElementById("addressContent");
  addressContent.innerHTML = `
        <p>${endereco.endereco},${
    endereco.complemento ? " - " + endereco.complemento : ""
  }</p>
        <p>${endereco.cidade} - ${endereco.uf}, ${endereco.cep}</p>
        <p>${endereco.bairro || ""}</p>
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
    const navItem = document.querySelector(
      `.nav-item[data-section="${sectionId.replace("-section", "")}"]`
    );
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
      if (section === "carrinho") {
        // The HTML already handles the redirect, no need for JS showSection
        return;
      }
      // Map data-section to actual div IDs
      let targetSectionId;
      if (section === "personal") {
        targetSectionId = "personal-section";
      } else if (section === "purchase-history") {
        // Updated from 'saved'
        targetSectionId = "saved-section"; // HTML ID for purchase history
      } else if (section === "gears") {
        targetSectionId = "gears-section";
      }

      if (targetSectionId) {
        showSection(targetSectionId);
      }
    });
  });

  // Mostrar a seção "Informações Pessoais" por padrão
  showSection("personal-section");

  // Lógica para o modo noturno
  const darkModeToggle = document.getElementById("darkModeToggle");
  darkModeToggle.addEventListener("change", () => {
    if (darkModeToggle.checked) {
      document.body.classList.add("dark-mode");
      localStorage.setItem("darkMode", "true");
    } else {
      document.body.classList.remove("dark-mode");
      localStorage.setItem("darkMode", "false");
    }

  });

// Lógica para editar campos de texto (Nome Completo e Telefone)
document.querySelectorAll(".info-value.editable").forEach((element) => {
    // Crie uma função nomeada para o event listener
    const handleEditClick = function () {
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
            // Re-adicionar o event listener usando a função nomeada
            infoItem.addEventListener("click", handleEditClick);

            // Atualizar dados no usuárioLogado (não salva no backend aqui, apenas prepara para o botão Salvar)
            if (infoItem.id === "profileFullName") {
                usuarioLogado.nome = newValue;
                console.log("Nome atualizado:", usuarioLogado.nome);
            } else if (infoItem.id === "profilePhone") {
                usuarioLogado.telefone = newValue;
                console.log("Telefone atualizado:", usuarioLogado.telefone);
            }
        });

        input.addEventListener("keypress", function (e) {
            if (e.key === 'Enter') {
                input.blur(); // Simula o blur para salvar
            }
        });
    };

    // Adiciona o event listener usando a função nomeada
    element.addEventListener("click", handleEditClick);
});

  // Botão Salvar Alterações para Informações Pessoais
  document.getElementById("savePersonalBtn").addEventListener("click", async () => {
    try {
        const token = sessionStorage.getItem("userToken");
        const idPessoa = sessionStorage.getItem("id_pessoa");

        // Captura os valores mais recentes dos elementos HTML
        const nomeAtualizado = document.getElementById("profileFullName").textContent.trim();
        const telefoneAtualizado = document.getElementById("profilePhone").textContent.trim();

        // Faz a requisição PUT com os dados capturados da tela
        const response = await fetch(`${api.online}/pessoa/${idPessoa}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
           body: JSON.stringify({
              // Captura o texto atual dos elementos de nome e telefone
              nome: document.getElementById("profileFullName").textContent,
              telefone: document.getElementById("profilePhone").textContent,
            }),
        });
         carregarDadosUsuario();
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

  document
    .getElementById("addressForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const loadingId = showLoading(
        "Salvando endereço...",
        "Atualizando suas informações de entrega"
      );

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
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });
        } catch (localError) {
          console.log(
            "Servidor local não disponível, tentando servidor online..."
          );
          response = await fetch(`${api.online}/pessoa/${idPessoa}/enderecos`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });
        }

        if (!response.ok) {
          const erro = await response.json();
          throw new Error(erro.error || "Erro ao atualizar endereço");
        }

        hideNotification(loadingId);
        showSuccess(
          "Endereço salvo!",
          "Seu endereço foi atualizado com sucesso"
        );

        // Salva o endereço no sessionStorage para uso em outras páginas
        sessionStorage.setItem("enderecoUsuario", JSON.stringify(body));
        document.getElementById("addressModal").classList.add("hidden");
        loadAddress(); // recarrega os dados na interface
      } catch (err) {
        console.error("Erro ao atualizar endereço:", err);
        hideNotification(loadingId);
        showError(
          "Erro ao salvar endereço",
          err.message || "Não foi possível atualizar seu endereço"
        );
      }
    });

  // Integração com ViaCEP para preenchimento automático de endereço
  function buscarEnderecoPorCep(cep) {
    // Remove caracteres não numéricos
    cep = cep.replace(/\D/g, "");
    if (cep.length !== 8) return;

    const loadingId = showLoading(
      "Buscando CEP...",
      "Consultando dados do endereço"
    );

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then((res) => res.json())
      .then((data) => {
        hideNotification(loadingId);
        if (data.erro) {
          showError(
            "CEP não encontrado",
            "Verifique se o CEP digitado está correto"
          );
          return;
        }
        document.getElementById("endereco").value = data.logradouro || "";
        document.getElementById("bairro").value = data.bairro || "";
        document.getElementById("cidade").value = data.localidade || "";
        document.getElementById("uf").value = data.uf || "";
        showSuccess("CEP encontrado!", "Endereço preenchido automaticamente", {
          duration: 3000,
        });
      })
      .catch(() => {
        hideNotification(loadingId);
        showError(
          "Erro ao buscar CEP",
          "Não foi possível consultar o CEP. Tente novamente."
        );
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
    const loadingId = showLoading(
      "Excluindo conta...",
      "Processando exclusão da sua conta"
    );

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

      hideNotification(loadingId);
      showSuccess(
        "Conta excluída!",
        "Sua conta foi excluída com sucesso. Você será redirecionado."
      );

      setTimeout(() => {
        logout(); // Desloga o usuário após a exclusão da conta
      }, 2000);
    } catch (error) {
      console.error("Erro ao deletar conta:", error);
      hideNotification(loadingId);
      showError(
        "Erro ao excluir conta",
        "Não foi possível excluir sua conta. Tente novamente."
      );
    }
  });

  // Lógica para upload de imagem de perfil
  const avatarInput = document.getElementById("avatarInput");
  avatarInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError("Arquivo muito grande", "A imagem deve ter no máximo 5MB");
        return;
      }

      // Validar tipo do arquivo
      if (!file.type.startsWith("image/")) {
        showError(
          "Formato inválido",
          "Por favor, selecione apenas arquivos de imagem"
        );
        return;
      }

      const loadingId = showLoading(
        "Atualizando foto...",
        "Fazendo upload da sua nova imagem de perfil"
      );

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          // A imagem será salva como base64 no banco de dados.
          // Em um ambiente de produção, é melhor fazer upload para um serviço de armazenamento de arquivos.
          await atualizarImagemPerfil(e.target.result);
          document.getElementById("profileAvatar").src = e.target.result;
          hideNotification(loadingId);
          showSuccess(
            "Foto atualizada!",
            "Sua imagem de perfil foi atualizada com sucesso"
          );
        } catch (error) {
          console.error("Erro ao atualizar imagem de perfil:", error);
          hideNotification(loadingId);
          showError(
            "Erro ao atualizar foto",
            "Não foi possível atualizar sua imagem de perfil"
          );
        }
      };
      reader.readAsDataURL(file);
    }
  });

  // Função para buscar e exibir pedidos feitos na seção de histórico de compras
  async function carregarPedidosUsuario() {
    const idPessoa = sessionStorage.getItem("id_pessoa");
    if (!idPessoa) return;

    const container = document.getElementById("savedProductsContent");
    const loadingId = showLoading(
      "Carregando histórico...",
      "Buscando seus pedidos anteriores"
    );

    container.innerHTML =
      '<div class="text-center"><p>Carregando pedidos...</p></div>';

    try {
      const resp = await fetch(
        `https://green-line-web.onrender.com/pessoa/${idPessoa}/pedidos`
      );

      hideNotification(loadingId);

      if (!resp.ok) {
        container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
        showInfo("Histórico vazio", "Você ainda não fez nenhum pedido", {
          duration: 3000,
        });
        return;
      }

      const pedidos = await resp.json();

      if (!Array.isArray(pedidos) || pedidos.length === 0) {
        container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
        showInfo("Histórico vazio", "Você ainda não fez nenhum pedido", {
          duration: 3000,
        });
        return;
      }

      let html = "";
      pedidos.forEach((pedido) => {
        html += `<div class="pedido-card">
          <h4>Pedido: <span class="text-success">${
            pedido.numero_pedido || pedido.numeroPedido || pedido.id_pedido
          }</span></h4>
          <p><strong>Data:</strong> ${
            pedido.data_hora
              ? new Date(pedido.data_hora).toLocaleString("pt-BR")
              : pedido.dataConfirmacao || ""
          }</p>
          <p><strong>Status:</strong> ${pedido.situacao || "Confirmado"}</p>
          <p><strong>Total:</strong> R$ ${(
            pedido.valor_total ||
            pedido.total ||
            0
          ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
        </div>`;
      });

      container.innerHTML = html;
      showSuccess(
        "Histórico carregado!",
        `${pedidos.length} pedido(s) encontrado(s)`,
        { duration: 3000 }
      );
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
      hideNotification(loadingId);
      container.innerHTML = "<p>Erro ao carregar pedidos.</p>";
      showError(
        "Erro ao carregar histórico",
        "Não foi possível carregar seus pedidos. Tente novamente."
      );
    }
  }

  // Carregar pedidos ao abrir a seção de histórico de compras
  const navPurchaseHistory = document.querySelector(
    '.nav-item[data-section="purchase-history"]'
  );
  if (navPurchaseHistory) {
    navPurchaseHistory.addEventListener("click", carregarPedidosUsuario);
  }

   const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", logout);
    }
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
