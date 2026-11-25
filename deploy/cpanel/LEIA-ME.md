# Instalar o Gohan no cPanel

O Gohan é uma app Python. No cPanel corre com **Setup Python App**. Usa uma base de dados SQLite, que é
um ficheiro: **não precisas de MySQL nem do phpMyAdmin**.

> Se o teu cPanel não tiver *Setup Python App* (secção *Software*), o alojamento não suporta Python:
> pede ao fornecedor para o ativar (CloudLinux) ou usa um VPS com o pacote Docker (`deploy/README.md`).

## 1. Subdomínio com HTTPS

1. **Domains** (ou *Subdomains*) → cria `gohan.oteudominio.pt`. Assim não mexes no site que já tens.
2. **SSL/TLS Status** → seleciona o subdomínio → **Run AutoSSL**. Precisas de HTTPS para instalar a app no
   iPhone e para as notificações.

## 2. Carregar os ficheiros

1. **File Manager** → abre a pasta `gohan` (criada pelo *Setup Python App*; se não existir, cria-a na pasta
   inicial, **fora** de `public_html`).
2. Dentro de `gohan` → **Upload** → `gohan-cpanel.zip` → clica no zip → **Extract** → aceita substituir o
   `passenger_wsgi.py` de exemplo.
3. Confirma: dentro de `gohan` tens **diretamente** `app/`, `gohan_wsgi.py`, `requirements-cpanel.txt`
   (não uma pasta `gohan/gohan`).
4. Copia `env.example` para `.env` e edita: `ANTHROPIC_API_KEY`, `SIGNUP_CODE`, `VAPID_SUBJECT`.
   (Ativa *Settings → Show Hidden Files* para veres o `.env`.)

## 3. Criar a aplicação Python

> **Ordem importante:** extrai os ficheiros (passo 2) **antes** de criar a aplicação. Se o *startup file*
> ainda não existir, o cPanel escreve lá uma app de exemplo ("It works!") e o Gohan não arranca.

**Setup Python App → Create Application**:

| Campo | Valor |
|---|---|
| Python version | **3.12** (ou 3.11; mínimo 3.10) |
| Application root | `gohan` |
| Application URL | `gohan.oteudominio.pt` |
| Application startup file | **`gohan_wsgi.py`** (não `passenger_wsgi.py`) |
| Application Entry point | `application` |
| Passenger log file | `/home/OTEUUTILIZADOR/gohan-data/passenger.log` |

Carrega em **Create**. Depois, na mesma página:

1. **Configuration files** → escreve `requirements-cpanel.txt` → **Add** → **Run Pip Install**
   (demora 1–3 minutos).
2. **Restart**.

Abre `https://gohan.oteudominio.pt`: cria a tua conta com o `SIGNUP_CODE`, cria um grupo e partilha o convite.
No iPhone: Safari → **Partilhar → Adicionar ao ecrã principal**.

## 4. Tarefas agendadas (Cron Jobs)

O comando Python da app aparece no topo de *Setup Python App* ("Enter to the virtual environment").
É algo como `/home/OTEUUTILIZADOR/virtualenv/gohan/3.12/bin/python`. Em **Cron Jobs** adiciona:

| Quando | Comando |
|---|---|
| A cada hora, ao domingo (`0 * * * 0`) | `cd ~/gohan && ~/virtualenv/gohan/3.12/bin/python cron.py weekly` |
| Todos os dias às 4:15 (`15 4 * * *`) | `cd ~/gohan && ~/virtualenv/gohan/3.12/bin/python cron.py backup` |

O resumo semanal só é enviado uma vez, ao domingo a partir das 18h. As cópias ficam em
`~/gohan-data/backups/` (as últimas 14). Descarrega-as de vez em quando pelo File Manager.

## Atualizar para uma versão nova

1. Carrega e extrai o zip novo por cima de `~/gohan` (o `.env` e os dados não são substituídos).
2. *Setup Python App* → **Run Pip Install** (se mudou o `requirements`) → **Restart**.

## Diferenças em relação ao servidor com Docker

- **Listas e feed do grupo**: atualizam-se a cada ~10 s em vez de instantaneamente (o alojamento partilhado
  não mantém ligações abertas).
- **Vídeos**: o ffmpeg vem incluído (pacote `imageio-ffmpeg`). Alguns alojamentos limitam CPU/memória:
  se as importações de vídeo falharem, as de blogues e as legendas continuam a funcionar.
- **Instagram/TikTok** podem pedir sessão: põe um `cookies.txt` (formato Netscape) em `~/gohan-data/` e
  `YTDLP_COOKIES_FILE=/home/OTEUUTILIZADOR/gohan-data/cookies.txt` no `.env`, depois **Restart**.

## Se algo correr mal

- **"It works! Python v3.x"** em todas as páginas: o cPanel pôs a app de exemplo no `gohan_wsgi.py`.
  Volta a extrair o zip (substituir) e faz **Stop App → Start App**.
- **"Index of /"**: o `.htaccess` da pasta pública perdeu o bloco `CLOUDLINUX PASSENGER CONFIGURATION`.
  Recria a aplicação (o cPanel reescreve-o) ou repõe o bloco com `PassengerAppRoot`, `PassengerBaseURI "/"`
  e `PassengerPython` (o caminho aparece na faixa azul do *Setup Python App*).
- **Página fica a carregar sem erro**: usa o `gohan_wsgi.py` mais recente (cria a app só depois de o
  LiteSpeed copiar o processo).
- **"No such application" ao fazer Restart**: o registo do cPanel dessincronizou; *Destroy* e *Create* com
  os mesmos valores (os ficheiros e `~/gohan-data` ficam).

- `RecursionError` no `stderr.log`: o *startup file* está como `passenger_wsgi.py`; muda para `gohan_wsgi.py`, **Save**, **Restart**.
- Página de erro do Passenger: vê `~/gohan-data/passenger.log` e `~/gohan/stderr.log`.
- "No module named …": volta a carregar em **Run Pip Install** com `requirements-cpanel.txt` e **Restart**.
- Mudaste o `.env`? Faz sempre **Restart**.
