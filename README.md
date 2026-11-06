# Vroom.pt — análise de importação de carros

Aplicação web privada para encontrar carros em **França** (principalmente), **Espanha, Alemanha e Países Baixos**, calcular quanto custa cada um posto na estrada em **Portugal** e acompanhá-lo da pré-seleção até à venda.

Segue os 9 passos da folha de cálculo *Vroom.Pt*:

| Passo | Na aplicação |
|---|---|
| 1 · Alvos (5–15 anos, < 2000 cm³, < 150 g/km, vendedores profissionais) | Criador de pesquisas no leboncoin, etiqueta "Alvo ISV baixo", filtros |
| 2 · Preço médio em Portugal | Separador **Mercado PT**: comparáveis do StandVirtual / OLX → mais baixo / mais alto / alvo |
| 3 · Escolha principal (pesos 5/5/35/20/35) | **Comparar e pontuar** |
| 4 · ISV | Calculado automaticamente (tabelas 2026, desconto por idade UE, partículas, plug-in) |
| 5 · Ida | Voos + deslocações por país |
| 6 · Compra | Seguro temporário, matrícula temporária, COC, relatório de histórico |
| 7 · Vinda | Distância do local do anúncio até ao Porto × consumo × preço do combustível + portagens + dormidas, ou transportadora |
| 8 · Legalização | Inspeção, homologação, chapas, registo, agência, IUC + lista de tarefas e prazos legais (DAV 20 dias úteis, ISV 10, DUA 30 dias, registo 60 dias) |
| 9 · Venda | Cenários conservador / médio / alto, preço real de venda, lucro % |
| Balanço de despesas | **Despesas** por carro + saldo entre sócios (quem deve a quem) |

Cada carro tem ainda uma **checklist do processo completo** (separador *Processo (checklist)*), igual ao *Esquema de Execução*: Aquisição → Transporte (ramo estrada ou transportadora) → Legalização (ramo com/sem COC) → Preparação (com fornecedores) → Venda (marketing, comercial, legal, financeiro) → Custos e lucros. O progresso e o próximo passo aparecem no quadro *Processo* e no início. O separador *Venda e retoma* mostra a divisão do lucro (20% caixa, 80% pelos sócios) e avalia retomas (referência −30% na compra, média −10% na revenda).

As fórmulas do ISV e do IUC foram validadas com a folha de cálculo (1968 cm³ · 119 g/km NEDC gasóleo → ISV 2 830,86 €, IUC 241,50 €). Confirme sempre o ISV final na DAV.

## Como entram os anúncios

O leboncoin protege-se contra robôs (DataDome), por isso um servidor recebe normalmente **HTTP 403**. Há quatro formas:

1. **Marcador / bookmarklet (recomendado).** Página *Importar anúncios* → arraste *Enviar para o Vroom.pt* para a barra de marcadores. Em qualquer página de resultados ou de anúncio do leboncoin, carregue nele: todos os carros da página são importados a partir do **seu** navegador. Também funciona no AutoScout24, mobile.de, coches.net e Marktplaats (dados schema.org).
2. **Colar o código-fonte** da página (Ctrl+U → copiar tudo → colar).
3. **Obter pelo servidor** um URL do leboncoin: tenta um pedido direto e depois o [Firecrawl](https://firecrawl.dev), se `FIRECRAWL_API_KEY` estiver configurada.
4. **Introdução manual**, ou **calculadora** → *Guardar como negócio*.

Voltar a importar o mesmo anúncio atualiza-o e regista as descidas de preço.

O CO2 e a cilindrada raramente vêm estruturados no leboncoin. A aplicação tenta lê-los da descrição (marcado *estim.* quando deduzido de "1.5 dCi"); caso contrário, peça ao vendedor o COC / carte grise (V.7 = CO2, P.1 = cm³).

Linha de comandos (também para cron):

```bash
npm run fetch -- "https://www.leboncoin.fr/recherche?category=2&owner_type=pro&regdate=2011-2021"
npm run fetch -- --list data/searches.txt
npm run fetch -- --file pagina-guardada.html
```

## Correr localmente

Requer Node.js 18.17 ou superior. Não tem dependências, por isso não é preciso `npm install`.

```bash
npm start            # http://localhost:3000
npm test
```

A configuração está em `.env` (ver `.env.example`): `APP_PASSWORD`, `SESSION_SECRET`, `BASE_PATH`, `DATA_DIR`, `FIRECRAWL_API_KEY`.

Todos os dados ficam em `data/db.json`. Em Definições → *Descarregar cópia* exporta tudo.

## Instalar no cPanel

Ver [DEPLOY-CPANEL.md](DEPLOY-CPANEL.md).

## Estrutura

```
app.js               servidor HTTP + API (sem dependências)
server.cjs           ficheiro de arranque para cPanel/Passenger (carrega app.js)
src/tax.js           ISV + IUC 2026
src/costs.js         modelo de custos, pontuação, prazos, retomas, capital (partilhado com o navegador)
src/process.js       checklist do Esquema de Execução
src/leboncoin.js     obtenção/leitura do leboncoin + criador de URL de pesquisa
src/generic.js       leitor schema.org JSON-LD para outros portais
src/store.js         armazenamento em ficheiro JSON
public/              interface, login, ponte do marcador
bin/                 linha de comandos e script de empacotamento
test/                testes (node:test)
```
