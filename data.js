/* Configuração da trilha e dados de exemplo.
   Tudo que é regra do método mora aqui: fases, checkpoints, tabela de XP e missões.
   Os alunos são fictícios. Troque pelos reais no painel do professor ou editando SEED. */

const FASES = [
  { id: 1, nome: 'Faixa Amarela', cor: 'yellow', aulas: 7, titulo: 'Projeta no simulador',
    resumo: 'Começa no 1º dia, sem esperar o kit. LED, botão, buzzer, sensor de luz e motor no Tinkercad.',
    checkpoint: 'Motores funcionando no simulador e na protoboard.' },
  { id: 2, nome: 'Faixa Verde', cor: 'green', aulas: 12, titulo: 'O robô ganha vida',
    resumo: 'O kit chega. Monta o chassi, liga a ponte H e faz o robô andar sozinho.',
    checkpoint: 'Motor no chassi e sensor de obstáculo funcionando.' },
  { id: 3, nome: 'Faixa Azul', cor: 'blue', aulas: 10, titulo: 'O robô pensa',
    resumo: 'Ultrassônico, máquina de estados e sensor de cor. O robô decide o que fazer.',
    checkpoint: 'Desviar, seguir linha e ler sinais no chão.' },
  { id: 4, nome: 'Faixa Roxa', cor: 'purple', aulas: 10, titulo: 'Missão de competição',
    resumo: 'Servo, garra e missão de busca e resgate, nos moldes do maior torneio do Brasil.',
    checkpoint: 'Pegar as bolinhas e levar pra área de resgate.' },
  { id: 5, nome: 'Faixa Preta', cor: 'belt', aulas: 0, titulo: 'Treina até o pódio',
    resumo: 'Segue treinando e se aperfeiçoando em desafios de competição.',
    checkpoint: 'Sem faixa seguinte. Marcos: primeira competição, primeira medalha.' }
];

/* Meta de XP por fase. Hoje é 400 em todas; a proposta 400/700/600/600 ainda está aberta. */
/* Tela de entrada: comparação online x presencial, um par por vez. Os benefícios do flyer ficam na landing page. */
const VANTAGENS = [
  { on: 'O kit chega na sua casa', onx: 'Dá pra continuar explorando no tempo livre', pre: 'O kit fica na escola', prex: 'Limita a exploração do aluno' },
  { on: 'O laboratório é a sua mesa', onx: 'Autonomia e responsabilidade pra organizar o próprio espaço', pre: 'O professor faz pelo aluno', prex: 'Quebra de autonomia' },
  { on: 'Aulas ao vivo pra tirar dúvidas', onx: 'Mentoria e acompanhamento individual', pre: 'Turma cheia', prex: 'Atenção dividida com vários alunos' },
  { on: 'Flexibilidade de horário', onx: 'Encaixa no melhor horário da rotina', pre: 'Horário fixo', prex: 'Difícil de encaixar na rotina' },
  { on: 'Evita deslocamento', onx: 'O tempo é dinheiro', pre: 'Trânsito e deslocamento', prex: 'Tempo perdido, estresse' },
  { on: 'Preço que só o online permite', onx: 'Preços acessíveis', pre: 'Estrutura física cara', prex: 'Preços elevados' }
];

const META_XP = { 1: 400, 2: 400, 3: 400, 4: 400, 5: 0 };

const ACOES = {
  aula:       { nome: 'Aula ao vivo',        xp: 10, curto: 'Aula' },
  desafio:    { nome: 'Desafio cumprido',    xp: 20, curto: 'Desafio' },
  documentar: { nome: 'Documentou o projeto', xp: 15, curto: 'Documentou' },
  fds:        { nome: 'Desafio de fim de semana', xp: 10, curto: 'Fim de semana' },
  ajudar:     { nome: 'Ajudou um colega',    xp: 15, curto: 'Ajudou' },
  checkpoint: { nome: 'Passou no checkpoint', xp: 100, curto: 'Checkpoint' }
};

/* Uma missão por semana. A tarefa aponta pra ação que dá o XP. */
const MISSOES = [
  { id: 'f1a1', fase: 1, aula: 1, titulo: 'Acender o primeiro LED no Tinkercad',
    tarefas: [['Assistir a aula ao vivo', 'aula'], ['Montar o circuito do LED piscando', 'desafio'], ['Mandar o link do circuito', 'documentar']] },
  { id: 'f1a2', fase: 1, aula: 2, titulo: 'Semáforo com 3 LEDs',
    tarefas: [['Assistir a aula ao vivo', 'aula'], ['Programar o ciclo verde, amarelo e vermelho', 'desafio'], ['Ajudar um colega no grupo', 'ajudar']] },
  { id: 'f1a3', fase: 1, aula: 3, titulo: 'Botão que liga e desliga',
    tarefas: [['Assistir a aula ao vivo', 'aula'], ['Usar variável de estado no botão', 'desafio'], ['Desafio de fim de semana: botão com 3 modos', 'fds']] },
  { id: 'f2a13', fase: 2, aula: 13, titulo: 'Faça o robô andar 2 metros em linha reta',
    tarefas: [['Assistir a aula ao vivo', 'aula'], ['Ajustar o PWM dos dois motores', 'desafio'], ['Gravar o vídeo do robô', 'documentar'], ['Ajudar um colega no grupo', 'ajudar']] },
  { id: 'f2a14', fase: 2, aula: 14, titulo: 'Ler a linha com um sensor TCRT5000',
    tarefas: [['Assistir a aula ao vivo', 'aula'], ['Mostrar no monitor serial o preto e o branco', 'desafio'], ['Desafio de fim de semana: pista de fita isolante', 'fds']] },
  { id: 'f3a23', fase: 3, aula: 23, titulo: 'Máquina de estados: decidir o que fazer',
    tarefas: [['Assistir a aula ao vivo', 'aula'], ['Desenhar os estados no papel', 'documentar'], ['Robô para, desvia e volta pra linha', 'desafio']] },
  { id: 'f4a33', fase: 4, aula: 33, titulo: 'Projetar a missão de resgate no papel',
    tarefas: [['Assistir a aula ao vivo', 'aula'], ['Desenhar o caminho até a área', 'documentar'], ['Garra pega e solta a bolinha 3 vezes', 'desafio']] },
  { id: 'f5t1', fase: 5, aula: 0, titulo: 'Treino de pista cronometrada',
    tarefas: [['Treino ao vivo com a equipe', 'aula'], ['Bater o próprio tempo na pista', 'desafio'], ['Ensinar um aluno da Fase 1', 'ajudar']] }
];

/* Turma fictícia. As datas são geradas a partir de hoje, então o exemplo nunca envelhece. */
const SEED = (function () {
  const hoje = new Date();
  const dia = n => { const d = new Date(hoje); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  function hist(semanas, ritmo) {
    const h = [];
    for (let s = semanas; s >= 0; s--) {
      h.push({ d: dia(s * 7 + 2), a: 'aula' });
      if (ritmo > 0) h.push({ d: dia(s * 7 + 1), a: 'desafio' });
      if (ritmo > 1 && s % 2 === 0) h.push({ d: dia(s * 7), a: 'documentar' });
      if (ritmo > 1 && s % 3 === 0) h.push({ d: dia(s * 7), a: 'ajudar' });
      if (ritmo > 2) h.push({ d: dia(s * 7 - 1 < 0 ? 0 : s * 7 - 1), a: 'fds' });
    }
    return h;
  }
  const aluno = (id, nome, idade, fase, semanas, ritmo, extra) => Object.assign({
    id, nome, idade, fase, hist: hist(semanas, ritmo), feitas: {}, videos: [], checkpoints: [], recados: []
  }, extra || {});
  return {
    turma: 'Turma fundadora · quinta 18h',
    proximoCheckpoint: dia(-8),
    alunos: [
      aluno('luna', 'Luna', 11, 2, 6, 3, {
        checkpoints: [{ fase: 1, d: dia(45), ok: true }],
        videos: [{ t: 'Robô seguindo linha, 1ª volta completa', d: dia(3), url: '' }, { t: 'Semáforo no Tinkercad', d: dia(60), url: '' }],
        recados: [{ d: dia(2), t: 'Ela ajudou dois colegas a calibrar o sensor essa semana. Checkpoint da Fase 2 marcado.' }],
        feitas: { f2a13: [0, 1] }
      }),
      aluno('caio', 'Caio', 12, 2, 6, 2, { checkpoints: [{ fase: 1, d: dia(44), ok: true }] }),
      aluno('bia', 'Bia', 10, 2, 5, 1, { checkpoints: [{ fase: 1, d: dia(40), ok: false }, { fase: 1, d: dia(33), ok: true }] }),
      aluno('theo', 'Theo', 9, 1, 4, 2),
      aluno('maya', 'Maya', 13, 1, 3, 1),
      aluno('davi', 'Davi', 14, 3, 7, 3, { checkpoints: [{ fase: 1, d: dia(120), ok: true }, { fase: 2, d: dia(50), ok: true }] })
    ]
  };
})();
