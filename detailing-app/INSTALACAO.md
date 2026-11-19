# Guia de instalação — AV Car Detail (cPanel)

Tempo estimado: **15–20 minutos**. Não é preciso instalar programas no computador.

---

## 0. Antes de começar — decisões

| Decisão | Recomendação |
|---|---|
| **Endereço** | Um subdomínio, ex.: `gestao.avcardetail.pt` (CRM) — o portal fica em `gestao.avcardetail.pt/portal.php`. Alternativa: uma pasta, ex.: `avcardetail.pt/gestao/`. |
| **Base de dados** | **MySQL** (mais robusto, incluído no cPanel). SQLite só para testes. |
| **Dados iniciais** | Para mostrar ao André: **“Demonstração AV Car Detail”**. Para usar a sério: no fim, *Definições → Dados & cópias → Remover dados de demonstração* (mantém serviços, preços e definições). |

Requisitos do alojamento: **PHP 8.0 ou superior** com `pdo_mysql`, `mbstring` e `json` (normalmente já ativos). `curl` é opcional (preencher dados pelo VIN).

---

## 1. Criar o subdomínio (opcional, recomendado)

cPanel → **Domínios** (ou *Subdomínios*) → **Criar novo domínio** → `gestao.avcardetail.pt`.
Anote a **pasta raiz** (ex.: `/home/UTILIZADOR/gestao.avcardetail.pt`).

## 2. Criar a base de dados MySQL

cPanel → **Bases de dados MySQL** (ou *Assistente de bases de dados MySQL*):

1. **Criar base de dados**: ex.: `avcrm` → fica `UTILIZADOR_avcrm`.
2. **Criar utilizador**: ex.: `avcrm` → fica `UTILIZADOR_avcrm`, com uma palavra-passe forte (guarde-a).
3. **Adicionar utilizador à base de dados** → marcar **TODOS OS PRIVILÉGIOS** → *Fazer alterações*.

## 3. Carregar os ficheiros

cPanel → **Gestor de ficheiros** → abrir a pasta raiz do subdomínio (passo 1) →
**Carregar** o ficheiro `detailpro-v1.4-avcardetail.zip` → clicar com o botão direito → **Extrair**.

> Há dois pacotes: **`detailpro-v1.4-avcardetail.zip`** (instalação da AV Car Detail — inclui o carro 3D Audi RS7 da demonstração) e **`detailpro-v1.4-revenda.zip`** (versão white-label para outros clientes, sem modelo 3D — cada cliente carrega o seu em Definições).

O zip cria uma pasta `detailpro/`. Mova o **conteúdo** dessa pasta para a raiz do subdomínio
(selecionar tudo dentro de `detailpro` → *Mover* → `/gestao.avcardetail.pt/`) e apague a pasta vazia e o zip.

> Os ficheiros que começam por ponto (`.htaccess`) podem estar ocultos: *Definições* (canto superior direito) → **Mostrar ficheiros ocultos**. Têm de existir na raiz e nas pastas `inc/`, `data/`, `uploads/` e `demo/` — são eles que protegem os dados.

**Permissões**: pastas `755`, ficheiros `644` (é o habitual no cPanel; não use 777).

## 4. Versão do PHP

cPanel → **Selecionar versão do PHP** (ou *MultiPHP Manager*) → escolha **PHP 8.1, 8.2 ou 8.3** para o subdomínio.
Em *Extensões* confirme que estão ativas: `pdo_mysql`, `mbstring`, `json` (e `curl`, `fileinfo`).

## 5. Ativar HTTPS

cPanel → **SSL/TLS Status** → *Run AutoSSL* (normalmente já está ativo).
Depois de o cadeado aparecer, edite o `.htaccess` da raiz e **retire o `#`** das 3 linhas de *Forçar HTTPS*:

```
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

## 6. Executar o instalador

Abra `https://gestao.avcardetail.pt/install.php`. A página mostra a verificação do servidor (tudo ✅). Preencha:

| Campo | Valor |
|---|---|
| Tipo | MySQL / MariaDB |
| Servidor / Porta | `localhost` / `3306` |
| Base de dados / Utilizador / Palavra-passe | os do passo 2 |
| Prefixo das tabelas | `av_` |
| Nome da aplicação | `AV Car Detail` |
| Nome da empresa | `AV Car Detail` |
| O seu nome | `André Valente` |
| Email (login) | o email do André |
| Palavra-passe | mínimo 8 caracteres |
| Dados iniciais | **Demonstração AV Car Detail** (ou instalação limpa) |

Clique **Instalar** → *Instalação concluída*.

## 7. Segurança pós-instalação (obrigatório)

1. **Apagar `install.php`** no Gestor de ficheiros.
2. Confirmar que estes endereços **não abrem** (devem dar erro 403/“Proibido”):
   - `https://gestao.avcardetail.pt/config.php` (deve ficar em branco ou 403)
   - `https://gestao.avcardetail.pt/inc/schema.php`
   - `https://gestao.avcardetail.pt/uploads/`
3. Guardar a palavra-passe num gestor de palavras-passe.

## 8. Configurar (no CRM → Definições & dados)

- **Empresa**: morada, NIF, telefone real, email, IBAN, **link de avaliações do Google** (Perfil da Empresa no Google → *Pedir avaliações* → copiar link) e **link do Facebook** (página → *Avaliações*).
- **Aparência**: o logótipo já vem configurado na demonstração. Cor, tema e módulos ativos.
- **Finanças & operação**: regime de IVA (isenção art.º 53.º já ativo), custo/hora, custos fixos mensais, objetivo mensal.
- **Serviços & extras**: rever preços por tamanho e carregar **fotos reais** de cada serviço (aparecem no portal).
- **Utilizadores**: criar acessos para a equipa (perfil *Técnico* não vê finanças).
- Quando quiser começar com dados reais: **Dados & cópias → Remover dados de demonstração**.

## 9. Usar no telemóvel como app

Abra o CRM no telemóvel → Safari: *Partilhar → Adicionar ao ecrã principal* · Chrome/Android: *⋮ → Instalar aplicação*.

## 10. Portal do cliente

- Endereço público: `https://gestao.avcardetail.pt/portal.php` → colocar na **bio do Instagram**, no Google e no Facebook.
- Para cada cliente: ficha do cliente → **Portal** → *Enviar por WhatsApp* (link pessoal com histórico, ficha de intervenção, fotos, orçamentos e área “Avalie-nos”).

## 10.1 Carro 3D no site (opcional)

O banner (lavagem + cerâmico) e a animação PPF podem usar um **modelo 3D real** do carro em vez da ilustração.

1. Em **Definições → Mensagens & termos → Portal do cliente → Modelo 3D**, carregue um ficheiro **.glb**.
2. Use **apenas modelos com licença para uso comercial** — o crédito do autor é lido do ficheiro e aparece no rodapé do site.
3. Otimize o ficheiro antes (ideal ≤ 5 MB). Com Node.js instalado:
   `npx @gltf-transform/cli optimize original.glb otimizado.glb --compress meshopt --texture-compress webp --texture-size 1024 --palette false`
   (o `--palette false` mantém a pintura como material próprio, necessário para a sujidade, o cerâmico e o brilho/satin).
4. Se o PHP recusar o envio, aumente `upload_max_filesize` e `post_max_size` em **cPanel → Select PHP Version → Options**.
5. Sem modelo, em telemóveis com “poupança de dados” ou com animações reduzidas, o site mostra a ilustração vetorial.

O modelo de demonstração da AV Car Detail (Audi RS7) **não faz parte do pacote de revenda** — cada cliente carrega o seu.

## 11. Cópias de segurança

- **Automática do alojamento**: confirmar no cPanel que existem backups (*Backup* / *JetBackup*).
- **Da aplicação**: *Definições & dados → Dados & cópias → Descarregar cópia* (semanal). Guardar também a pasta `uploads/` (fotos).

## 12. Atualizar no futuro

Substituir todos os ficheiros **exceto** `config.php`, a pasta `data/` e a pasta `uploads/`. A base de dados atualiza-se sozinha no primeiro acesso.

---

### Problemas comuns

| Sintoma | Solução |
|---|---|
| Página branca / erro 500 | Versão do PHP < 8.0 → passo 4. Ver *cPanel → Errors* (registo de erros). |
| “Não foi possível escrever config.php” | Permissões da pasta raiz → 755. |
| Erro de ligação à base de dados | Confirmar nome completo `UTILIZADOR_avcrm` (com prefixo) e privilégios (passo 2). |
| Fotos não carregam | Pasta `uploads/` com permissões 755; limite de upload do PHP ≥ 8 MB (*Selecionar versão do PHP → Opções → upload_max_filesize*). |
| “Preencher pelo VIN” não responde | Ativar `curl` (passo 4). O resto da aplicação funciona sem ele. |
| Esqueci a palavra-passe | Outro administrador pode redefini-la em *Utilizadores*. Se for o único: pedir suporte (redefinição pela base de dados no phpMyAdmin). |
