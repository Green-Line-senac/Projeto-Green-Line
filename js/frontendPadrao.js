document.addEventListener('DOMContentLoaded', async () => {
    await verificarEstadoLogin();
});
const elementosHTML = {
    iconeUsuario: document.getElementById('icone-usuario'),
}
// Login
async function verificarEstadoLogin() {
    if (!elementosHTML.iconeUsuario) return;
    
    try {
      const response = await fetch('http://localhost:3002/loginDados');
      if (!response.ok) return;
      
      const dados = await response.json();
      if (dados.trocarDeConta == 1 || dados.trocar == 1) {
        elementosHTML.iconeUsuario.className = "bi bi-person-check text-success";
        elementosHTML.iconeUsuario.title = "Usuário logado";
      }
    } catch (erro) {
      console.error('Erro ao verificar login:', erro);
    }
  }