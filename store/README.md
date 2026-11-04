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
- **Marca:** nome da loja, logótipo, favicon, cor principal (com aviso de contraste), email de apoio,
  pré-visualização ao vivo, alteração da palavra-passe

## Arquitetura

| Ficheiro | Função |
|---|---|
| `index.html`, `styles.css`, `app.js` | Loja |
| `brand.js` | Lê `api/settings` e aplica nome, logótipo, favicon e cor (loja e backoffice) |
| `products.js` | Catálogo — bloco JSON lido pelo browser **e** pelo PHP (preços sempre recalculados no servidor) |
| `admin/` | Backoffice |
| `api.php` | API (`/api/...` via `.htaccess`). Só usa GET/POST, compatível com mod_security |
| `app/lib.php` | Base de dados, encomendas, marca, autenticação, limites de tentativas |
| `install.php` | Assistente: testa a ligação, cria as tabelas, escreve `app/config.php`, bloqueia-se depois |
| `uploads/brand/` | Logótipo/favicon carregados (só imagens raster validadas pelo conteúdo; nada é executado) |

Segurança: palavra-passe com `password_hash`, sessões com token aleatório guardado como hash,
limite de tentativas de login e de pré-encomendas por IP, `app/` inacessível pela web,
SVG recusado nos uploads, CSV protegido contra injeção de fórmulas.

## Desenvolvimento local

```bash
php -S localhost:8000 -t store store/app/dev-router.php
```
O `dev-router.php` emula as regras do `.htaccess`. É preciso um MySQL/MariaDB local; o instalador
aceita `anfitrião:porta` no campo Servidor.
