# Sistema de Loading - Green Line

Este documento explica como usar o sistema de loading implementado na aplicação Green Line.

## Arquivos Criados

1. **`css/loading.css`** - Estilos para o sistema de loading
2. **`js/loading.js`** - Lógica JavaScript para gerenciar o loading
3. **Documentação** - Este arquivo

## Como Usar

### 1. Incluir os Arquivos

Adicione os arquivos CSS e JS nas suas páginas HTML:

```html
<!-- CSS -->
<link rel="stylesheet" href="css/loading.css">

<!-- JavaScript -->
<script src="js/loading.js"></script>
```

### 2. Funções Básicas

#### Mostrar Loading
```javascript
// Loading básico
showLoading();

// Loading com opções personalizadas
showLoading({
  text: 'Carregando dados...',
  subtext: 'Por favor, aguarde',
  type: 'spinner', // ou 'dots'
  theme: 'success' // 'primary', 'success', 'warning'
});
```

#### Esconder Loading
```javascript
hideLoading();
```

### 3. Presets Pré-definidos

Use os presets para situações comuns:

```javascript
// Login
showLoading(LoadingPresets.login);

// Cadastro
showLoading(LoadingPresets.cadastro);

// Carregando produtos
showLoading(LoadingPresets.carregandoProdutos);

// Processando pagamento
showLoading(LoadingPresets.processandoPagamento);

// Salvando dados
showLoading(LoadingPresets.salvandoDados);
```

### 4. Loading em Botões

```javascript
// Mostrar loading no botão
showButtonLoading('meuBotao', 'Texto Original');

// Esconder loading do botão
hideButtonLoading('meuBotao');

// Ou usando elemento diretamente
const botao = document.getElementById('meuBotao');
showButtonLoading(botao);
hideButtonLoading(botao);
```

### 5. Wrapper para Funções Assíncronas

```javascript
// Executar função com loading automático
await loading.withLoading(async () => {
  // Sua função assíncrona aqui
  const dados = await fetch('/api/dados');
  return dados.json();
}, {
  text: 'Buscando dados...',
  subtext: 'Aguarde um momento'
});

// Fetch com loading automático
const response = await loading.fetchWithLoading('/api/produtos', {
  method: 'GET'
}, {
  text: 'Carregando produtos...'
});
```

## Exemplos Práticos

### Exemplo 1: Login com Loading

```javascript
async function fazerLogin(usuario, senha) {
  try {
    // Mostrar loading
    showLoading(LoadingPresets.login);
    showButtonLoading('botaoLogin', 'Entrar');

    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, senha })
    });

    const dados = await response.json();
    
    if (dados.sucesso) {
      // Processar login bem-sucedido
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('Erro no login:', error);
  } finally {
    // Sempre esconder loading
    hideLoading();
    hideButtonLoading('botaoLogin');
  }
}
```

### Exemplo 2: Carregamento de Produtos

```javascript
async function carregarProdutos() {
  try {
    showLoading(LoadingPresets.carregandoProdutos);
    
    const response = await fetch('/api/produtos');
    const produtos = await response.json();
    
    // Renderizar produtos
    renderizarProdutos(produtos);
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
  } finally {
    hideLoading();
  }
}
```

### Exemplo 3: Formulário com Loading

```javascript
async function salvarFormulario(dados) {
  const botaoSalvar = document.getElementById('salvar');
  
  try {
    showLoading(LoadingPresets.salvandoDados);
    showButtonLoading(botaoSalvar, 'Salvar');
    
    const response = await fetch('/api/salvar', {
      method: 'POST',
      body: JSON.stringify(dados)
    });
    
    if (response.ok) {
      alert('Dados salvos com sucesso!');
    }
  } catch (error) {
    alert('Erro ao salvar dados');
  } finally {
    hideLoading();
    hideButtonLoading(botaoSalvar);
  }
}
```

## Customização

### Criar Preset Personalizado

```javascript
const meuPreset = {
  text: 'Processando...',
  subtext: 'Operação em andamento',
  type: 'dots',
  theme: 'primary'
};

showLoading(meuPreset);
```

### Estilos Personalizados

Você pode adicionar classes CSS personalizadas no arquivo `css/loading.css`:

```css
.loading-custom .loading-spinner {
  border-top-color: #your-color;
}

.loading-custom .loading-dots div {
  background: #your-color;
}
```

## Páginas Já Implementadas

✅ **Login** (`public/login.html`) - Loading implementado
✅ **Index** (`index.html`) - Loading para carregamento de produtos
✅ **Sistema base** - Arquivos CSS e JS criados

## Próximos Passos

Para implementar o loading em outras páginas:

1. Adicione os arquivos CSS e JS
2. Use as funções `showLoading()` e `hideLoading()`
3. Aplique loading em botões com `showButtonLoading()`
4. Use os presets para situações comuns

## Benefícios

- ✅ Melhor experiência do usuário
- ✅ Feedback visual durante operações
- ✅ Prevenção de cliques múltiplos
- ✅ Interface mais profissional
- ✅ Fácil de implementar e customizar