# Forge Labs — loja + backoffice de pré-encomendas

Loja em HTML/CSS/JS (sem build) com o layout laranja de referência, catálogo completo de 67 produtos
(obtido por scrape com Firecrawl das páginas de categoria da loja de referência) e um backoffice para
registar pré-encomendas. **Não há pagamentos**: o checkout apenas regista a pré-encomenda.

## Executar

Requer Node.js 18+ e nenhuma dependência.

```bash
ADMIN_PASSWORD='escolha-uma-palavra-passe' node server.js
```

- Loja: http://localhost:3000
- Backoffice: http://localhost:3000/admin

Variáveis: `PORT` (3000), `ADMIN_PASSWORD` (obrigatória para o backoffice), `DATA_DIR` (`./data`).
As encomendas ficam em `data/orders.json` (ignorado pelo git).

## Backoffice

- Lista de pré-encomendas com pesquisa, filtro por estado e indicadores (pendentes, hoje, valor total)
- Detalhe da encomenda: cliente, artigos, descontos, mudança de estado
  (pendente → confirmada → enviada → entregue / cancelada), nota interna, histórico, eliminar
- Registar encomenda manualmente (ex.: pedidos por telefone)
- Exportar CSV

## Ficheiros

- `products.js`: catálogo partilhado entre a loja e o servidor
- `app.js`, `index.html`, `styles.css`: loja
- `admin/`: backoffice
- `server.js`: API + ficheiros estáticos. Os preços são sempre recalculados no servidor.
