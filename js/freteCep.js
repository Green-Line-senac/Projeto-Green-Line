document.addEventListener('DOMContentLoaded', function() {
  const cepInput = document.getElementById('cep');
  const logradouroInput = document.getElementById('logradouro');
  const bairroInput = document.getElementById('bairro');
  const cidadeInput = document.getElementById('cidade');
  const ufInput = document.getElementById('uf');
  const freteInput = document.getElementById('frete');
  const numeroInput = document.getElementById('numeroCasa');
  const complementoInput = document.getElementById('complementoCasa');

  function limparEndereco() {
    logradouroInput.value = '';
    bairroInput.value = '';
    cidadeInput.value = '';
    ufInput.value = '';
    freteInput.value = '';
    if (numeroInput) numeroInput.readOnly = true;
    if (complementoInput) complementoInput.readOnly = true;
  }

  cepInput.addEventListener('blur', function() {
    const cep = cepInput.value.replace(/\D/g, '');
    if (cep.length !== 8) {
      limparEndereco();
      return;
    }
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then(res => res.json())
      .then(data => {
        if (data.erro) {
          limparEndereco();
          alert('CEP não encontrado!');
          return;
        }
        logradouroInput.value = data.logradouro;
        bairroInput.value = data.bairro;
        cidadeInput.value = data.localidade;
        ufInput.value = data.uf;
        // Cálculo de frete simples
        let frete = 30;
        if (data.uf === 'SP') frete = 20;
        freteInput.value = `R$ ${frete.toFixed(2)}`;
        if (typeof Event === 'function') {
          freteInput.dispatchEvent(new Event('input'));
        }
        // Destrava campos de número e complemento
        if (numeroInput) numeroInput.readOnly = false;
        if (complementoInput) complementoInput.readOnly = false;
        // Salva no sessionStorage
        sessionStorage.setItem('enderecoEntrega', JSON.stringify({
          cep: cepInput.value,
          logradouro: data.logradouro,
          bairro: data.bairro,
          cidade: data.localidade,
          uf: data.uf,
          frete: frete
        }));
      })
      .catch(() => {
        limparEndereco();
        alert('Erro ao buscar o CEP!');
      });
  });
}); 