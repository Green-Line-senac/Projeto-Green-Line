-- Adicionar coluna tamanho à tabela carrinho_itens
ALTER TABLE carrinho_itens 
ADD COLUMN tamanho VARCHAR(10) NULL AFTER quantidade;

-- Adicionar coluna tamanho à tabela pedido_produto (se não existir)
ALTER TABLE pedido_produto 
ADD COLUMN tamanho VARCHAR(10) NULL AFTER preco_unitario;