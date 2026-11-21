# CODEMAP: Plataforma ERON

Mapa rápido de onde está cada coisa. Site estático (HTML + CSS + JS puro), roteamento por `#hash`, login e dados no Firebase (Auth + Firestore).

## Arquivos

| Arquivo | O que tem | Mexe quando |
|---|---|---|
| `nuvem.js` | Firebase: login, liberação por `acessos/{email}`, espelho banco <-> estado `S` (`salvar` grava só o que mudou). | Mudou login ou estrutura do banco. |
| `firebase-config.js` | Endereço do projeto Firebase (público). | Trocou de projeto. |
| `firestore.rules` | Regras de segurança do banco (cópia do que está publicado). | Mudou quem pode ler/escrever. |
| `index.html` | Casca: topo, abas, `<div id="app">`, scripts. | Raro. |
| `data.js` | Regras do método: `FASES` (faixas), `PLANO` (48 semanas), `VANTAGENS`, `META_XP`, `ACOES` (tabela de XP), `MISSOES`, `SEED` (turma de exemplo). | Mudou conteúdo, XP ou faixa. |
| `app.js` | Telas e lógica. | Mudou tela ou regra de cálculo. |
| `oficina.js` / `oficina.css` | Robô 3D semana a semana (Three.js + GSAP via CDN), na tela de entrada. | Mudou robô, pista ou sensor. |
| `styles.css` | Visual (mesma paleta da landing). | Mudou visual. |
| `logo-eron.png` | Adesivo no chassi e na caixa do 3D. | — |
| `README.md` | Como publicar no GitHub Pages e regras gerais. | — |

## Funções principais em `app.js`

| Função | Linha aprox. | Faz |
|---|---|---|
| `vazio` / `save` | 14 / 16 | Estado `S` vazio; `save` manda pro banco via `NUVEM.salvar`. |
| `sequencia`, `percentil`, `xpSemanas` | 31-43 | Sequência de semanas, percentil dentro da mesma faixa, XP por semana. |
| `missaoAtual`, `conquistas`, `proximaConquista` | 48-64 | Missão da semana e conquistas. |
| `registrar`, `checkpoint` | 78 / 81 | Dá XP por ação; aprova exame de faixa (único jeito de subir de faixa). |
| `oficina` | 100 | Liga a Oficina 3D. |
| `aoMudarLogin`, `sair`, `render` | 115-150 | Sessão Firebase (estados: fora, verificar, sem-acesso, dentro) e roteador. |
| `telaLogin` | 161 | `#/entrar`: comparação, login Creator/Pais/Professor, 3D abaixo. |
| `telaAluno` | 229 | `#/aluno/ID/trilha`, `/missao`, `/turma`, `/portfolio`. |
| `telaPais` | 365 | `#/pais/ID`: faixa, XP, percentil, presença. |
| `telaProfAulas` | 412 | `#/professor/aulas`: edita as 48 aulas (salva em `S.aulas`). |
| `telaProfessor` | 459 | `#/professor`: registrar aula, dar XP, aprovar checkpoint, importar/exportar turma. |

## Regras que o código segue

- XP registra progresso; **quem promove é o checkpoint**, nunca o XP.
- Percentil compara só alunos da mesma faixa.
- Faixas: Amarela, Verde, Azul, Roxa, Preta. Aluno = Creator.
- A landing (`tiagoarantess/escola-de-robotica-online`, pasta `kit/`) tem uma cópia de `oficina.js`, `oficina.css` e `data.js`. Mudou aqui, copiar lá.

## Próximos passos conhecidos

- PWA (instalar no celular).
- Banco: `acessos/{email}` (papel professor|familia, aluno), `turma/config`, `turma/midia`, `alunos/{id}`, `recados/{id}`.
