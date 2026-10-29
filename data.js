/* Configuração da trilha e dados de exemplo.
   Tudo que é regra do método mora aqui: fases, checkpoints, tabela de XP e missões.
   Os alunos são fictícios. Troque pelos reais no painel do professor ou editando SEED.
   semana = em que semana do plano de 48 o Creator está (a Oficina 3D abre até ela). */

const FASES = [
  { id: 1, nome: 'Faixa Amarela', cor: 'yellow', aulas: 8, ini: 1, fim: 8, titulo: 'Projeta no simulador',
    resumo: 'Começa no 1º dia, sem esperar o kit. LED, botão, buzzer, sensor de luz e motor no Tinkercad.',
    checkpoint: 'Motores funcionando no simulador e na protoboard.' },
  { id: 2, nome: 'Faixa Verde', cor: 'green', aulas: 12, ini: 9, fim: 20, titulo: 'O robô ganha vida',
    resumo: 'O kit chega. Monta o chassi, liga a ponte H e faz o robô andar sozinho.',
    checkpoint: 'Motor no chassi e sensor de obstáculo funcionando.' },
  { id: 3, nome: 'Faixa Azul', cor: 'blue', aulas: 13, ini: 21, fim: 33, titulo: 'O robô pensa',
    resumo: 'Ultrassônico, máquina de estados e sensor de cor. O robô decide o que fazer.',
    checkpoint: 'Desviar, seguir linha e ler sinais no chão.' },
  { id: 4, nome: 'Faixa Roxa', cor: 'purple', aulas: 11, ini: 34, fim: 44, titulo: 'Missão de competição',
    resumo: 'Servo, garra e missão de busca e resgate, nos moldes do maior torneio do Brasil.',
    checkpoint: 'Pegar as bolinhas e levar pra área de resgate.' },
  { id: 5, nome: 'Faixa Preta', cor: 'belt', aulas: 0, ini: 45, fim: 48, titulo: 'Treina até o pódio',
    resumo: 'Segue treinando e se aperfeiçoando em desafios de competição.',
    checkpoint: 'Sem faixa seguinte. Marcos: primeira competição, primeira medalha.' }
];

/* Plano oficial do ano (22/10/2026), 48 semanas. É o conteúdo da Oficina 3D.
   [semana, aula, o que o Creator sai sabendo, desafio, material, tipo]. O professor edita por cima disso no painel (fica em S.aulas). */
const PLANO = [
 [1,"Primeiro LED","Criar conta, conhecer a placa, LED com resistor, pinMode/digitalWrite/delay","Piscar a inicial do nome em Morse","Computador"],
 [2,"Semáforo","loop() repete pra sempre; sequência de 3 LEDs","Semáforo com tempos diferentes e pisca de madrugada","Computador"],
 [3,"O botão","digitalRead, pull-down, if/else, variável de estado","Botão que liga e desliga a cada toque","Computador"],
 [4,"O buzzer","tone(), frequência e duração","Música de 8 notas","Computador. Encomendar o kit esta semana"],
 [5,"Sensor de luz","LDR, analogRead, escala 0 a 1023, limiar","Luz noturna automática","Computador"],
 [6,"O motor gira","Motor DC, analogWrite/PWM, por que o pino não aguenta motor","Motor em rampa: acelera e desacelera","Computador"],
 [7,"Exame de faixa 1","Ao vivo: motor DC liga pelo botão e muda de velocidade, e o Creator explica o código",null,"Computador","exame"],
 [8,"Recuperação","Quem não passou refaz o exame. Quem passou: desafio extra (motor controlado pelo sensor de luz)","Desafio extra","Computador","rec"],
 [9,"Abrir a caixa","Cada peça pelo nome, instalar Arduino IDE, primeiro upload real","Foto do kit inteiro organizado","Kit completo, cabo USB"],
 [10,"Da tela pra bancada","Protoboard real, jumper mal encaixado, LED invertido","Refazer o exame da Amarela no físico, vídeo de 30 s","Protoboard, jumpers, LEDs, botão, buzzer"],
 [11,"Montar o chassi","Parafusar motores, rodas, roda boba, prender placa","Foto do chassi de cima e de baixo","Chassi 10x20, motores, rodas, chave Phillips"],
 [12,"A ponte H","L298N pino a pino, bateria 7,4 V, GND comum","Duas rodas pra frente por 3 s e parar","L298N, suporte e 2 baterias 18650"],
 [13,"Funções de movimento","frente(), tras(), esquerda(), direita(), parar()","Robô vai e volta sem bater em nada","Robô montado"],
 [14,"Andar reto","PWM, compensar o motor mais forte","Robô desenha um quadrado no chão","Robô montado"],
 [15,"O sensor de obstáculo","Ultrassônico HC-SR04, trig/echo, tempo vira cm","Comparar a leitura com a fita métrica em 5 distâncias","HC-SR04, fita métrica"],
 [16,"Parar antes de bater","Primeira decisão do robô, ler 2 vezes antes de decidir","Parar a 15 cm da parede, 10 vezes seguidas","Robô + sensor"],
 [17,"Andar, parar, recuar","Sequência autônoma: anda, detecta, recua, gira","Robô andando 1 min pela sala sem encostar","Robô + sensor"],
 [18,"Ensaio","Ajuste individual com o orientador olhando","3 tentativas gravadas do exame","Robô + sensor"],
 [19,"Exame de faixa 2","Ao vivo: robô no chassi anda sozinho e para antes do obstáculo, 3 vezes seguidas",null,"Robô + sensor","exame"],
 [20,"Recuperação","Refazer o exame. Quem passou: robô que procura a saída de uma caixa","Desafio extra","Robô + sensor","rec"],
 [21,"Sensor de linha, 1 canal","TCRT5000, preto absorve e branco reflete, achar o limiar","Anotar leitura no branco, no preto e na borda","TCRT5000 5 canais, fita isolante preta, cartolina"],
 [22,"Os 5 canais","Transformar 5 números em posição da linha","Robô parado dizendo onde está a linha","Robô + pista"],
 [23,"Primeiro seguidor","Liga-desliga com if/else","1 metro de reta sem sair da fita","Robô + pista"],
 [24,"Por que ele treme","Controle proporcional (o P do PID)","O mesmo metro sem serpentear","Robô + pista"],
 [25,"A curva","Guardar a última posição e buscar a linha perdida","Pista com 2 curvas","Robô + pista"],
 [26,"Desviar e voltar","Contornar obstáculo e reencontrar a linha","Contornar uma caixa e voltar pra linha","Robô + pista + caixa"],
 [27,"Máquina de estados","SEGUINDO, PROCURANDO, DESVIANDO, PARADO","Reescrever o código em estados e desenhar o diagrama","Robô + papel"],
 [28,"Sensor de cor","TCS34725, I2C, ler R, G e B","Ler 5 papéis coloridos","TCS34725, papéis coloridos"],
 [29,"Calibrar cor","Luz e distância mudam a leitura; calibrar e normalizar","Acertar a cor 9 em 10","Robô + papéis"],
 [30,"Os sinais mandam","Verde vira, vermelho para, azul acelera","Pista com 2 sinais obedecidos","Robô + pista + papéis"],
 [31,"Juntar tudo","Prioridade: obstáculo em cima do sinal, quem ganha?","Pista completa: curva, sinal e obstáculo","Robô + pista completa"],
 [32,"Exame de faixa 3","Ao vivo: segue a linha, obedece um sinal de cor e desvia de um obstáculo",null,"Robô + pista completa","exame"],
 [33,"Recuperação","Refazer o exame. Quem passou: escrever um bug e como achou a causa","Desafio extra","Robô + pista","rec"],
 [34,"O servo","Servo é ângulo, Servo.h, não alimentar pelo 5 V da placa","Varrer de 0 a 180 com 3 pausas","Servo SG90"],
 [35,"Montar a garra","Ângulo aberto e fechado, limite no código pra não queimar o servo","Garra abrindo e fechando por comando","Garra 3D, parafusos"],
 [36,"Pegar e soltar","pegar() e soltar(), tamanho e atrito da bolinha","Pegar a bolinha e soltar 20 cm adiante, 5 vezes","Bolinhas"],
 [37,"Projetar a missão","Arena em casa, plano no papel antes do código (CBL)","Plano desenhado com os estados do robô","Papelão, fita, cartolina"],
 [38,"Chegar lá","Seguir a linha até o sinal de cor da área de resgate","Parar na área 10 vezes, medir o erro em cm","Robô + arena"],
 [39,"Achar a bolinha","Varrer com o ultrassônico e alinhar a garra","Parar sempre na mesma distância da bolinha","Robô + arena + bolinhas"],
 [40,"Missão em código","NAVEGANDO, LOCALIZANDO, PEGANDO, ENTREGANDO, FIM","Primeira missão completa gravada, mesmo falhando","Robô + arena"],
 [41,"Falhar 10 vezes","Rodar 10 vezes, medir a taxa de acerto, atacar o passo que mais falha","Planilha das 10 tentativas","Robô + arena"],
 [42,"Ensaio e apresentação","Vídeo da missão e caderno de bordo, apresentar pra turma","Vídeo final publicado","Robô + celular"],
 [43,"Exame de faixa 4","Ao vivo: robô entra na arena, acha a bolinha, pega e leva até a área segura",null,"Robô + arena","exame"],
 [44,"Recuperação","Refazer o exame. Quem passou: duas bolinhas na mesma missão","Desafio extra","Robô + arena","rec"],
 [45,"Cerimônia de faixa","Entrega da Faixa Preta com os pais assistindo; regras da competição alvo","Ler o regulamento e listar o que o robô ainda não faz","Robô","cer"],
 [46,"Treino de competição","Pista no padrão do regulamento, cronômetro, equipe com Capitão","Melhor tempo da pista, gravado","Robô + pista oficial"],
 [47,"Mini-torneio interno","Rodadas cronometradas entre a turma","Relatório do que mudar no robô","Robô + pista oficial"],
 [48,"Fechamento do ano","Influencer apresenta o robô pros pais; plano do ano 2 em mentoria","Gravar um tutorial curto pra um Creator novo","Robô"]
];

/* Meta de XP por fase. Hoje é 400 em todas; a proposta 400/700/600/600 ainda está aberta. */
/* Tela de entrada: comparação online x presencial, um par por vez. Os benefícios do flyer ficam na landing page. */
const VANTAGENS = [
  { on: 'O kit chega na sua casa', onx: 'Dá pra continuar explorando no tempo livre', pre: 'O kit fica na escola', prex: 'Limita a exploração do aluno' },
  { on: 'O laboratório é a sua mesa', onx: 'Autonomia e responsabilidade pra organizar o próprio espaço', pre: 'O professor faz pelo aluno', prex: 'Quebra de autonomia' },
  { on: 'Turmas pequenas', onx: ['Aulas coletivas ao vivo pra tirar dúvidas', 'Mentoria e acompanhamento individual'], pre: 'Turma cheia', prex: 'Atenção dividida com vários alunos' },
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
  kit:        { nome: 'Kit organizado (foto até 1h depois da aula)', xp: 10, curto: 'Kit organizado' },
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
    tarefas: [['Assistir a aula ao vivo', 'aula'], ['Ajustar o PWM dos dois motores', 'desafio'], ['Gravar o vídeo do robô', 'documentar'], ['Ajudar um colega no grupo', 'ajudar'], ['Foto do kit organizado até 1h depois da aula', 'kit']] },
  { id: 'f2a14', fase: 2, aula: 14, titulo: 'Ler a linha com um sensor TCRT5000',
    tarefas: [['Assistir a aula ao vivo', 'aula'], ['Mostrar no monitor serial o preto e o branco', 'desafio'], ['Desafio de fim de semana: pista de fita isolante', 'fds'], ['Foto do kit organizado até 1h depois da aula', 'kit']] },
  { id: 'f3a23', fase: 3, aula: 23, titulo: 'Máquina de estados: decidir o que fazer',
    tarefas: [['Assistir a aula ao vivo', 'aula'], ['Desenhar os estados no papel', 'documentar'], ['Robô para, desvia e volta pra linha', 'desafio'], ['Foto do kit organizado até 1h depois da aula', 'kit']] },
  { id: 'f4a33', fase: 4, aula: 33, titulo: 'Projetar a missão de resgate no papel',
    tarefas: [['Assistir a aula ao vivo', 'aula'], ['Desenhar o caminho até a área', 'documentar'], ['Garra pega e solta a bolinha 3 vezes', 'desafio'], ['Foto do kit organizado até 1h depois da aula', 'kit']] },
  { id: 'f5t1', fase: 5, aula: 0, titulo: 'Treino de pista cronometrada',
    tarefas: [['Treino ao vivo com a equipe', 'aula'], ['Bater o próprio tempo na pista', 'desafio'], ['Ensinar um aluno da Fase 1', 'ajudar'], ['Foto do kit organizado até 1h depois da aula', 'kit']] }
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
    id, nome, idade, fase, semana: FASES[fase - 1].ini, hist: hist(semanas, ritmo), feitas: {}, videos: [], checkpoints: [], recados: []
  }, extra || {});
  return {
    turma: 'Turma fundadora · quinta 18h',
    proximoCheckpoint: dia(-8),
    alunos: [
      aluno('luna', 'Luna', 11, 2, 6, 3, {
        checkpoints: [{ fase: 1, d: dia(45), ok: true }],
        videos: [{ t: 'Robô seguindo linha, 1ª volta completa', d: dia(3), url: '' }, { t: 'Semáforo no Tinkercad', d: dia(60), url: '' }],
        recados: [{ d: dia(2), t: 'Ela ajudou dois colegas a calibrar o sensor essa semana. Checkpoint da Fase 2 marcado.' }],
        feitas: { f2a13: [0, 1] }, semana: 14
      }),
      aluno('caio', 'Caio', 12, 2, 6, 2, { checkpoints: [{ fase: 1, d: dia(44), ok: true }], semana: 14 }),
      aluno('bia', 'Bia', 10, 2, 5, 1, { checkpoints: [{ fase: 1, d: dia(40), ok: false }, { fase: 1, d: dia(33), ok: true }], semana: 12 }),
      aluno('theo', 'Theo', 9, 1, 4, 2, { semana: 5 }),
      aluno('maya', 'Maya', 13, 1, 3, 1, { semana: 3 }),
      aluno('davi', 'Davi', 14, 3, 7, 3, { checkpoints: [{ fase: 1, d: dia(120), ok: true }, { fase: 2, d: dia(50), ok: true }], semana: 26 }),
      aluno('rafa', 'Rafa', 15, 5, 8, 3, {
        checkpoints: [{ fase: 1, d: dia(300), ok: true }, { fase: 2, d: dia(220), ok: true }, { fase: 3, d: dia(130), ok: true }, { fase: 4, d: dia(20), ok: true }],
        videos: [{ t: 'Missão de resgate completa, 2 bolinhas', d: dia(12), url: '' }], semana: 46
      })
    ]
  };
})();
