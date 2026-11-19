# DetailPro — CRM e portal de clientes para empresas de detailing

Aplicação web em **PT-PT** para gerir uma empresa de detailing automóvel: CRM, marcações, quadro de trabalhos, orçamentos, recebimentos, lucro por trabalho, stock, equipamentos, garantias cerâmicas e relatórios — mais um **portal público** onde os clientes veem os serviços, pedem marcações e acompanham as intervenções no seu carro.

- PHP 8 + MySQL/MariaDB (ou SQLite) — instala em qualquer alojamento **cPanel**.
- Sem frameworks nem dependências: JavaScript simples, sem build.
- Tema escuro com glassmorphism (preto e vermelho), modo claro opcional, otimizado para telemóvel (PWA: "Adicionar ao ecrã principal").
- **White-label**: nome da aplicação, logótipo, cor, módulos e textos configuráveis por cliente — pronto para revenda.

---

## Instalação no cPanel

1. **Base de dados**: em *cPanel → Bases de dados MySQL*, crie uma base de dados e um utilizador, e dê-lhe **todos os privilégios** sobre essa base de dados.
2. **Ficheiros**: em *Gestor de ficheiros*, carregue o conteúdo desta pasta (ex.: para `public_html/gestao/`) e extraia.
3. **Permissões**: as pastas `uploads/` e `data/` e a pasta raiz da aplicação têm de permitir escrita (normalmente 755 já basta).
4. **PHP**: em *Selecionar versão do PHP*, escolha PHP 8.1 ou superior, com as extensões `pdo_mysql` (ou `pdo_sqlite`) ativas.
5. Abra `https://o-seu-dominio.pt/gestao/install.php`, preencha os dados da base de dados, da empresa e do administrador. Pode também carregar **dados de demonstração**.
6. Depois de instalar, **apague o `install.php`** do servidor.
7. Ative o SSL (AutoSSL) e descomente as linhas de *Forçar HTTPS* no `.htaccess`.

| Endereço | Para quê |
|---|---|
| `/gestao/` | CRM (equipa, com login) |
| `/gestao/portal.php` | Portal público de clientes (pode pôr o link no Instagram / Google) |
| `/gestao/portal.php?t=…` | Área pessoal de cada cliente (o link é gerado na ficha do cliente) |

### Atualizar para uma nova versão
Substitua todos os ficheiros **exceto** `config.php`, `data/` e `uploads/`. As tabelas são migradas automaticamente no primeiro acesso.

### Cópias de segurança
Em *Administração → Cópias de segurança* descarregue um JSON com todos os dados. Inclua também a pasta `uploads/` (fotos) nos backups do cPanel.

---

## Revenda / white-label

- **Uma instalação por cliente** (recomendado): uma pasta ou subdomínio por empresa, cada uma com o seu `config.php`.
- **Várias empresas na mesma base de dados**: use um **prefixo de tabelas** diferente para cada uma no instalador (`cli1_`, `cli2_`…).
- Por cliente, em *Definições*: nome da aplicação, logótipo, cor principal, tema por defeito, módulos ativos, prefixos de documentos, textos do orçamento, condições da garantia e do portal.
- Por omissão no `config.php`: `app_name`, `brand_color`, `timezone`.
- Para mudar o nome do produto para todos os clientes, altere `app_name` no `config.sample.php`/instalador e o `assets/icon.svg`.

---

## Módulos

**Painel** — centro de comando (resumo do dia, ações rápidas, KPIs, gráfico de 12 meses, pipeline, alertas), agenda (mês/semana/dia/lista, folha do dia), quadro kanban com cronómetros, rota do dia, lembretes & follow-ups com textos prontos (WhatsApp/SMS/Email).

**Clientes** — CRM (etiquetas, visitas, total gasto, em dívida, faltas), veículos, leads, subscrições (MRR, visitas incluídas/usadas), avaliações & referências.

**Vendas** — orçamentos (construtor com serviços do catálogo, preço por tamanho, deslocação, desconto %/€, IVA, folha para o cliente em PDF), faturação & recebimentos (pagamentos parciais, sinais creditados automaticamente, gorjetas), serviços & extras (preços por tipo de veículo, o que inclui, fotos para o portal), garantias cerâmicas (certificado com plano de manutenção), modelos de mensagem.

**Operação** — trabalhos & lucro (checklist, fotos antes/depois, box, técnico, cronologia de estados, cronómetro, ordem de trabalho, guia de saída, exportação antes/depois para Instagram), marcações (avisos de conflito, sinal), fichas de inspeção (mapa de danos tocável, assinatura do cliente que bloqueia o registo), equipa.

**Custos & stock** — despesas, quilómetros, inventário (alertas de stock, custo por utilização), equipamentos (manutenção preventiva), marketing (ROI, custo por cliente).

**Ferramentas** — calculadora de preços, calculadora de custo de químicos, relatórios (resultados, fluxo de caixa, por serviço/técnico/origem/cliente/mês), guia de início.

### Cálculos automáticos
Receita, lucro bruto, lucro operacional, lucro por trabalho e por hora, ticket médio, valores por receber, conversão de leads e de orçamentos, taxa de clientes recorrentes, receita recorrente mensal (MRR), reserva para impostos, custos de deslocação e de químicos, alertas de stock, manutenção de equipamentos e de garantias.

### Perfis de utilizador
- **Administrador** — tudo.
- **Gestor** — tudo exceto definições, utilizadores e cópias de segurança.
- **Técnico** — agenda, marcações, quadro, trabalhos, inspeções, clientes, veículos, stock e equipamentos (sem finanças).

---

## Notas legais (Portugal)
- O módulo de faturação é um **controlo interno de recebimentos**. As faturas legais devem ser emitidas em **software certificado pela AT**; registe aqui o número dessa fatura.
- O portal pede consentimento RGPD nos pedidos de contacto. Os links pessoais do portal podem ser regenerados a qualquer momento (o anterior deixa de funcionar).

## Estrutura
```
index.php        CRM (SPA)          portal.php     Portal público
api.php          API JSON           install.php    Instalador
inc/             esquema, cálculos, dados iniciais (protegido por .htaccess)
assets/          app.js, app.css, portal.js, portal.css, ícone
data/            SQLite (protegido)  uploads/      fotos (protegido, servidas via API com sessão)
```
