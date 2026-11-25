# Instalar o Gohan num servidor

O pacote corre a app e um proxy (Caddy) que trata do **HTTPS automático** com Let's Encrypt. O HTTPS é
obrigatório: sem ele a app não se instala no ecrã principal do iPhone nem recebe notificações.

## Do que precisas

- Um servidor Linux com **Docker** e o plugin **docker compose** (ex.: VPS de 1 vCPU / 1 GB RAM; 2 GB se
  importares muitos vídeos). Portas **80** e **443** abertas.
- Um **domínio ou subdomínio** (ex.: `gohan.oteudominio.pt`) com um registo **A** (e AAAA, se tiveres IPv6)
  a apontar para o IP do servidor.
- Uma **chave da API da Anthropic** (console.anthropic.com) para importar receitas e converter para a Bimby.

## Instalação (5 minutos)

```bash
git clone <o-teu-repositório> gohan && cd gohan/deploy
./install.sh          # 1.ª vez: cria deploy/.env com um código de registo e pára
nano .env             # preenche DOMAIN, ACME_EMAIL, ANTHROPIC_API_KEY, VAPID_SUBJECT
./install.sh          # constrói, arranca e espera que a app responda
```

Ou, a partir do arquivo `gohan-*.tar.gz`: `tar -xzf gohan-*.tar.gz && cd gohan/deploy` e segue os mesmos passos.

Abre `https://<o-teu-domínio>`:

1. **Cria a tua conta** com o código de registo (está em `deploy/.env`, `SIGNUP_CODE`), no campo *Convite ou código*.
2. **Cria um grupo** e partilha o convite com os amigos: eles registam-se com o link do convite.
3. No iPhone: Safari → **Partilhar → Adicionar ao ecrã principal**; abre pelo ícone e ativa as notificações
   em *Definições*.

## Manutenção

| Tarefa | Comando |
|---|---|
| Ver o estado | `docker compose ps` |
| Ver os registos | `docker compose logs -f gohan` |
| Cópia de segurança (base de dados + fotos) | `./backup.sh` → `deploy/backups/` (guarda as últimas 14) |
| Repor uma cópia | `./restore.sh backups/gohan-AAAAMMDD-HHMM.tar.gz` |
| Atualizar para a versão nova | `./update.sh` (faz backup, `git pull` e reconstrói) |
| Reiniciar | `docker compose restart gohan` |
| Parar | `docker compose down` (os dados ficam no volume `gohan-data`) |

Cópia diária automática (cron do utilizador com acesso ao Docker):

```
15 4 * * *  /caminho/para/gohan/deploy/backup.sh >/dev/null 2>&1
```

Guarda também as cópias **fora do servidor** (ex.: `rclone` para uma drive) e o ficheiro `deploy/.env`.

## Onde ficam os dados

Tudo no volume Docker `gohan-data` (`/data` dentro do contentor): `recipes.db` (receitas, contas, grupos,
planos, listas, chaves das notificações) e `uploads/` (fotos do "Já fiz isto"). As chaves VAPID das
notificações são geradas na primeira execução e ficam na base de dados: **não apagues o volume**, ou as
subscrições de notificações deixam de funcionar.

## Notas

- **Um só processo**: a base de dados (SQLite), as atualizações em tempo real e o resumo semanal vivem
  em memória; não aumentes o número de *workers*. Para um grupo de amigos sobra capacidade.
- **Instagram/TikTok** às vezes exigem sessão para descarregar vídeos. Se as importações falharem,
  exporta os cookies do browser (formato Netscape) para `/data/cookies.txt` e define
  `YTDLP_COOKIES_FILE=/data/cookies.txt` no `.env`:
  `docker compose cp cookies.txt gohan:/data/cookies.txt && docker compose up -d`.
  O yt-dlp muda com frequência: `./update.sh` reconstrói a imagem com a versão mais recente.
- **Custos da IA**: cada importação e cada conversão Bimby é uma chamada à API. Podes baixar o custo com
  `RECIPE_EFFORT=low` ou outro `RECIPE_MODEL`.
- **Firewall**: só as portas 80 e 443 precisam de estar abertas; a app não fica exposta diretamente.
- **Sem domínio** (só rede local, para testar): `docker compose run --service-ports` não chega para o
  iPhone, porque o Safari exige HTTPS para instalar e para notificações. Usa um domínio.
