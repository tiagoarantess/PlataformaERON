# Plataforma ERON

Plataforma do aluno da ERON: trilha de 4 faixas (amarela, verde, azul, roxa) até a faixa preta, XP, percentil, missão da semana, portfólio, painel dos pais e painel do professor.

Site estático: HTML, CSS e JavaScript puro. Não precisa de servidor, banco nem instalação.

## Como publicar no GitHub Pages

1. Os arquivos já estão na raiz deste repositório.
2. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, pasta `/ (root)`. Salve.
3. Em 1 ou 2 minutos o site fica em `https://SEU-USUARIO.github.io/plataforma-eron/`.

Pra testar no computador, é só abrir o `index.html` no navegador.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `index.html` | A casca da página (topo e abas). |
| `styles.css` | Visual, o mesmo do site Criadores do Futuro. |
| `data.js` | Regras do método: fases, checkpoints, tabela de XP, meta por fase, missões e a turma de exemplo. **É aqui que se mexe no conteúdo.** |
| `app.js` | As telas e a lógica (percentil, sequência, conquistas, checkpoint). |

## Telas

- `#/entrar` tela de entrada: comparação online x presencial (um par por vez) e login (aluno, pais ou professor). Os benefícios do flyer ficam na landing page.
- `#/aluno/ID/trilha` (trilha horizontal com as 5 faixas; embaixo, pontos (XP), aula atual e checkpoint, ao lado, o quadro "Faixas da trilha" F1 a FP; toque numa faixa pra ver o checkpoint dela), `/missao` (tarefas, envio do vídeo, conquista mais próxima), `/turma`, `/portfolio`: telas do aluno.
- `#/pais/ID`: painel da família.
- `#/professor`: registrar aula, dar XP, aprovar checkpoint, mandar recado, adicionar aluno, exportar e importar a turma.

## Regras que o código segue

- XP registra progresso. **Quem sobe de faixa é o checkpoint** (o exame de faixa), nunca o XP.
- Percentil compara só alunos da mesma faixa.
- Cada fase do plano de aulas é uma faixa: Fase 1 Amarela, Fase 2 Verde, Fase 3 Azul, Fase 4 Roxa. Depois do 4º checkpoint o aluno vira **faixa preta** e segue treinando.
- Tabela de XP: aula 10, desafio 20, documentar 15, fim de semana 10, ajudar colega 15, checkpoint 100. Meta de 400 por fase (`META_XP` em `data.js`).

## Limite desta versão

Os dados ficam salvos **no navegador de quem usa** (localStorage). Ou seja: o que o professor lança no computador dele não aparece sozinho no celular do aluno. Pra levar a turma de um aparelho pra outro, use **Exportar turma** e **Importar** no painel do professor.

O login é **simulado**: qualquer senha entra, e o usuário é o nome do aluno (ex.: `luna`) ou `professor`. Os botões de acesso rápido na tela de login entram direto. O botão do Google e o "Esqueci minha senha" só mostram aviso. A sessão fica no navegador (`eron-sessao`); pais e aluno só veem a própria página.

Ou seja, isso não protege nada: qualquer pessoa com o link entra. Antes de colocar alunos reais, o próximo passo é um backend com login (ex.: Firebase ou Supabase, os dois têm plano grátis).
