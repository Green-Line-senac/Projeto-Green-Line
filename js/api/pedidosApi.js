const apiPedidos = {
    online: 'https://green-line-web.onrender.com',
    local: 'http://localhost:3009'
};

// Função para criar um novo pedido
async function criarPedido(dadosPedido) {
    try {
        const response = await fetch(`${apiPedidos.online}/pedidos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosPedido),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Erro ao criar pedido: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Erro ao criar pedido:', error);
        throw error;
    }
}

// Função para buscar pedidos do usuário
async function buscarPedidosUsuario(idUsuario) {
    try {
        const response = await fetch(`${apiPedidos.online}/pedidos/usuario/${idUsuario}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Erro ao buscar pedidos: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        throw error;
    }
}

// Função para buscar um pedido específico
async function buscarPedido(numeroPedido) {
    try {
        const response = await fetch(`${apiPedidos.online}/pedidos/${numeroPedido}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Erro ao buscar pedido: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        throw error;
    }
}

// Função para atualizar status do pedido
async function atualizarStatusPedido(numeroPedido, novoStatus) {
    try {
        const response = await fetch(`${apiPedidos.online}/pedidos/${numeroPedido}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: novoStatus }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Erro ao atualizar status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        throw error;
    }
}

// Exporta as funções
export {
    criarPedido,
    buscarPedidosUsuario,
    buscarPedido,
    atualizarStatusPedido
}; 