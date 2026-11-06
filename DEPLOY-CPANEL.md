# Instalar o Vroom.pt no cPanel (PHP)

A aplicação é **PHP + HTML + JavaScript**, sem base de dados nem instalação. Funciona em qualquer alojamento cPanel com **PHP 7.4 ou superior** (recomendado 8.1+) e as extensões habituais `curl`, `json`, `mbstring` e `session`, que estão ativas por omissão.

## 1. Enviar os ficheiros

1. cPanel → **File Manager** → abra `public_html`.
2. Crie uma pasta, por exemplo `vroom` → entre nela.
3. **Upload** de `vroom-pt.zip` → botão direito → **Extract**.
4. Deve ver `index.php`, `api.php`, `login.php`, `assets/`, `inc/` e `data/` dentro de `public_html/vroom`.

A aplicação fica em `https://seudominio.pt/vroom/`. Para usar um subdomínio (ex.: `vroom.seudominio.pt`), crie-o em **Domains** e extraia o zip na pasta desse subdomínio.

## 2. Primeira utilização

Abra o endereço no navegador. Na primeira vez a aplicação pede para **escolher a palavra-passe** (mínimo 8 caracteres). Fica guardada encriptada (hash) em `data/auth.json`. Pode alterá-la depois em **Definições → Acesso e integrações**.

Não é preciso editar nenhum ficheiro.

## 3. HTTPS

cPanel → **SSL/TLS Status** → execute o **AutoSSL** para o domínio. Depois, em **Domains**, ative **Force HTTPS Redirect**.

## 4. Marcador (bookmarklet)

Entre na aplicação → **Importar anúncios** → arraste **Enviar para o Vroom.pt** para a barra de marcadores. Em qualquer página de resultados ou de anúncio do leboncoin, carregue no marcador: abre-se uma pequena janela → **Importar**. Se ainda não tiver sessão iniciada, a janela pede a palavra-passe e continua sozinha.

## Segurança e dados

* Tudo fica na pasta `data/`: `db.json` (carros, despesas, definições), `auth.json` (hash da palavra-passe), `secrets.json` (chave Firecrawl), `sessions/` e `backups/`.
* O `.htaccess` bloqueia o acesso web a `data/`, `inc/`, `cron/` e `config*.php`. Para confirmar, abra `https://seudominio.pt/vroom/data/db.json`: tem de dar **403 Forbidden**.
* **Ainda mais seguro (opcional):** guarde os dados fora de `public_html`. Copie `config.sample.php` para `config.php` e ative a linha
  `define('DATA_DIR', '/home/SEU_UTILIZADOR/vroom-data');`
* **Cópias de segurança:** em **Definições → Descarregar cópia** exporta tudo em JSON. Inclua também a pasta `data/` nos backups do cPanel.

## Chave Firecrawl (opcional)

O leboncoin bloqueia pedidos feitos a partir de servidores. Para a aplicação conseguir **obter um URL diretamente**, guarde uma chave [Firecrawl](https://firecrawl.dev) em **Definições → Acesso e integrações**. A chave fica só no servidor. Sem ela, use o marcador ou cole o código-fonte da página.

## Atualizar pesquisas automaticamente (cron, opcional)

1. Crie `data/searches.txt` (pelo File Manager) com um URL de pesquisa do leboncoin por linha.
2. cPanel → **Cron Jobs** → por exemplo duas vezes por dia:

```bash
/usr/local/bin/php /home/SEU_UTILIZADOR/public_html/vroom/cron/fetch.php >> /home/SEU_UTILIZADOR/vroom-cron.log 2>&1
```

O caminho do PHP pode variar: o cPanel mostra-o na página **Cron Jobs**, ou use `php` em vez de `/usr/local/bin/php`. Na prática isto precisa da chave Firecrawl.

## Atualizar a aplicação

Envie o novo `vroom-pt.zip` para a mesma pasta → **Extract** → substituir ficheiros. O zip não traz dados, por isso `data/` (e `config.php`, se existir) mantêm-se.

## Resolução de problemas

| Sintoma | Solução |
|---|---|
| "500 Internal Server Error" logo ao abrir | Versão do PHP antiga: cPanel → **MultiPHP Manager** (ou *Select PHP Version*) → escolha 8.1 ou superior para o domínio |
| "Não foi possível criar a pasta de dados" / "gravar os dados" | Permissões: no File Manager, a pasta `data/` deve ter permissão **755** (ou 750) e pertencer ao seu utilizador |
| Volta sempre para o login | Cookies bloqueados, ou a pasta `data/sessions` sem permissão de escrita |
| "pedido recusado" (403) ao importar | Firewall do alojamento (ModSecurity). A aplicação já envia o HTML codificado; se persistir, peça ao alojamento para criar uma exceção para `api.php` |
| "Bloqueado pelo leboncoin (HTTP 403)" | Normal a partir de servidores: use o marcador ou configure a chave Firecrawl |
| Ecrã branco no navegador | Abra a consola do navegador (F12). Os ficheiros `.js` têm de ser servidos como JavaScript (o `.htaccess` já trata disto) |
