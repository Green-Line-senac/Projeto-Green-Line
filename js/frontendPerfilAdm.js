// frontendPerfilAdm.js

document.addEventListener('DOMContentLoaded', async function () {
  const isAdmin = sessionStorage.getItem('isAdmin') === 'true';;

  if (!isAdmin) {
    window.location.href = 'perfil.html';
    return;
  }

  const api = {
    online: "https://green-line-web.onrender.com",
    perfil: "http://localhost:3008",
    index: "http://localhost:3002",
  };

  let usuarioLogado = null;

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
    try {
      const token = sessionStorage.getItem("userToken");
      const idPessoa = sessionStorage.getItem("id_pessoa");

      if (!token || !idPessoa) {
        window.location.href = "../index.html";
        return;
      }

      const response = await fetch(`${api.online}/pessoa/${idPessoa}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout();
          return;
        }
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      usuarioLogado = data[0];
      preencherDadosPerfil(usuarioLogado);
      await carregarEndereco();

      const darkModeEnabled = localStorage.getItem('darkMode') === 'true';
      document.body.classList.toggle('dark-mode', darkModeEnabled);
      document.getElementById('darkModeToggle').checked = darkModeEnabled;

    } catch (err) {
      console.error("Erro ao carregar usuário:", err);
      alert("Erro ao carregar dados do usuário.");
      logout();
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

    if (user.imagem_perfil) {
      document.getElementById("profileAvatar").src = user.imagem_perfil;
    }
  }

  async function carregarEndereco() {
    const idPessoa = sessionStorage.getItem("id_pessoa");
    const token = sessionStorage.getItem("userToken");
    if (!idPessoa || !token) return;

    try {
      const resp = await fetch(`${api.online}/pessoa/${idPessoa}/enderecos`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!resp.ok) throw new Error("Erro no GET de endereço");
      const endereco = await resp.json();
      preencherEndereco(endereco[0]);

    } catch (err) {
      document.getElementById("addressContent").innerHTML =
        "<p>Erro ao carregar endereço.</p>";
    }
  }

  function preencherEndereco(endereco) {
    if (!endereco) return;
    const addressContent = document.getElementById("addressContent");
    addressContent.innerHTML = `
      <p>${endereco.endereco},${endereco.complemento || ''}</p>
      <p>${endereco.cidade} - ${endereco.uf}, ${endereco.cep}</p>
      <p>${endereco.bairro || ''}</p>
    `;

    document.getElementById("cep").value = endereco.cep || "";
    document.getElementById("endereco").value = endereco.endereco || "";
    document.getElementById("complemento").value = endereco.complemento || "";
    document.getElementById("cidade").value = endereco.cidade || "";
    document.getElementById("uf").value = endereco.uf || "";
    document.getElementById("bairro").value = endereco.bairro || "";

    document.getElementById("addressForm").dataset.idEndereco = endereco.id_endereco;
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
      if (section === "purchase-history") loadTodosPedidos();

    });
  });

  // Modo noturno
  document.getElementById('darkModeToggle').addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    document.body.classList.toggle('dark-mode', isChecked);
    localStorage.setItem('darkMode', isChecked ? 'true' : 'false');
  });

  // Botão de salvar dados pessoais
  document.getElementById("savePersonalBtn").addEventListener("click", async () => {
    try {
      const token = sessionStorage.getItem("userToken");
      const idPessoa = sessionStorage.getItem("id_pessoa");

      await fetch(`${api.online}/pessoa/${idPessoa}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: document.getElementById("profileFullName").textContent,
          telefone: document.getElementById("profilePhone").textContent,
        }),
      });

      alert("Informações salvas!");
    } catch (err) {
      alert("Erro ao salvar.");
    }
  });

  // Modal de endereço
  document.getElementById("updateAddressBtn").addEventListener("click", () => {
    document.getElementById("addressModal").classList.remove("hidden");
  });
  document.querySelectorAll(".close-modal, #cancelAddressBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest(".modal").classList.add("hidden");
    });
  });
  document.getElementById("addressForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem("userToken");
    const idPessoa = sessionStorage.getItem("id_pessoa");

    const endereco = {
      cep: e.target.cep.value,
      endereco: e.target.endereco.value,
      complemento: e.target.complemento.value,
      cidade: e.target.cidade.value,
      uf: e.target.uf.value,
      bairro: e.target.bairro.value,
    };

    await fetch(`${api.online}/pessoa/${idPessoa}/enderecos`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(endereco)
    });

    alert("Endereço atualizado!");
    document.getElementById("addressModal").classList.add("hidden");
    carregarEndereco();
  });

  // Upload de imagem de perfil
  document.getElementById("avatarInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      const idPessoa = sessionStorage.getItem("id_pessoa");
      await fetch(`${api.online}/pessoa/${idPessoa}/imagem`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagem_perfil: base64 })
      });
      document.getElementById("profileAvatar").src = base64;
    };
    reader.readAsDataURL(file);
  });

  // Exclusão da conta
  document.getElementById("deleteAccountBtn").addEventListener("click", () => {
    document.getElementById("deleteModal").classList.remove("hidden");
  });
  document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
    const idPessoa = sessionStorage.getItem("id_pessoa");
    const token = sessionStorage.getItem("userToken");
    await fetch(`${api.online}/pessoa/${idPessoa}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    alert("Conta deletada.");
    logout();
  });
  document.getElementById("cancelDeleteBtn").addEventListener("click", () => {
    document.getElementById("deleteModal").classList.add("hidden");
  });

  // --- Funções ADM ---
  function loadUsersList() {
    const token = sessionStorage.getItem("userToken");
    fetch("http://localhost:3008/pessoa", {
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
    fetch(`http://localhost:3008/pessoa/${id}`, {
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

  document.getElementById("userManagementForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem("userToken");
    const id = document.getElementById("userId").value;
    const userData = {
      nome: document.getElementById("userName").value,
      email: document.getElementById("userEmail").value,
      telefone: document.getElementById("userPhone").value,
      situacao: document.getElementById("userStatus").value,
      id_tipo_usuario: document.getElementById("userType").value,
    };

    await fetch(`http://localhost:3008/pessoa/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData),
    });

    alert("Usuário atualizado.");
    document.getElementById("userManagementModal").classList.add("hidden");
    loadUsersList();
  });

  // Carregar imagens carrossel
  function loadCarouselImages() {
    fetch('/carousel-images')
      .then(res => res.json())
      .then(images => {
        const container = document.getElementById("currentCarouselImages");
        container.innerHTML = "";
        images.forEach(img => {
          container.innerHTML += `
            <div class="current-carousel-image">
              <img src="../img/carousel/${img.nomeImagem}" />
              <button class="delete-image" data-image="${img.nomeImagem}">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `;
        });
      });
  }

  document.getElementById("addProductBtn")?.addEventListener("click", () => {
    window.location.href = "../public/cadastroProdutos.html";
  });

  carregarDadosUsuario();
  document.querySelector(".nav-item.active")?.click(); // ativar seção inicial
});

function loadTodosPedidos() {
  fetch('http://localhost:3008/pedidos/todos')
    .then(res => res.json())
    .then(pedidos => {
      const container = document.getElementById("purchaseHistoryContent");
      if (!pedidos.length) {
        container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
        return;
      }

      const pedidosPorUsuario = {};

      pedidos.forEach(p => {
        if (!pedidosPorUsuario[p.numero_pedido]) {
          pedidosPorUsuario[p.numero_pedido] = {
            usuario: p.nome_usuario,
            email: p.email,
            telefone: p.telefone,
            data: p.data_hora,
            situacao: p.situacao,
            valor_total: p.valor_total,
            itens: [],
          };
        }

        pedidosPorUsuario[p.numero_pedido].itens.push({
          produto: p.nome_produto,
          quantidade: p.quantidade,
          preco: p.preco_unitario,
        });
      });

      container.innerHTML = "";

      Object.entries(pedidosPorUsuario).forEach(([pedidoId, pedido]) => {
        const pedidoEl = document.createElement("div");
        pedidoEl.classList.add("admin-order");

        pedidoEl.innerHTML = `
          <h4>Pedido: ${pedidoId} - ${new Date(pedido.data).toLocaleString()}</h4>
          <p><strong>Cliente:</strong> ${pedido.usuario} (${pedido.email})</p>
          <p><strong>Telefone:</strong> ${pedido.telefone}</p>
          <p><strong>Status:</strong> ${pedido.situacao}</p>
          <p><strong>Total:</strong> R$ ${parseFloat(pedido.valor_total).toFixed(2)}</p>
          <ul>
            ${pedido.itens.map(item => `
              <li>${item.quantidade}x ${item.produto} - R$ ${parseFloat(item.preco).toFixed(2)}</li>
            `).join("")}
          </ul>
          <hr>
        `;

        container.appendChild(pedidoEl);
      });
    })
    .catch(err => {
      console.error("Erro ao carregar pedidos:", err);
      document.getElementById("purchaseHistoryContent").innerHTML = "<p>Erro ao carregar pedidos.</p>";
    });
}


function logout() {
  ["userToken", "id_pessoa", "userEmail", "userType", "usuario", "loginTime"].forEach(k => sessionStorage.removeItem(k));
  window.location.href = "/public/login.html";
}

