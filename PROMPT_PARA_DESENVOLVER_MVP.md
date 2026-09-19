
# PROMPT — LiDire MVP 1.0 no Cloudflare

Você é responsável por transformar este projeto em um MVP 1.0 REAL e funcional da LiDire.

## 1. IDENTIDADE
Nome: LiDire
Nome discreto complementar: LiDire - Life Director
Slogan: Seu Copiloto para a Vida
Frase principal: A LiDire resolve.
Hero conceitual: Organize sua rotina. Viva melhor.

Use EXATAMENTE o logotipo oficial fornecido em:
`/public/assets/logo-lidire-oficial.png`

Não redesenhe, recrie, estilize, vetorize, substitua ou altere o logotipo.

## 2. REFERÊNCIAS VISUAIS
As imagens anexadas à solicitação são referências visuais da Landing Page e devem orientar o produto:
- estética dark premium;
- fundo navy profundo;
- cards em azul-marinho;
- gradientes roxo → azul → ciano;
- pequenos acentos em ciano, azul, roxo e rosa;
- bordas arredondadas;
- sombras e glow discretos;
- visual moderno, limpo e tecnológico;
- bastante espaço visual;
- hierarquia tipográfica forte;
- interface mobile-first.

A tela do aplicativo deve parecer parte da mesma família visual da Landing Page, mas NÃO deve simplesmente copiar as imagens. Construa componentes reais e funcionais.

## 3. FONTES PADRONIZADAS
- Poppins: títulos, marca, grandes chamadas.
- Inter: corpo, labels, menus, números, formulários e componentes.
Use pesos 400, 500, 600 e 700 conforme necessidade.

## 4. PALETA PADRONIZADA
Base:
- Navy profundo: #070C22
- Navy secundário: #0B1230
- Card: #101A3B / #141F47
- Texto principal: #F7F8FF
- Texto secundário: #A9B0CA

Gradiente principal:
- Roxo: #7B2CFF
- Azul: #2E75FF
- Ciano: #12D9D2

Acentos:
- Rosa: #E91E9B
- Usar branco para contraste.

Não introduza uma nova paleta sem necessidade.

## 5. OBJETIVO DO PRODUTO
A LiDire reúne em um só lugar informações importantes da vida do usuário para reduzir a carga mental e ajudar a pessoa a saber o que precisa fazer.

O produto deve transmitir:
- menos coisas para lembrar;
- mais clareza;
- organização;
- visão do dia;
- integração entre áreas da vida;
- compartilhamento familiar.

## 6. HOME / MEU DIA
Ao abrir:
“Bom dia, [Nome]! ☀️”
Mostrar:
- compromissos do dia;
- tarefas;
- estudos;
- treino;
- hidratação;
- compras;
- lembretes;
- objetivos relevantes.

Criar um bloco “Insight da LiDire”.

Exemplo:
“Seu dia está organizado.”
“Você tem 2 compromissos, 3 tarefas, treino às 18h e 4 itens na lista de compras.”

## 7. AUTENTICAÇÃO
Implementar:
- cadastro;
- login;
- recuperação de senha;
- logout;
- sessão segura;
- nome completo;
- e-mail;
- senha.

Não armazenar senha em localStorage.
Usar servidor/Worker para autenticação.

## 8. PERFIL
Campos:
- nome completo;
- idade;
- e-mail;
- telefone.

Usuário pode editar.

## 9. AGENDA
Compromissos são diferentes de tarefas.

CRUD:
- criar;
- editar;
- excluir;
- título;
- descrição;
- data;
- início;
- fim;
- local;
- categoria.

Mostrar calendário/timeline.

Detectar conflitos simples e apresentar sugestão de remanejamento.

## 10. TAREFAS
CRUD:
- título;
- descrição;
- data;
- horário opcional;
- conclusão.

Mostrar na Home e no resumo.

## 11. LEMBRETES
CRUD:
- título;
- data;
- horário;
- conclusão.

Mostrar na Home/Agenda.

## 12. LISTA DE COMPRAS
Permitir:
- criar lista;
- nome da lista;
- item;
- quantidade;
- editar;
- excluir;
- concluir;
- melhor dia;
- limite de gastos.

Preparar estrutura para compartilhamento familiar.

## 13. HIDRATAÇÃO
Permitir:
- definir meta diária;
- registrar quantidade ingerida;
- visualizar progresso;
- visualizar quanto falta;
- separar por data.

## 14. ESTUDOS
Permitir:
- criar/editar/excluir disciplinas;
- criar assuntos/atividades;
- horário;
- marcar como concluído;
- anotações;
- bibliografia;
- pesquisar bibliografia redirecionando para Google;
- pendências;
- progresso.

## 15. TREINOS
Permitir:
- criar/editar treino;
- nome;
- exercícios;
- séries;
- repetições;
- carga;
- meta de repetições;
- repetições executadas;
- conclusão;
- vídeo demonstrativo por URL;
- histórico/progresso básico.

## 16. FINANÇAS
MVP simples, mas funcional:
- receitas;
- despesas;
- saldo;
- categorias;
- transações;
- gráfico/resumo;
- objetivos;
- reserva;
- investimentos.

Despesas fixas:
- nome;
- valor;
- dia de vencimento;
- editar;
- excluir;
- marcar como paga.

## 17. OBJETIVOS
Um objetivo deve combinar:
- nome;
- descrição;
- prazo;
- meta financeira opcional;
- valor acumulado;
- tarefas relacionadas;
- progresso.

Exemplo:
“Viajar para o México nas próximas férias.”
Meta: juntar R$ 30.000 até a data definida.
Progresso visual.

## 18. RESUMO DIÁRIO
Mostrar:
- compromissos;
- tarefas;
- treino;
- estudos;
- lembretes;
- hidratação;
- compras;
- outras atividades relevantes.

## 19. RESUMO SEMANAL
Mostrar:
- % de tarefas concluídas;
- quantidade de treinos;
- horas/minutos de estudo;
- % da meta de hidratação;
- situação financeira resumida;
- pendências importantes.

## 20. ASSISTENTE LiDire
Primeira versão:
- regras simples;
- sugestões baseadas nos dados;
- sem depender obrigatoriamente de IA externa.

Exemplos:
“Você tem um conflito de horários.”
“Há tarefas pendentes para hoje.”
“Seu treino está próximo.”
“Você ainda não atingiu sua meta de hidratação.”

Estruturar o código para permitir integração futura com IA.

## 21. FAMÍLIA
A família é parte importante da proposta.

Permitir estrutura para:
- criar grupo familiar;
- convidar membro;
- definir papel/permissão;
- compartilhar compromissos;
- compartilhar listas de compras;
- compartilhar treinos;
- compartilhar estudos;
- compartilhar outras informações da rotina.

Um compromisso criado por uma pessoa pode fazer parte da rotina da família, conforme a permissão.

## 22. NAVEGAÇÃO
Navegação inferior:
- Início
- Agenda
- Assistente
- Explorar
- Perfil

Em Explorar:
- Compras
- Estudos
- Treinos
- Finanças
- Hidratação
- Objetivos
- Família
- Configurações

## 23. BANCO
Usar Cloudflare D1.

Cada dado deve possuir relação com o usuário.
Nunca retornar dados de outro usuário.
Usar queries parametrizadas.
Validar entrada no servidor.

## 24. TECNOLOGIA CLOUDFLARE
Preferir Cloudflare Workers para o app full-stack, com Assets para frontend e D1 para banco.

O Cloudflare informa atualmente que Workers é a plataforma principal para novos projetos e suporta aplicações full-stack; D1 pode ser ligado por binding ao Worker.

## 25. RESPONSIVIDADE
Prioridade:
1. celular;
2. tablet;
3. desktop.

O aplicativo deve funcionar bem em telas pequenas.

## 26. O QUE NÃO FAZER
- Não criar telas estáticas sem funcionalidade.
- Não usar imagens como substitutas de botões ou formulários.
- Não copiar literalmente os mockups.
- Não trocar a logo oficial.
- Não usar outra paleta sem justificativa.
- Não guardar senha no navegador.
- Não misturar dados de usuários.
- Não inventar funcionalidades fora do escopo sem registrar como “futuro”.

## 27. ORDEM DE IMPLEMENTAÇÃO
Fase 1:
autenticação + perfil + banco.

Fase 2:
Home + tarefas + agenda + lembretes.

Fase 3:
compras + hidratação + estudos + treinos.

Fase 4:
finanças + objetivos + resumo diário/semanal.

Fase 5:
assistente + família.

Fase 6:
testes, segurança, responsividade e auditoria.

## 28. CRITÉRIO DE ACEITE
O MVP 1.0 só pode ser considerado pronto quando:
- os dados persistirem;
- o usuário puder sair e voltar sem perder dados;
- os CRUDs prioritários funcionarem;
- autenticação estiver funcional;
- autorização estiver correta;
- família respeitar permissões;
- layout estiver consistente com a identidade visual;
- mobile estiver bem resolvido;
- erros e estados vazios estiverem tratados;
- dependências/licenças estiverem documentadas.

## 29. DOCUMENTAÇÃO
Ao terminar, gerar:
- arquitetura;
- lista de tecnologias;
- dependências;
- licenças;
- banco/esquema;
- endpoints;
- instruções de deploy;
- variáveis/secrets necessários;
- versão do MVP;
- changelog.

Não declarar “MVP pronto” se qualquer requisito crítico acima ainda estiver somente como mockup.
