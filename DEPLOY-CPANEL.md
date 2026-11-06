# Instalar o Vroom.pt no cPanel

A aplicação é Node.js simples, **sem dependências npm**. Corre com o **Setup Node.js App** do cPanel (Phusion Passenger / CloudLinux) e precisa de **Node.js 18 ou superior** (recomendado 20 ou 22).

> Se o seu cPanel não tiver o ícone **Setup Node.js App**, o plano de alojamento não suporta Node.js. Peça ao fornecedor para o ativar (CloudLinux Node.js Selector) ou mude para um plano que o tenha.

## 1. Criar o pacote

No seu computador, na pasta do projeto:

```bash
npm run package
```

Isto cria `dist/vroom-pt.tar.gz`. Também pode descarregar o repositório em ZIP a partir do GitHub, que funciona da mesma forma.

## 2. Criar a aplicação

cPanel → **Software → Setup Node.js App → Create Application**

| Campo | Valor |
|---|---|
| Node.js version | 20.x ou 22.x (mínimo 18) |
| Application mode | Production |
| Application root | `vroom-pt` (uma pasta na sua área pessoal, **fora** de `public_html`) |
| Application URL | ex.: `vroom.seudominio.pt` (um subdomínio é o mais simples) ou `seudominio.pt/vroom` |
| Application startup file | `server.cjs` |

Carregue em **Create**. O cPanel cria a pasta e uma aplicação de exemplo.

## 3. Enviar os ficheiros

cPanel → **File Manager** → abra `/home/<utilizador>/vroom-pt` → apague o `app.js` de exemplo criado pelo cPanel → **Upload** de `vroom-pt.tar.gz` → botão direito → **Extract**. Deve ver `server.cjs`, `app.js`, `src/`, `public/` e `package.json` nessa pasta.

## 4. Configurar

Volte ao **Setup Node.js App** → editar a aplicação → **Environment variables** → adicione:

| Nome | Valor |
|---|---|
| `APP_PASSWORD` | a palavra-passe para entrar (**obrigatória**, a aplicação está na internet) |
| `SESSION_SECRET` | um texto aleatório comprido |
| `BASE_PATH` | só se o URL for um subcaminho, ex.: `/vroom`. Não defina para um subdomínio |
| `FIRECRAWL_API_KEY` | opcional, permite ao servidor obter páginas do leboncoin |

(Em alternativa, copie `.env.example` para `.env` na pasta da aplicação e preencha.)

Não há nada para instalar, por isso pode ignorar o **Run NPM Install**.

Carregue em **Save** e depois em **Restart**.

## 5. HTTPS

cPanel → **SSL/TLS Status** → execute o AutoSSL para o domínio. Depois **Domains** → ative **Force HTTPS Redirect**. O cookie de sessão só deve circular por HTTPS.

## 6. Abrir

Vá ao Application URL → entre → **Importar anúncios** → arraste o marcador para a barra de marcadores. O marcador aponta para o endereço online, por isso funciona em qualquer computador onde tenha sessão iniciada.

## Dados e cópias de segurança

* Os dados ficam em `vroom-pt/data/db.json` (criado no primeiro arranque). Como está fora de `public_html`, não pode ser descarregado pela web.
* Na aplicação, **Definições → Descarregar cópia** exporta um ficheiro JSON. Ao repor uma cópia, os dados substituídos ficam guardados em `data/backups/`.
* Inclua `vroom-pt/data` nas cópias de segurança do cPanel.

## Opcional: atualizar pesquisas guardadas automaticamente (cron)

1. Crie `vroom-pt/data/searches.txt` com um URL de pesquisa do leboncoin por linha.
2. Copie o comando de entrada no ambiente da aplicação, que aparece no topo da página da aplicação no Setup Node.js App, ex.:
   `source /home/<utilizador>/nodevenv/vroom-pt/20/bin/activate && cd /home/<utilizador>/vroom-pt`
3. cPanel → **Cron Jobs** → duas vezes por dia:

```bash
source /home/<utilizador>/nodevenv/vroom-pt/20/bin/activate && cd /home/<utilizador>/vroom-pt && node bin/fetch-leboncoin.js --list data/searches.txt >> data/cron.log 2>&1
```

O leboncoin bloqueia a maioria dos IP de alojamento, por isso na prática isto precisa de `FIRECRAWL_API_KEY`. Sem ela, use o marcador.

## Atualizar

Envie o novo `vroom-pt.tar.gz` para a mesma pasta → Extract (substituir). O pacote não inclui `data/` nem `.env`, por isso estes mantêm-se. Depois carregue em **Restart**.

## Resolução de problemas

| Sintoma | Solução |
|---|---|
| `ERR_REQUIRE_ESM` / "Cannot use import statement" | O ficheiro de arranque tem de ser `server.cjs`, não `app.js` |
| 503 / "Incomplete response received from application" | Node abaixo da versão 18 → escolha 20 ou 22. Consulte `vroom-pt/stderr.log` (ou o ficheiro de log definido na página da aplicação) |
| Página sem estilos ou sempre a voltar para `/login` | O URL é um subcaminho: defina `BASE_PATH` (ex.: `/vroom`) e reinicie |
| Entra mas a sessão termina logo | Reinicie depois de alterar `SESSION_SECRET`; limpe os cookies |
| "Bloqueado pelo leboncoin (HTTP 403)" | Normal a partir de servidores: use o marcador ou configure `FIRECRAWL_API_KEY` |
| Verificação de estado | `https://url-da-aplicacao/healthz` devolve `ok` |
