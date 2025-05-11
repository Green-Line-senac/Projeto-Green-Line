document.addEventListener('DOMContentLoaded', async () => {
    await verificarEstadoLogin();
});
async function verificarEstadoLogin() {
    try {
        const resposta = await fetch('http://localhost:3002/loginDados');
        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);

        const dados = await resposta.json();
        console.log('Estado completo:', dados);

        if (dados.trocarDeConta == 1 || dados.trocar == 1) { // Verifica ambos os nomes possíveis
            const iconeUsuario = document.getElementById('icone-usuario');

            if (!iconeUsuario) {
                console.error('Elemento icone-usuario não encontrado!');
                return;
            }

            console.log('Elemento encontrado, atualizando...');
            iconeUsuario.className = "bi bi-person-square text-success";
            iconeUsuario.title = "Usuário autenticado";

            // Adicione isto para verificação visual imediata
            iconeUsuario.style.transition = "all 0.3s ease";
            iconeUsuario.style.fontSize = "1.2em";
        }
    } catch (erro) {
        console.error('Erro ao verificar login:', erro);
    }
}