# LiDire MVP 1.0 — Cloudflare Worker (upload pela raiz)

Esta versão foi preparada para o fluxo em que os arquivos são enviados individualmente para a raiz de um repositório GitHub pelo celular.

## Importante
É um MVP funcional de navegação e operações básicas, não uma versão comercial final. A interface e os módulos principais funcionam imediatamente usando armazenamento local do navegador. O Worker já possui endpoint de saúde e estrutura para D1.

## Por que não há pastas?
O projeto foi propositalmente concentrado em `index.js` para evitar o problema de upload de diretórios pelo GitHub mobile.

## Arquivos
- `index.js` — Worker + interface do MVP em um único arquivo
- `schema.sql` — estrutura inicial do D1
- `logo-lidire-oficial.png` — logo oficial fornecido, sem redesign
- `wrangler.toml` — configuração do Worker
- `PROMPT_PARA_DESENVOLVER_MVP.md` — especificação funcional/visual
- `REFERENCIAS_VISUAIS.md` — referências visuais

## Deploy
No Cloudflare Workers, use:
`npx wrangler deploy`

O painel também pode executar esse comando automaticamente a partir do GitHub.

## D1
Depois do primeiro deploy, crie o banco D1 no Cloudflare e então adicione ao `wrangler.toml` o bloco `d1_databases` com o `database_id` real. Em seguida, execute o `schema.sql` no banco remoto e faça novo deploy.

## Identidade visual
Tema escuro navy; gradiente roxo → azul → ciano; Poppins/Inter como referência tipográfica; logo oficial sem alteração.
