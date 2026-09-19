
# LiDire — Versão Comercial 1.0 — Cloudflare

## Objetivo
Starter do MVP 1.0 da LiDire, com interface mobile-first inspirada nas referências visuais fornecidas pela fundadora e uma base Cloudflare Workers + D1 para evolução para um aplicativo realmente funcional.

**Importante:** este ZIP é uma base inicial de implementação. Não deve ser tratado como o MVP comercial final sem concluir autenticação, CRUD completo, autorização por usuário, testes, LGPD/privacidade, auditoria de dependências e revisão de segurança.

## Identidade visual obrigatória
- Logo oficial: `./assets/logo-lidire-oficial.png`. Não redesenhar, substituir ou alterar a arte.
- Tipografia: Poppins para títulos/marca e Inter para textos/interface.
- Tela escura como padrão.
- Fundo navy profundo.
- Cards azul-marinho escuros.
- Gradiente principal: roxo → azul → ciano.
- Destaques pontuais em ciano, azul, roxo e rosa.
- Bordas arredondadas, brilho/glow discreto, profundidade e aparência premium.
- Idioma: português do Brasil.
- Mobile-first.
- Manter coerência com as imagens de referência da Landing Page fornecidas pela fundadora.

## Princípios do produto
“Seu Copiloto para a Vida.”
“A LiDire resolve.”
“Organize sua rotina. Viva melhor.”
“Menos coisas para lembrar. Mais clareza para viver.”

## Módulos previstos no MVP 1.0
1. Home / Meu Dia
2. Cadastro, login, recuperação de senha e logout
3. Perfil editável
4. Agenda/compromissos
5. Tarefas
6. Lembretes
7. Lista de compras
8. Hidratação
9. Estudos
10. Treinos
11. Finanças
12. Objetivos
13. Resumo diário
14. Resumo semanal
15. Assistente LiDire (primeira versão baseada em regras; arquitetura pronta para IA)
16. Família e compartilhamento

## Banco de dados
O `schema.sql` já inclui as entidades principais. Use Cloudflare D1. A documentação atual do Cloudflare confirma que D1 é o banco SQL serverless nativo e pode ser ligado a Workers por binding `env.DB`. 

## Como publicar
1. Crie um projeto Cloudflare Workers.
2. Crie um banco D1 chamado `lidire-mvp`.
3. Substitua `COLOQUE_O_DATABASE_ID_AQUI` pelo ID real no `wrangler.toml`.
4. Execute o schema no D1.
5. Faça deploy do Worker.
6. Configure o domínio/subdomínio.
7. Depois continue a implementação dos endpoints de autenticação e CRUD.

### CLI
```bash
npx wrangler d1 create lidire-mvp
npx wrangler d1 execute lidire-mvp --remote --file=./schema.sql
npx wrangler deploy
```

## Arquitetura recomendada
Frontend: assets em `./`
Backend/API: `index.js`
Banco: Cloudflare D1
Autenticação: sessão segura via Worker, com cookies HttpOnly/Secure/SameSite e hash de senha no servidor.
Não guardar senhas em localStorage.

## Critérios de conclusão do MVP
- Usuário consegue criar conta e entrar.
- Cada usuário só acessa seus próprios dados.
- Dados persistem no D1.
- Fechar/reabrir o app não perde dados.
- CRUD funcional para os módulos prioritários.
- Família possui autorização e compartilhamento controlado.
- Erros e estados vazios tratados.
- Responsivo em celular.
- Segurança básica revisada.
- Dependências e licenças auditadas.


## Versão comercial
Este pacote é a base técnica da versão comercial do LiDire, preparada para Cloudflare Workers + Static Assets + D1. Ele deve ser tratado como o projeto oficial da versão comercial 1.0. Antes de colocar o aplicativo em produção para usuários pagantes, complete e valide autenticação, autorização, CRUD dos módulos, isolamento de dados por usuário/família, tratamento de erros, segurança, testes, observabilidade e fluxos de publicação.

## Estrutura para upload no GitHub
Todos os arquivos estão em uma única pasta e não existem subpastas obrigatórias. No GitHub, envie os arquivos contidos nesta pasta para a raiz do repositório do projeto.

## Importante sobre arquivos públicos
O projeto usa `.assetsignore` para impedir que `index.js`, `wrangler.toml`, `schema.sql` e a documentação sejam publicados como arquivos estáticos.

## D1
Antes do deploy final, crie o banco D1 e substitua `COLOQUE_O_DATABASE_ID_AQUI` no `wrangler.toml` pelo ID real do banco. Depois aplique o `schema.sql` ao banco.
