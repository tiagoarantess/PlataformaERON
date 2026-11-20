# Plataforma ERON

Plataforma da ERON: trilha de 4 faixas (amarela, verde, azul, roxa) até a faixa preta, XP, percentil, missão da semana, portfólio, painel dos pais, painel do professor e a **Oficina 3D do Creator** (o robô de cada uma das 48 semanas do plano).

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
| `oficina.js` / `oficina.css` | Robô semana a semana em 3D (Three.js + GSAP pelo CDN), na página de entrada. |
| `logo-eron.png` | Logo usado no adesivo do chassi e da caixa no 3D. |

## Telas

- `#/entrar` tela de entrada: comparação online x presencial (um par por vez) e login (aluno, pais ou professor). Os benefícios do flyer ficam na landing page.
- `#/aluno/ID/trilha` (trilha horizontal com as 5 faixas; embaixo, pontos (XP), aula atual e checkpoint, ao lado, o quadro "Faixas da trilha" F1 a FP; toque numa faixa pra ver o checkpoint dela), `/missao` (tarefas, envio do vídeo, conquista mais próxima), `/turma`, `/portfolio`: telas do aluno.
- `#/entrar` também mostra, rolando pra baixo depois dos diferenciais, o robô do Creator semana a semana em 3D (as 48 semanas, aberto pra quem visita).
- `#/pais/ID`: painel da família (faixa, XP, percentil, presença).
- `#/professor/aulas`: o professor edita nome, conteúdo, desafio, material e XP de cada uma das 48 aulas (fica em `S.aulas`, por cima do `PLANO` de `data.js`) e sobe exemplos reais da competição. O 3D da entrada mostra a versão editada.
- Faixa Preta no 3D: pista de linha e arena de resgate são cenas separadas (botões na própria cena). Modelos 3D são ilustrativos.
- `#/professor`: registrar aula, dar XP, aprovar checkpoint, mandar recado, adicionar aluno, exportar e importar a turma.

## Regras que o código segue

- XP registra progresso. **Quem sobe de faixa é o checkpoint** (o exame de faixa), nunca o XP.
- Percentil compara só alunos da mesma faixa.
- Cada fase do plano de aulas é uma faixa: Fase 1 Amarela, Fase 2 Verde, Fase 3 Azul, Fase 4 Roxa. Depois do 4º checkpoint o aluno vira **faixa preta** e segue treinando.
- Tabela de XP: aula 10, desafio 20, documentar 15, fim de semana 10, ajudar colega 15, foto do kit organizado até 1h depois da aula 10 (a partir da Fase 2, quando o kit chega), checkpoint 100. Meta de 400 por fase (`META_XP` em `data.js`).

## Login e dados (Firebase, plano grátis)

- Projeto Firebase: `plataforma-eron` (conta Google do Tiago). Login por e-mail/senha ou Google. Banco Firestore em São Paulo.
- **Só entra quem o professor liberou**: no painel do professor, card "Acessos", coloque o e-mail do responsável e escolha o Creator. Isso cria `acessos/{email}` no banco.
- A família entra em "Primeiro acesso", cria a senha com esse e-mail e confirma pelo link que chega no e-mail (ou usa "Entrar com Google" se for Gmail). Sem e-mail confirmado e liberado, o banco não entrega nada.
- Quem barra estranho são as **regras do banco** (`firestore.rules`, publicadas em Firebase > Firestore > Regras). Mudou o arquivo, cole lá e publique.
- `firebase-config.js` tem o endereço do projeto. Não é senha: essa chave é pública por natureza.
- Professor novo: libere o e-mail dele com "Quem é: Professor".

### Como a pessoa se matricula
1. Site → "Agendar avaliação de perfil" (gratuita, cai no WhatsApp).
2. Avaliação + conversa com o professor, escolhe o plano.
3. Paga e assina o contrato.
4. Professor cadastra o Creator e libera o e-mail do responsável no painel; manda a mensagem de boas-vindas (botão pronto no painel).
5. Família cria a senha e entra.

## Limites desta versão

- A família consegue marcar as tarefas da missão do próprio filho (dá XP), como antes. O resto (faixa, checkpoint, recados) só o professor muda.
- A turma vê nome e XP dos colegas (é o ranking). Recados do professor só a família do Creator vê.
