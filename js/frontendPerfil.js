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
    const userType = sessionStorage.getItem('id_tipo_usuario');
    console.log(userType);

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
        }, 4000);
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
      "<p>Endereço não encontrado ou não cadastrado.</p>";
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


  document.getElementById("profileAvatar").src = usuario[0].imagem_perfil;

  const avatar = document.getElementById("profileAvatar");
  sessionStorage.setItem("avatar", avatar.src);



  // Alterar para inputs editáveis
  document.getElementById("profileFullName").innerHTML = `
        <input type="text" id="editNome" value="${usuario[0].nome || ''}" class="editable-input">
    `;

  document.getElementById("profilePhone").innerHTML = `
        <input type="text" id="editTelefone" value="${usuario[0].telefone || ''}" class="editable-input">
    `;

}

// Função para preencher os dados de endereço
function preencherEndereco(endereco) {
  if (Array.isArray(endereco)) endereco = endereco[0];

  // Verificação: se não houver campo "endereco", não monta a interface
  if (!endereco || !endereco.endereco) {
    document.getElementById("addressContent").innerHTML =
      "<p>Nenhum endereço cadastrado.</p>";
    return;
  }

  sessionStorage.setItem("enderecoUsuario", JSON.stringify(endereco));

  const addressContent = document.getElementById("addressContent");
  addressContent.innerHTML = `
    <p>${endereco.endereco}${endereco.complemento ? " - " + endereco.complemento : ""}</p>
    <p>${endereco.cidade || ""} - ${endereco.uf || ""}${endereco.cep ? ", " + endereco.cep : ""}</p>
    <p>${endereco.bairro || ""}</p>
  `;

  // Pré-preencher o formulário
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  setVal("cep", endereco.cep);
  setVal("endereco", endereco.endereco);
  setVal("complemento", endereco.complemento);
  setVal("cidade", endereco.cidade);
  setVal("uf", endereco.uf);
  setVal("bairro", endereco.bairro);

  const addressForm = document.getElementById("addressForm");
  if (addressForm) {
    addressForm.dataset.idEndereco = endereco.id_endereco;
  }
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
    const loadingId = showLoading('Excluindo conta...', 'Processando exclusão da sua conta');

    try {
      const idPessoa = sessionStorage.getItem("id_pessoa");
      const token = sessionStorage.getItem("userToken");

      const response = await fetch(`${api.online}/admin/editar-usuario/${idPessoa}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ situacao: 'I' }),
      });


      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) {
          alert(errorData.error);  // <- Mostra motivo do bloqueio de exclusão
        } else {
          throw new Error(errorData.error || "Exclusão não permitida");
        }
        return;
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


  // Event listener
  // Configura os filtros
  configurarFiltros();

  // Quando clicar no histórico de compras
  document.querySelector('[data-section="purchase-history"]').addEventListener('click', async (e) => {
    e.preventDefault();
    document.querySelectorAll('.main-content > div').forEach(sec => sec.classList.add('hidden'));
    document.getElementById('saved-section').classList.remove('hidden');

    // Mostrar loading enquanto carrega
    const container = document.getElementById('savedProductsContent');
    container.innerHTML = '<div class="loading-placeholder"><p>Carregando histórico de compras...</p></div>';
    console.log("ativo");

    await loadUserPedidos();
  });
  function configurarFiltros() {
    document.getElementById('searchPurchases').addEventListener('input', aplicarFiltros);
    document.getElementById('statusFilter').addEventListener('change', aplicarFiltros);
    document.getElementById('periodFilter').addEventListener('change', aplicarFiltros);
    document.getElementById('refreshPurchases').addEventListener('click', () => {
      document.getElementById('searchPurchases').value = '';
      document.getElementById('statusFilter').value = '';
      document.getElementById('periodFilter').value = '';
      aplicarFiltros();
    });
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

});

// Variável global para armazenar todos os pedidos
// Variável global para armazenar todos os pedidos
let todosPedidos = [];

async function loadUserPedidos() {
  const token = sessionStorage.getItem('userToken');
  const idPessoa = sessionStorage.getItem('id_pessoa');

  if (!token || !idPessoa) {
    showError("Acesso negado", "Faça login para ver seu histórico.");
    return;
  }

  let loadingId;
  try {
    loadingId = showLoading("Carregando pedidos...", "Buscando seu histórico de compras");

    console.log(`Fazendo requisição para: ${api.online}/pessoa/${idPessoa}/pedidos`);
    const response = await fetch(`${api.online}/pessoa/${idPessoa}/pedidos`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Resposta recebida:', response);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Erro ${response.status}`);
    }

    const data = await response.json();
    console.log('Dados recebidos:', data);

    // Armazena todos os pedidos para filtragem
    todosPedidos = data; // Já vem no formato correto da API

    // Aplica os filtros iniciais
    aplicarFiltros();

  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    document.getElementById('savedProductsContent').innerHTML =
      `<div class="error-message">
        <p style="margin-bottom:20px">${err.message || 'Erro ao carregar histórico de compras'}</p>
        <a href="${basePath}/produtos.html" class="btn btn-primary">Ir para a loja</a>
      </div>`;
  } finally {
    if (loadingId) hideNotification(loadingId);
  }
}

function aplicarFiltros() {
  const termoBusca = document.getElementById('searchPurchases').value.toLowerCase();
  const statusFiltro = document.getElementById('statusFilter').value;
  const periodoFiltro = document.getElementById('periodFilter').value;

  // Filtra os pedidos
  let pedidosFiltrados = todosPedidos.filter(pedido => {
    // Filtro por termo de busca
    const matchTermo = termoBusca === '' ||
      (pedido.numero_pedido && pedido.numero_pedido.toLowerCase().includes(termoBusca)) ||
      (pedido.produtos && pedido.produtos.some(p =>
        p.nome_produto && p.nome_produto.toLowerCase().includes(termoBusca)));

    // Filtro por status
    const matchStatus = statusFiltro === '' ||
      (pedido.situacao && pedido.situacao.toLowerCase() === statusFiltro.toLowerCase());

    // Filtro por período
    let matchPeriodo = true;
    if (periodoFiltro !== '' && pedido.data_hora) {
      const dias = parseInt(periodoFiltro);
      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - dias);
      const dataPedido = new Date(pedido.data_hora);

      matchPeriodo = dataPedido >= dataLimite;
    }

    return matchTermo && matchStatus && matchPeriodo;
  });

  // Atualiza as estatísticas
  atualizarEstatisticas(pedidosFiltrados);

  // Exibe os pedidos filtrados
  displayPedidos(pedidosFiltrados);
}

function atualizarEstatisticas(pedidos) {
  const totalPedidos = pedidos.length;
  const totalGasto = pedidos.reduce((sum, pedido) => sum + (pedido.valor_total || 0), 0);
  const ticketMedio = totalPedidos > 0 ? totalGasto / totalPedidos : 0;
  const ultimaCompra = pedidos.length > 0 && pedidos[0].data_hora
    ? new Date(pedidos[0].data_hora).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    : '-';

  document.getElementById('totalPurchases').textContent = totalPedidos;
  document.getElementById('totalSpent').textContent = formatCurrency(totalGasto);
  document.getElementById('averageOrder').textContent = formatCurrency(ticketMedio);
  document.getElementById('lastPurchase').textContent = ultimaCompra;
}

function displayPedidos(pedidos) {
  const container = document.getElementById('savedProductsContent');
  container.innerHTML = '';

  if (!pedidos || pedidos.length === 0) {
    container.innerHTML = `
      <div class="no-orders">
        <p style="margin-top: 20px";>Nenhum pedido encontrado.</p>
        <a href="${basePath}/produtos.html" class="btn btn-primary">Ir para a loja</a>
      </div>
    `;
    return;
  }

  // Ordena por data (mais recente primeiro)
  pedidos.sort((a, b) => {
    const dateA = a.data_hora ? new Date(a.data_hora) : 0;
    const dateB = b.data_hora ? new Date(b.data_hora) : 0;
    return dateB - dateA;
  });

  // Cria os cards para cada pedido
  pedidos.forEach(pedido => {
    const card = document.createElement('div');
    card.className = 'purchase-card';

    // Formata os dados do pedido
    const numeroPedido = pedido.numero_pedido || 'N/A';
    const dataPedido = pedido.data_hora
      ? new Date(pedido.data_hora).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      : 'Não informada';
    const situacao = getStatusDisplay(pedido.situacao || 'Não informada');
    const pagamento = pedido.pagamento_situacao || 'Não informado';
    const valorTotal = formatCurrency(pedido.valor_total || 0);

    // Renderizar produtos do pedido
    const produtosHtml = pedido.produtos && pedido.produtos.length > 0
      ? pedido.produtos.map(produto => `
          <div class="produto-item">
            <div class="produto-info">
              <img src="${produto.imagem_1 || '../img/imagem-nao-disponivel.png'}" 
                   alt="${produto.nome_produto}" class="produto-thumb" 
                   onerror="this.src='../img/imagem-nao-disponivel.png'">
              <div class="produto-detalhes">
                <h4>${produto.nome_produto || 'Produto sem nome'}</h4>
                <p>Quantidade: ${produto.quantidade || 1}</p>
                <p>Preço unitário: ${formatCurrency(produto.preco_unitario || 0)}</p>
                <p>Subtotal: ${formatCurrency((produto.quantidade || 1) * (produto.preco_unitario || 0))}</p>
              </div>
            </div>
            <div class="produto-acoes">
              <button class="btn-avaliar" onclick="abrirModalAvaliacao('${produto.id_produto}', '${produto.nome_produto}', '${numeroPedido}')">
                <i class="fas fa-star"></i> Avaliar
              </button>
            </div>
          </div>
        `).join('')
      : '<p class="no-products">Produtos não disponíveis</p>';

    card.innerHTML = `
      <div class="purchase-header">
        <h3>Pedido #${numeroPedido}</h3>
        <span class="status-badge ${getStatusClass(situacao)}">${situacao}</span>
      </div>
      <div class="purchase-details">
        <p><strong>Data:</strong> ${dataPedido}</p>
        <p><strong>Pagamento:</strong> ${pagamento}</p>
        <p class="purchase-total"><strong>Total:</strong> ${valorTotal}</p>
      </div>
      <div class="purchase-products">
        <h4>Produtos:</h4>
        ${produtosHtml}
      </div>
    `;

    container.appendChild(card);
  });
}

// Funções auxiliares
function getStatusDisplay(status) {
  const statusMap = {
    'P': 'Pendente',
    'C': 'Confirmado',
    'E': 'Enviado',
    'D': 'Entregue',
    'X': 'Cancelado'
  };
  return statusMap[status] || status;
}

function getStatusClass(status) {
  const statusMap = {
    'Pendente': 'status-pending',
    'Confirmado': 'status-confirmed',
    'Enviado': 'status-shipped',
    'Entregue': 'status-delivered',
    'Cancelado': 'status-cancelled'
  };
  return statusMap[status] || 'status-default';
}

function formatCurrency(value) {
  const numericValue = parseFloat(value || 0);
  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}


document.getElementById("savePersonalBtn").addEventListener("click", async () => {
  const nome = document.getElementById("editNome").value.trim();
  const telefone = document.getElementById("editTelefone").value.trim();
  const idPessoa = sessionStorage.getItem("id_pessoa");
  const token = sessionStorage.getItem("userToken");

  const loadingId = showLoading('Salvando...', 'Atualizando suas informações');

  try {
    console.log("Enviando dados para atualização:", { nome, telefone });
    const response = await fetch(`${api.online}/admin/atualizar/${idPessoa}`, {
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

    const response = await fetch(`${api.online}/pessoa/${idPessoa}/imagem`, {
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

// ==================== SISTEMA DE AVALIAÇÃO ====================

let avaliacaoAtual = {
  idProduto: null,
  nomeProduto: '',
  numeroPedido: '',
  nota: 0
};

// Função para abrir o modal de avaliação
function abrirModalAvaliacao(idProduto, nomeProduto, numeroPedido) {
  avaliacaoAtual = {
    idProduto: idProduto,
    nomeProduto: nomeProduto,
    numeroPedido: numeroPedido,
    nota: 0
  };

  // Preencher informações do produto
  document.getElementById('avaliacaoProdutoNome').textContent = nomeProduto;
  document.getElementById('avaliacaoPedidoNumero').textContent = `Pedido: ${numeroPedido}`;

  // Resetar formulário
  document.getElementById('notaAvaliacao').value = '';
  document.getElementById('comentarioAvaliacao').value = '';
  resetarEstrelas();

  // Mostrar modal
  document.getElementById('avaliacaoModal').classList.remove('hidden');
}

// Função para fechar o modal de avaliação
function fecharModalAvaliacao() {
  document.getElementById('avaliacaoModal').classList.add('hidden');
  avaliacaoAtual = { idProduto: null, nomeProduto: '', numeroPedido: '', nota: 0 };
}

// Função para resetar as estrelas
function resetarEstrelas() {
  const stars = document.querySelectorAll('.star');
  stars.forEach(star => {
    star.classList.remove('active', 'hover');
  });
}

// Função para definir a avaliação por estrelas
function definirAvaliacao(nota) {
  avaliacaoAtual.nota = nota;
  document.getElementById('notaAvaliacao').value = nota;

  const stars = document.querySelectorAll('.star');
  stars.forEach((star, index) => {
    if (index < nota) {
      star.classList.add('active');
      star.classList.remove('hover');
    } else {
      star.classList.remove('active', 'hover');
    }
  });
}

// Event listeners para as estrelas
document.addEventListener('DOMContentLoaded', function () {
  const stars = document.querySelectorAll('.star');

  stars.forEach((star, index) => {
    // Hover effect
    star.addEventListener('mouseenter', function () {
      stars.forEach((s, i) => {
        if (i <= index) {
          s.classList.add('hover');
        } else {
          s.classList.remove('hover');
        }
      });
    });

    // Click para selecionar
    star.addEventListener('click', function () {
      const rating = parseInt(star.getAttribute('data-rating'));
      definirAvaliacao(rating);
    });
  });

  // Remover hover quando sair da área das estrelas
  document.querySelector('.rating-stars').addEventListener('mouseleave', function () {
    stars.forEach(star => star.classList.remove('hover'));
  });
});

// Função para enviar avaliação
async function enviarAvaliacao(event) {
  event.preventDefault();

  const nota = parseInt(document.getElementById('notaAvaliacao').value);
  const comentario = document.getElementById('comentarioAvaliacao').value.trim();
  const idPessoa = sessionStorage.getItem('id_pessoa');

  if (!nota || nota < 1 || nota > 5) {
    showError('Avaliação inválida', 'Por favor, selecione uma nota de 1 a 5 estrelas');
    return;
  }

  if (!idPessoa) {
    showError('Erro de autenticação', 'Faça login novamente para avaliar');
    return;
  }

  const loadingId = showLoading('Enviando avaliação...', 'Registrando sua opinião sobre o produto');

  try {
    const response = await fetch(`${api.online}/avaliacoes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_produto: avaliacaoAtual.idProduto,
        id_pessoa: idPessoa,
        nota: nota,
        comentario: comentario || null
      })
    });

    hideNotification(loadingId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.mensagem || 'Erro ao enviar avaliação');
    }

    const result = await response.json();

    if (result.sucesso) {
      showSuccess('Avaliação enviada!', 'Obrigado por avaliar nosso produto');
      fecharModalAvaliacao();

      // Atualizar o botão para mostrar que já foi avaliado
      const botaoAvaliar = document.querySelector(`button[onclick*="${avaliacaoAtual.idProduto}"]`);
      if (botaoAvaliar) {
        botaoAvaliar.innerHTML = '<i class="fas fa-check"></i> Avaliado';
        botaoAvaliar.disabled = true;
      }
    } else {
      throw new Error(result.mensagem || 'Erro ao processar avaliação');
    }

  } catch (error) {
    hideNotification(loadingId);
    console.error('Erro ao enviar avaliação:', error);
    showError('Erro ao avaliar', error.message || 'Não foi possível enviar sua avaliação');
  }
}

// Event listener para o formulário de avaliação
document.addEventListener('DOMContentLoaded', function () {
  const avaliacaoForm = document.getElementById('avaliacaoForm');
  if (avaliacaoForm) {
    avaliacaoForm.addEventListener('submit', enviarAvaliacao);
  }
});

// Tornar funções globais para uso no HTML
window.abrirModalAvaliacao = abrirModalAvaliacao;
window.fecharModalAvaliacao = fecharModalAvaliacao;