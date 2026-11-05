# Loja + backoffice de pré-encomendas (PHP + MySQL, pronto para cPanel)

Loja em HTML/CSS/JS com o layout laranja de referência, catálogo de 67 produtos, checkout de
**pré-encomenda (sem pagamento)** e backoffice para gerir encomendas e a marca da loja.

## Instalar no cPanel

1. Gere o pacote (ou use o `dist/loja-cpanel.zip` já incluído no repositório):
   ```bash
   ./tools/build-cpanel.sh
   ```
2. Siga o guia [`INSTALAR.txt`](INSTALAR.txt) (também incluído no zip): criar base de dados MySQL →
   carregar e extrair o zip em `public_html` → abrir `install.php` → apagar `install.php`.

Requisitos: PHP 8.1+ com PDO MySQL e mbstring, Apache com mod_rewrite (padrão no cPanel), MySQL 5.7+ ou MariaDB 10.3+.
Funciona na raiz do domínio ou numa subpasta (ex.: `public_html/loja`).

## Backoffice (`/admin/`)

- **Pré-encomendas:** pesquisa, filtro por estado, indicadores, detalhe com estado
  (pendente → confirmada → enviada → entregue / cancelada), nota interna, histórico, eliminar, exportar CSV
- **Registar encomenda:** pedidos recebidos por telefone/email
- **Produtos:** editar preço, promoção, descrição, imagem, ordem, categoria e estado; criar e eliminar
- **Categorias:** criar, renomear, ordenar, ocultar (esconde os produtos) e eliminar movendo os produtos
- **Verificação e embalagem:** por produto, imagem do código de proteção, texto "Como funciona", link de
  verificação (só https) e imagem dos tamanhos da embalagem, numa secção da página do produto
- **Avaliações de clientes reais:** link privado por encomenda entregue, uma avaliação por produto, moderação
  (publicar/rejeitar/responder), "Compra verificada", média e contagem reais na loja
  - **Escrever avaliação (backoffice):** regista por produto uma avaliação que um cliente enviou por WhatsApp, email,
    etc. (canal, data e confirmação obrigatórios); editável; na loja aparece "Recebida por <canal>", nunca "Compra verificada"
- **Testemunhos:** mensagens reais de clientes com foto opcional, origem e data; publicadas na página inicial
- **Uso interno, sem indexação:** meta robots `noindex, nofollow` em todas as páginas, `X-Robots-Tag` em todas
  as respostas e `robots.txt` com `Disallow: /`
- **Encomenda com nome, email e telemóvel/WhatsApp:** processada após validação do pagamento; o cliente recebe
  mensagens por email/WhatsApp (confirmação, pagamento, pagamento confirmado, tracking) — modelos prontos no
  painel da encomenda, dados de pagamento privados em Marca, nº de seguimento por encomenda; alternativa:
  revendedor oficial (apenas indicado no texto); estado "Pagamento validado"
- **Menu lateral:** pesquisa instantânea, categorias com contagem e lista de produtos, atalhos e "Objetivos"
  (lista gerida em Categorias, associada a cada produto; filtro `/produtos?goal=<id>`; `?q=` para pesquisa)
- **Página Produtos (`/produtos`):** promoções, mais vendidos, novidades e catálogo completo com filtros
- **Entregas e stock:** em stock = entrega imediata; sem stock = por encomenda (até 3 semanas); encomendas acima do
  stock são divididas por artigo (`fromStock`/`backorder`); embalagem discreta sempre indicada
- **Página própria por produto:** `/produto/<id>` (gerada por `produto.php` a partir do `index.html`), com
  caminho de navegação, produtos relacionados e 404 para produtos inexistentes ou inativos
- **Importar conteúdo:** ficheiros .md/.txt ou texto colado → especificações (tabela) + descrição formatada
  (Markdown simples, sempre escapado), associação pelo título com pré-visualização
- **Imagens em massa:** várias imagens de uma vez, associadas pelo nome do ficheiro (com confirmação)
- **Stock:** controlo opcional por produto; as encomendas retiram stock de forma atómica (sem vendas acima do
  disponível, mesmo com pedidos simultâneos), cancelar devolve; entradas/saídas/acertos com nota; histórico de
  movimentos (`stock_moves`); alertas de stock baixo; "Últimas N unidades"/"Esgotado" na loja
- **Marca:** nome da loja, logótipo, favicon, cor principal (com aviso de contraste), email de apoio,
  pré-visualização ao vivo, alteração da palavra-passe

## Arquitetura

| Ficheiro | Função |
|---|---|
| `index.html`, `styles.css`, `app.js` | Loja |
| `theme.css` | Tema glassmorphism, mobile-first: barra de navegação em baixo, barra de compra fixa na ficha, carrinho em painel inferior. Desfoque só em elementos fixos, por desempenho; versões opacas sem `backdrop-filter` ou com "reduzir transparência" |
| `brand.js` | Lê `api/settings` e aplica nome, logótipo e favicon (com cópia local para não piscar) |
| `api/brand.css` | Cor da marca gerada pelo servidor e carregada no `<head>`: a página é pintada logo com a cor certa |
| `products.js` | FAQ e catálogo/categorias iniciais (importados para as tabelas `products` e `categories` na primeira utilização; depois editam-se no backoffice) |
| `admin/` | Backoffice |
| `produto.php`, `produtos.php`, `app/page.php` | Página de cada produto (`/produto/<id>`), página Produtos (`/produtos`) e o gerador comum que reutiliza o `index.html` |
| `robots.txt` | Bloqueia todos os motores de busca |
| `api.php` | API (`/api/...` via `.htaccess`). Só usa GET/POST, compatível com mod_security |
| `app/lib.php` | Base de dados, encomendas, marca, autenticação, limites de tentativas |
| `install.php` | Assistente: testa a ligação, cria as tabelas, escreve `app/config.php`, bloqueia-se depois |
| `uploads/brand/`, `uploads/products/` | Logótipo, favicon e imagens de produtos carregados (só imagens raster validadas pelo conteúdo; nada é executado) |

Segurança: palavra-passe com `password_hash`, sessões com token aleatório guardado como hash,
limite de tentativas de login e de pré-encomendas por IP, `app/` inacessível pela web,
SVG recusado nos uploads, CSV protegido contra injeção de fórmulas.

## Desenvolvimento local

```bash
php -S localhost:8000 -t store store/app/dev-router.php
```
O `dev-router.php` emula as regras do `.htaccess`. É preciso um MySQL/MariaDB local; o instalador
aceita `anfitrião:porta` no campo Servidor.
