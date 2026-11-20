/* Plataforma ERON: Creator, família e professor num site estático.
   Login de verdade e dados na nuvem (Firebase): ver nuvem.js e firestore.rules.
   Só entra quem o professor liberou no painel. */

const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => new Date().toISOString().slice(0, 10);
const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
const fase = id => FASES.find(f => f.id === id);
const iniciais = n => n.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();

/* ---------- estado (espelho do banco; nuvem.js preenche depois do login) ---------- */
let S = vazio();
function vazio() { return { turma: 'Turma ERON', proximoCheckpoint: '', aulas: {}, midiaComp: [], alunos: [], acessos: [] }; }
function save() { return window.NUVEM ? NUVEM.salvar(S) : false; }
const aluno = id => S.alunos.find(a => a.id === id);

/* ---------- regras ---------- */
const xpDe = h => (ACOES[h.a] || { xp: 0 }).xp;
const xpFase = a => a.hist.filter(h => h.f === a.fase && h.a !== 'checkpoint').reduce((t, h) => t + xpDe(h), 0);
const xpTotal = a => a.hist.reduce((t, h) => t + xpDe(h), 0);
function semanaIdx(d) { return Math.floor((new Date(hoje()) - new Date(d)) / (7 * 864e5)); }
function sequencia(a) {
  const sem = new Set(a.hist.map(h => semanaIdx(h.d)));
  let n = 0; while (sem.has(n)) n++;
  return n;
}
function percentil(a) {
  const pares = S.alunos.filter(x => x.fase === a.fase);
  if (pares.length < 2) return null;
  const ord = pares.map(xpFase).sort((x, y) => y - x);
  const pos = ord.indexOf(xpFase(a)) + 1;
  return { top: Math.max(1, Math.round(pos / pares.length * 100)), pos, n: pares.length };
}
function xpSemanas(a, n) {
  const s = Array(n).fill(0);
  a.hist.forEach(h => { const i = semanaIdx(h.d); if (i < n) s[n - 1 - i] += xpDe(h); });
  return s;
}
function missaoAtual(a) {
  const ms = MISSOES.filter(m => m.fase === a.fase);
  return ms.find(m => (a.feitas[m.id] || []).length < m.tarefas.length) || ms[ms.length - 1];
}
function conquistas(a) {
  const n = k => a.hist.filter(h => h.a === k).length;
  return [
    ['1', 'Primeiro passo', 'Primeira atividade', a.hist.length > 0],
    ['3', 'Sequência de 3', '3 semanas seguidas', sequencia(a) >= 3],
    ['♥', 'Mão amiga', 'Ajudou 3 colegas', n('ajudar') >= 3],
    ['▶', 'Criador', 'Postou um vídeo', a.videos.length > 0],
    ['✓', 'Checkpoint', 'Subiu de faixa', a.checkpoints.some(c => c.ok)],
    ['■', 'Faixa Preta', 'Passou nos 4 checkpoints', a.fase === 5]
  ].concat(a.fase < 5 ? [['★', 'Meta da ' + fase(a.fase).nome, 'Bateu a meta de XP da faixa', xpFase(a) >= META_XP[a.fase]]] : []);
}
/* A conquista mais perto de sair, com o que falta. */
function proximaConquista(a) {
  const n = k => a.hist.filter(h => h.a === k).length, seq = sequencia(a);
  const falta = {
    'Primeiro passo': [1, 'Faça a primeira atividade'],
    'Sequência de 3': [3 - seq, `Falta${3 - seq > 1 ? 'm' : ''} ${3 - seq} semana${3 - seq > 1 ? 's' : ''} seguida${3 - seq > 1 ? 's' : ''}`],
    'Mão amiga': [3 - n('ajudar'), `Falta ajudar ${3 - n('ajudar')} colega${3 - n('ajudar') > 1 ? 's' : ''}`],
    'Criador': [1, 'Falta 1 vídeo da missão'],
    'Checkpoint': [2, `Passe no checkpoint da ${fase(a.fase).nome}`],
    'Faixa Preta': [9, 'Passe nos 4 checkpoints']
  };
  if (a.fase < 5) { const r = META_XP[a.fase] - xpFase(a); falta['Meta da ' + fase(a.fase).nome] = [r / 15, `Falta${r > 1 ? 'm' : ''} ${r} XP`]; }
  const abertas = conquistas(a).filter(c => !c[3]).map(c => ({ ic: c[0], nome: c[1], resto: falta[c[1]][0], txt: falta[c[1]][1] }));
  return abertas.sort((x, y) => x.resto - y.resto)[0] || null;
}
function registrar(a, acao, extra) {
  a.hist.push(Object.assign({ d: hoje(), a: acao, f: a.fase }, extra || {}));
}
function checkpoint(a, ok) {
  a.checkpoints.push({ fase: a.fase, d: hoje(), ok });
  if (ok) {
    registrar(a, 'checkpoint');
    if (a.fase < 5) { a.fase++; a.semana = Math.max(a.semana, fase(a.fase).ini); }
  }
}

const tituloSemana = n => (S.aulas[n] && S.aulas[n].aula) || PLANO[n - 1][1];

/* ---------- Oficina 3D (Three.js num módulo à parte, carrega só quando alguém abre) ---------- */
let OF = null;
const oficinaHost = {
  aula: n => S.aulas[n] || null,
  salvarAula: (n, p) => { if (p) S.aulas[n] = p; else delete S.aulas[n]; save(); toast(p ? 'Aula salva' : 'Aula voltou ao plano original'); },
  midia: () => S.midiaComp,
  addMidia: m => { S.midiaComp.push(Object.assign({ d: hoje() }, m)); if (save()) toast('Exemplo adicionado'); else { S.midiaComp.pop(); toast('Sem espaço no navegador. Use um link em vez do arquivo.'); } },
  delMidia: i => { S.midiaComp.splice(i, 1); save(); }
};
function oficina(op) {
  const slot = $('#ofslot');
  (OF ? Promise.resolve(OF) : import('./oficina.js').then(m => (OF = m)))
    .then(m => { if (slot.isConnected) m.montar(slot, Object.assign({ host: oficinaHost }, op)); })
    .catch(() => { if (slot.isConnected) slot.innerHTML = '<p class="muted">Não deu pra carregar o 3D. Confira a internet e recarregue a página.</p>'; });
}
const slot3d = '<div id="ofslot" class="card ofslot"><span class="kick">montando a oficina 3D…</span></div>';

/* ---------- casca ---------- */
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2200);
}
function setWho(html) {
  $('#who').innerHTML = html + (SESSAO ? '<button class="sair" id="sair" type="button">Sair</button>' : '');
  if (SESSAO) $('#sair').onclick = sair;
}
function setTabs(items, atual) {
  const nav = $('#tabs');
  if (!items) { nav.hidden = true; nav.innerHTML = ''; return; }
  nav.hidden = false;
  nav.innerHTML = items.map(([href, nome]) => `<a href="${href}" ${href === atual ? 'aria-current="page"' : ''}>${nome}</a>`).join('');
}

/* ---------- sessão (Firebase Auth) ---------- */
let SESSAO = null;          // { papel: 'professor' | 'familia', id, email }
let ESTADO = 'carregando';  // carregando | fora | verificar | sem-acesso | dentro
function sair() { location.hash = '#/entrar'; NUVEM.sair(); }
function casa(s) { return s.papel === 'professor' ? '#/professor' : `#/aluno/${s.id}/trilha`; }

window.aoMudarLogin = async u => {
  SESSAO = null; S = vazio();
  if (!u) ESTADO = 'fora';
  else if (!u.emailVerified) ESTADO = 'verificar';
  else {
    ESTADO = 'carregando'; render();
    const s = await NUVEM.abrir(S, () => { const el = document.activeElement; if (!(el && el.closest('#app') && /INPUT|TEXTAREA|SELECT/.test(el.tagName))) render(); });
    if (s) { SESSAO = s; ESTADO = 'dentro'; if (!location.hash || /entrar/.test(location.hash)) location.hash = casa(s); }
    else ESTADO = 'sem-acesso';
  }
  render();
};

function render() {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  window.scrollTo(0, 0);
  if (OF) OF.pausar();
  document.body.classList.remove('of-wide');
  document.body.classList.toggle('is-login', ESTADO !== 'dentro');
  if (ESTADO === 'carregando') { setWho(''); setTabs(null); $('#app').innerHTML = '<p class="muted" style="padding:40px 0">Carregando…</p>'; return; }
  if (ESTADO !== 'dentro') return telaLogin();
  if (p[0] === 'entrar') { location.hash = casa(SESSAO); return; }
  // cada família só vê o próprio Creator; o professor vê tudo
  if (SESSAO.papel !== 'professor' && (!['aluno', 'pais'].includes(p[0]) || p[1] !== SESSAO.id)) { if (location.hash !== casa(SESSAO)) { location.hash = casa(SESSAO); return; } }
  if (p[0] === 'aluno' && aluno(p[1])) return telaAluno(aluno(p[1]), p[2] || 'trilha');
  if (p[0] === 'pais' && aluno(p[1])) return telaPais(aluno(p[1]));
  if (p[0] === 'professor' && SESSAO.papel === 'professor') return p[1] === 'aulas' ? telaProfAulas() : telaProfessor();
  if (SESSAO.papel !== 'professor' && !aluno(SESSAO.id)) { setWho(''); setTabs(null); $('#app').innerHTML = '<div class="card" style="margin-top:24px"><b>Seu acesso está liberado, mas o Creator ainda não foi cadastrado.</b><p class="muted">Avise o professor da ERON.</p></div>'; return; }
  if (location.hash !== casa(SESSAO)) location.hash = casa(SESSAO);
}
window.addEventListener('hashchange', render);

/* ---------- login ---------- */
let modoLogin = 'entrar'; // entrar | criar | esqueci
function telaLogin() {
  setWho(''); setTabs(null);
  let vi = 0;
  if (!$('#lbox')) {
    $('#app').innerHTML = `<div id="lbox"></div><section class="vitrine" aria-label="Plano de aulas, semana a semana">${slot3d}</section>`;
    oficina({ modo: 'publico', semana: 7, sub: 'Do zero à competição em um ano', titulo: 'Plano de aulas, semana a semana', intro: 'Quatro faixas até a preta. Pra subir de faixa, só passando no checkpoint. Aqui fica aberta a última aula de cada faixa, o exame: onde o aluno chega. O resto abre na plataforma, pra quem está matriculado.' });
  } else if (OF) OF.retomar();
  const u = NUVEM.usuario;
  let card;
  if (ESTADO === 'verificar') card = `
      <h2 class="h2">Confirme seu e-mail.</h2>
      <p class="muted">Mandamos um link pra <b>${esc(u && u.email)}</b>. Abra, clique no link e volte aqui. Não achou? Olhe no spam.</p>
      <p class="erro" id="lerr" role="alert" hidden></p>
      <button class="btn btn-fill login-go" type="button" id="ljaconf">Já confirmei</button>
      <div class="row"><a href="#/entrar" id="lreenv" class="muted small">Reenviar o e-mail</a><a href="#/entrar" id="lsair" class="muted small">Usar outro e-mail</a></div>`;
  else if (ESTADO === 'sem-acesso') card = `
      <h2 class="h2">Acesso ainda não liberado.</h2>
      <p class="muted">O e-mail <b>${esc(u && u.email)}</b> entrou, mas ainda não está na turma. A plataforma é só pra alunos matriculados.</p>
      <p class="muted">Já fez a matrícula? Fale com a ERON e confira se foi esse o e-mail informado. Ainda não? Comece pela avaliação de perfil, que é gratuita.</p>
      <a class="btn btn-fill login-go" href="https://tiagoarantess.github.io/escola-de-robotica-online/#agendar">Agendar avaliação de perfil</a>
      <div class="row"><a href="#/entrar" id="ljaconf" class="muted small">Já fui liberado, tentar de novo</a><a href="#/entrar" id="lsair" class="muted small">Usar outro e-mail</a></div>`;
  else card = `
      <div class="seg" role="tablist" aria-label="O que você quer fazer">${[['entrar', 'Entrar', 'blue'], ['criar', 'Primeiro acesso', 'orange']].map(([k, n, c]) =>
        `<button type="button" role="tab" class="c-${c}" aria-selected="${k === modoLogin || (k === 'entrar' && modoLogin === 'esqueci')}" data-modo="${k}">${n}</button>`).join('')}</div>
      <h2 class="h2">${modoLogin === 'criar' ? 'Crie sua senha.' : modoLogin === 'esqueci' ? 'Nova senha.' : 'Bora pra missão.'}</h2>
      <label>E-mail do responsável<input type="email" id="lu" autocomplete="username" placeholder="voce@email.com" required></label>
      ${modoLogin === 'esqueci' ? '' : `<label>${modoLogin === 'criar' ? 'Crie uma senha (6 ou mais)' : 'Senha'}<input type="password" id="lp" autocomplete="${modoLogin === 'criar' ? 'new-password' : 'current-password'}" placeholder="••••••••" required minlength="6"></label>`}
      <p class="erro" id="lerr" role="alert" hidden></p>
      <p class="ok-msg muted" id="lok" role="status" hidden></p>
      <button class="btn btn-fill login-go" type="submit" id="lgo">${modoLogin === 'criar' ? 'Criar senha' : modoLogin === 'esqueci' ? 'Mandar link pro e-mail' : 'Entrar'}</button>
      ${modoLogin === 'esqueci' ? '' : `<button class="btn btn-ghost" type="button" id="lgoogle"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zM6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14zM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"/></svg>Entrar com Google</button>`}
      <div class="row">${modoLogin === 'esqueci' ? '<a href="#/entrar" data-modo="entrar" class="muted small">Voltar pro login</a>' : '<a href="#/entrar" data-modo="esqueci" class="muted small">Esqueci minha senha</a>'}
        <span class="small muted">${modoLogin === 'criar' ? 'Use o e-mail que você passou na matrícula.' : 'Só entra quem já fez a matrícula.'}</span></div>
      <p class="note">Ainda não é aluno? <a href="https://tiagoarantess.github.io/escola-de-robotica-online/#agendar">Agende a avaliação de perfil gratuita</a>.</p>`;
  $('#lbox').innerHTML = `
  <div class="login">
    <section class="login-hero">
      <span class="kick live"><i></i>Estação ERON · plataforma de aulas</span>
      <h1 class="wide">Entrar<br>na trilha.</h1>
      <div class="strip" aria-hidden="true">${FASES.map(f => `<i class="c-${f.cor}"></i>`).join('')}</div>
      <div class="vs" id="vs" aria-live="polite"></div>
    </section>
    <form class="card login-card c-${modoLogin === 'criar' ? 'orange' : 'blue'}" id="flogin" novalidate>${card}</form>
  </div>`;
  const vsTela = () => {
    const v = VANTAGENS[vi], n = VANTAGENS.length;
    $('#vs').innerHTML = `<div class="vs-par"><div class="vs-on"><span class="kick">Online</span><b>${esc(v.on)}</b>${[].concat(v.onx).map(t => `<span class="vs-x">✓ ${esc(t)}</span>`).join('')}</div>
      <span class="vs-mid" aria-hidden="true">vs</span>
      <div class="vs-pre"><span class="kick">Presencial</span><b>${esc(v.pre)}</b><span class="vs-x">✕ ${esc(v.prex)}</span></div></div>
      <div class="vs-nav"><div class="vs-dots">${VANTAGENS.map((_, i) => `<button type="button" data-vs="${i}" aria-label="Comparação ${i + 1}" ${i === vi ? 'aria-current="true"' : ''}></button>`).join('')}</div>
      <span class="mono vs-n">${String(vi + 1).padStart(2, '0')}/${String(n).padStart(2, '0')}</span>
      <button type="button" class="btn btn-ghost vs-prox" data-vs="${(vi + 1) % n}">${vi + 1 < n ? 'Próximo' : 'Recomeçar'} →</button></div>`;
    document.querySelectorAll('[data-vs]').forEach(b => b.onclick = () => { vi = +b.dataset.vs; vsTela(); });
  };
  vsTela();
  const erro = m => { const e = $('#lerr'); if (e) { e.textContent = m; e.hidden = !m; } };
  const ok = m => { const e = $('#lok'); if (e) { e.textContent = m; e.hidden = !m; } };
  const ocupado = (b, t) => { if (b) { b.disabled = !!t; if (t) { b.dataset.t = b.textContent; b.textContent = t; } else if (b.dataset.t) b.textContent = b.dataset.t; } };
  document.querySelectorAll('[data-modo]').forEach(b => b.onclick = e => { e.preventDefault(); modoLogin = b.dataset.modo; telaLogin(); const i = $('#lu'); if (i) i.focus(); });
  const sairBtn = $('#lsair'); if (sairBtn) sairBtn.onclick = e => { e.preventDefault(); NUVEM.sair(); };
  const reenv = $('#lreenv'); if (reenv) reenv.onclick = e => { e.preventDefault(); NUVEM.reenviar().then(() => toast('E-mail reenviado')).catch(x => erro(NUVEM.erroPt(x))); };
  const jaconf = $('#ljaconf'); if (jaconf) jaconf.onclick = async e => {
    e.preventDefault(); ocupado(jaconf, 'Conferindo…');
    const u2 = await NUVEM.recarregar().catch(() => null);
    if (u2 && !u2.emailVerified) { ocupado(jaconf); return erro('Ainda não aparece confirmado. Clique no link do e-mail e tente de novo.'); }
    window.aoMudarLogin(u2);
  };
  const g = $('#lgoogle'); if (g) g.onclick = () => NUVEM.google().catch(x => erro(NUVEM.erroPt(x)));
  $('#flogin').onsubmit = async e => {
    e.preventDefault(); if (ESTADO !== 'fora') return;
    const em = ($('#lu') || {}).value || '', pw = ($('#lp') || {}).value || '', go = $('#lgo');
    erro(''); ok('');
    if (!em.trim()) return erro('Coloque o e-mail.');
    if (modoLogin !== 'esqueci' && !pw) return erro('Coloque a senha.');
    try {
      if (modoLogin === 'esqueci') { ocupado(go, 'Enviando…'); await NUVEM.esqueci(em); ok('Se esse e-mail tiver senha aqui, o link pra criar uma nova chega em instantes. Olhe também no spam.'); ocupado(go); }
      else if (modoLogin === 'criar') { ocupado(go, 'Criando…'); await NUVEM.criar(em, pw); }
      else { ocupado(go, 'Entrando…'); await NUVEM.entrar(em, pw); }
    } catch (x) { ocupado(go); erro(NUVEM.erroPt(x)); }
  };
}

/* ---------- aluno ---------- */
const abasAluno = a => [[`#/aluno/${a.id}/trilha`, 'Trilha'], [`#/aluno/${a.id}/missao`, 'Missão'], [`#/aluno/${a.id}/turma`, 'Turma'], [`#/aluno/${a.id}/portfolio`, 'Portfólio'], [`#/pais/${a.id}`, 'Família']];
function telaAluno(a, aba) {
  const base = `#/aluno/${a.id}`;
  setWho(`<span class="name">${esc(a.nome)}</span><span class="av">${iniciais(a.nome)}</span>`);
  setTabs(abasAluno(a), base + '/' + aba);
  const f = fase(a.fase);
  const meta = META_XP[a.fase], xp = xpFase(a), pc = percentil(a), seq = sequencia(a);
  const resumo = `
    <div class="card top-bar c-${f.cor}">
      ${a.fase < 5 ? `<div class="row"><span class="kick">Pontos (XP) da faixa</span><span class="num" style="color:var(--c);font-weight:700">${xp} / ${meta}</span></div>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${meta}" aria-valuenow="${xp}"><i style="width:${Math.min(100, xp / meta * 100)}%"></i></div>
      ${xp >= meta ? `<p class="muted" style="margin-top:8px;font-size:13px">Meta batida. Agora quem promove é o checkpoint.</p>` : ''}`
      : `<div class="row"><span class="kick">Faixa preta</span><span class="num" style="font-weight:700">${xpTotal(a)} pontos (XP) no total</span></div>`}
      <div class="row" style="margin-top:14px;align-items:end">
        <div><div class="big">${pc ? 'Top ' + pc.top + '%' : '—'}</div><div class="muted" style="font-size:13px">${pc ? pc.pos + 'º de ' + pc.n + ' na ' + f.nome : 'Único Creator nesta faixa'}</div></div>
        <div style="text-align:right"><div class="big" style="color:var(--accent)">${seq}</div><div class="muted" style="font-size:13px">${seq === 1 ? 'semana' : 'semanas'} seguidas</div></div>
      </div>
    </div>`;
  const head = (k, t) => `<div class="stack" style="gap:4px"><span class="kick">${k}</span><h1 class="h1">${t}</h1></div>`;

  if (aba === 'missao') {
    const m = missaoAtual(a), feitas = a.feitas[m.id] || [];
    const tudo = feitas.length === m.tarefas.length, pq = proximaConquista(a);
    $('#app').innerHTML = `${head(`Missão da semana${m.aula ? ' · aula ' + m.aula : ''}`, esc(m.titulo))}
      <div class="cols">
        <div class="card">${m.tarefas.map(([t, ac], i) => `
          <label class="task ${feitas.includes(i) ? 'on' : ''}"><input type="checkbox" data-i="${i}" ${feitas.includes(i) ? 'checked' : ''}><span>${esc(t)}</span><span class="xp">+${ACOES[ac].xp} XP</span></label>`).join('')}
          ${tudo ? `<p class="muted" style="margin-top:10px">Missão completa. A próxima abre na aula que vem.</p>` : ''}
        </div>
        <div class="stack">
          <div class="card">
            <button class="drop" type="button" id="dropbtn" aria-expanded="false" aria-controls="fv">
              <span class="drop-ic" aria-hidden="true">▲</span>
              <b>Enviar vídeo da missão</b>
              <span class="muted">O professor avalia até a próxima aula</span>
            </button>
            <form class="stack" id="fv" hidden style="margin-top:14px">
              <label>O que o robô faz no vídeo<input type="text" id="vt" required maxlength="80" placeholder="Robô andando 2 metros em linha reta"></label>
              <label>Link do vídeo (YouTube, Drive ou Instagram)<input type="url" id="vu" placeholder="https://"></label>
              <button class="btn btn-fill" type="submit">Enviar pro professor</button>
              <p class="note">Vale +${ACOES.documentar.xp} XP e entra no seu portfólio.</p>
            </form>
          </div>
          ${pq ? `<div class="card quase"><span class="medal" aria-hidden="true">${esc(pq.ic)}</span><div><b>Conquista quase lá: ${esc(pq.nome)}</b><div class="muted">${esc(pq.txt)} pra desbloquear</div></div></div>` : ''}
        </div>
      </div>`;
    $('#app').querySelectorAll('.task input').forEach(cb => cb.addEventListener('change', () => {
      const i = +cb.dataset.i, ac = m.tarefas[i][1];
      a.feitas[m.id] = a.feitas[m.id] || [];
      if (cb.checked) { a.feitas[m.id].push(i); registrar(a, ac, { m: m.id, i }); toast(`+${ACOES[ac].xp} XP`); }
      else {
        a.feitas[m.id] = a.feitas[m.id].filter(x => x !== i);
        const k = a.hist.findIndex(h => h.m === m.id && h.i === i); if (k > -1) a.hist.splice(k, 1);
      }
      save(); render();
    }));
    $('#dropbtn').onclick = () => { const f = $('#fv'); f.hidden = !f.hidden; $('#dropbtn').setAttribute('aria-expanded', String(!f.hidden)); if (!f.hidden) $('#vt').focus(); };
    $('#fv').addEventListener('submit', e => {
      e.preventDefault();
      a.videos.unshift({ t: $('#vt').value.trim(), url: $('#vu').value.trim(), d: hoje() });
      registrar(a, 'documentar'); save(); toast(`Vídeo enviado · +${ACOES.documentar.xp} XP`); location.hash = base + '/portfolio';
    });
    return;
  }

  if (aba === 'turma') {
    const pares = S.alunos.filter(x => x.fase === a.fase).sort((x, y) => xpFase(y) - xpFase(x));
    const ajudas = S.alunos.map(x => [x, x.hist.filter(h => h.a === 'ajudar' && semanaIdx(h.d) < 4).length]).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1]);
    $('#app').innerHTML = `${head('Turma', a.fase < 5 ? 'Ranking da ' + fase(a.fase).nome : 'Ranking dos faixas pretas')}
      <div class="cols">
        <div class="card"><ol class="rank">${pares.map((x, i) => `
          <li class="${x.id === a.id ? 'me' : ''}"><span class="pos">${i + 1}º</span><span class="av">${iniciais(x.nome)}</span><span>${esc(x.nome)}${x.id === a.id ? ' (você)' : ''}</span><span class="num">${xpFase(x)} XP</span></li>`).join('')}</ol>
          <p class="note" style="margin-top:10px">O ranking compara só quem está na mesma faixa. Quem entrou depois não fica sempre no fim da fila.</p>
        </div>
        <div class="card"><span class="kick" style="color:var(--green)">Mão amiga · último mês</span>
          ${ajudas.length ? `<ul class="list" style="margin-top:10px">${ajudas.map(([x, n]) => `<li class="row"><span>${esc(x.nome)}</span><span class="pill c-green">ajudou ${n}x</span></li>`).join('')}</ul>` : '<p class="muted" style="margin-top:8px">Ninguém ainda. Ajudar um colega vale +15 XP.</p>'}
        </div>
      </div>`;
    return;
  }

  if (aba === 'portfolio') {
    $('#app').innerHTML = `${head('Portfólio', 'O que eu já construí')}
      <div class="cols">
        <div class="card"><span class="kick">Vídeos</span>
          ${a.videos.length ? `<ul class="list" style="margin-top:12px">${a.videos.map(v => `
            <li class="video"><span class="thumb">▶</span><div>${v.url ? `<a href="${esc(v.url)}" target="_blank" rel="noopener"><b>${esc(v.t)}</b></a>` : `<b>${esc(v.t)}</b>`}<div class="muted" style="font-size:13px">${fmt(v.d)}</div></div></li>`).join('')}</ul>`
          : `<p class="muted" style="margin-top:8px">Nenhum vídeo ainda. Envie o primeiro na aba Missão.</p>`}
        </div>
        <div class="card"><span class="kick">Conquistas</span>
          <div class="badges" style="margin-top:12px">${conquistas(a).map(([ic, n, d, ok]) => `<div class="badge ${ok ? '' : 'off'}"><span class="ic">${ic}</span><div><b>${n}</b><small>${d}</small></div></div>`).join('')}</div>
        </div>
      </div>`;
    return;
  }

  // trilha: mapa horizontal em zigue-zague, da esquerda pra direita
  const LARG = 640, ALT = 270, pos = k => ({ x: 9 + k * (82 / (FASES.length - 1)), y: k % 2 ? 98 : 172 });
  const pts = FASES.map((x, k) => pos(k));
  const trecho = k => { const p = pts[k], q = pts[k + 1], m = (q.x - p.x) * .5; return `M${p.x * LARG / 100} ${p.y} C ${(p.x * LARG / 100) + m * LARG / 100} ${p.y}, ${(q.x * LARG / 100) - m * LARG / 100} ${q.y}, ${q.x * LARG / 100} ${q.y}`; };
  const estado = x => x.id < a.fase ? 'done' : x.id === a.fase ? 'now' : 'lock';
  const aulaInfo = `<div class="aula-atual"><span class="kick">${a.fase < 5 ? 'Aula atual' : 'Treino atual'}</span><b>Semana ${a.semana} de 48</b><span class="muted">${a.semana - f.ini + 1}ª de ${f.fim - f.ini + 1} na ${f.nome} · ${esc(tituloSemana(a.semana))}</span></div>`;
  $('#app').innerHTML = `${head('Minha trilha', f.nome)}
    <div class="card"><div class="mapa-h"><div class="mapa-h-in">
      <svg viewBox="0 0 ${LARG} ${ALT}" aria-hidden="true">${pts.slice(0, -1).map((p, k) =>
        `<path d="${trecho(k)}" class="${FASES[k + 1].id <= a.fase ? 'feito' : ''}"/>`).join('')}</svg>
      ${FASES.map((x, k) => { const st = estado(x), p = pts[k];
        const dot = st === 'done' ? '✓' : '<span class="belt"></span>';
        const tag = st === 'done' ? 'Checkpoint ok' : st === 'now' ? 'Você está aqui' : 'Bloqueada';
        return `<button class="no-h ${st} c-${x.cor} ${k % 2 ? 'cima' : ''}" style="left:${p.x}%;top:${p.y / ALT * 100}%" data-f="${x.id}" aria-label="${esc(x.nome)}: ${tag}">
          <span class="dot">${dot}</span><span class="rot"><b>${esc(x.nome)}</b><small>${tag}</small></span></button>`; }).join('')}
    </div></div></div>
    <div class="cols" style="margin-top:16px">
      <div class="stack">${resumo.replace('<div class="row" style="margin-top:14px;align-items:end">', aulaInfo + '<div class="row" style="margin-top:14px;align-items:end">')}
        ${a.fase < 5 ? `<div class="card chk c-${f.cor}"><span class="kick" style="color:var(--c)">Próximo checkpoint</span><p style="font-weight:700;font-size:17px;margin-top:6px">${esc(f.checkpoint)}</p>${S.proximoCheckpoint ? `<p class="muted" style="font-size:13px;margin-top:4px">Marcado pra ${fmt(S.proximoCheckpoint)}</p>` : ''}</div>` : ''}
      </div>
      <div class="board faixas" id="det"></div>
    </div>`;
  const detalhe = id => {
    $('#det').innerHTML = `<div class="row"><span class="kick">Faixas da trilha</span><span class="kick" id="relogio"></span></div><ol>${FASES.map(x => {
      const st = estado(x), tag = st === 'done' ? 'Checkpoint ok' : st === 'now' ? 'Você está aqui' : 'Bloqueada';
      return `<li class="c-${x.cor} ${st} ${x.id === id ? 'sel' : ''}"><button type="button" class="brow" data-f="${x.id}" aria-expanded="${x.id === id}">
        <span class="ln">${x.id < 5 ? 'F' + x.id : 'FP'}</span><b>${esc(x.nome)}</b><span class="muted">${st === 'lock' ? esc(x.titulo) : tag}</span></button>
        ${x.id === id ? `<div class="bdet"><p>${esc(x.titulo)}${x.aulas ? ' · semanas ' + x.ini + ' a ' + x.fim : ' · sem prazo'}. ${esc(x.resumo)}</p>
          <p><span class="kick">Checkpoint</span><br>${esc(x.checkpoint)}</p>
          ${st === 'lock' ? '<p class="note">Abre quando você passar no checkpoint da faixa anterior.</p>' : ''}</div>` : ''}</li>`; }).join('')}</ol>`;
    const el = $('#relogio'); if (el) el.textContent = 'Agora ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    document.querySelectorAll('.brow').forEach(b => b.onclick = () => detalhe(+b.dataset.f));
    document.querySelectorAll('.no-h').forEach(b => b.classList.toggle('sel', +b.dataset.f === id));
  };
  document.querySelectorAll('.no-h').forEach(b => b.onclick = () => detalhe(+b.dataset.f));
  detalhe(a.fase);
  const box = $('.mapa-h'), atual = $('.no-h.now');
  if (box && atual && box.scrollWidth > box.clientWidth) box.scrollLeft = atual.offsetLeft - box.clientWidth / 2;
}

/* ---------- pais ---------- */
function telaPais(a) {
  setWho(`<span class="name">Família de ${esc(a.nome)}</span><span class="av" style="color:var(--text)">${iniciais(a.nome)}</span>`);
  setTabs(abasAluno(a), `#/pais/${a.id}`);
  const f = fase(a.fase), sem = xpSemanas(a, 6), max = Math.max(1, ...sem);
  const aulasMes = a.hist.filter(h => h.a === 'aula' && semanaIdx(h.d) < 4).length;
  const missoesFeitas = Object.values(a.feitas).reduce((t, l) => t + l.length, 0);
  const desafios = a.hist.filter(h => h.a === 'desafio').length;
  const pc = percentil(a), xp = xpFase(a), meta = META_XP[a.fase];
  const ultimoCp = a.checkpoints.filter(c => c.ok).slice(-1)[0];
  $('#app').innerHTML = `
    <div class="stack" style="gap:4px"><span class="kick">Painel da família</span>
      <h1 class="h1">${esc(a.nome)} está na ${f.nome}${ultimoCp ? `, subiu de faixa em ${fmt(ultimoCp.d)}` : ''}.</h1></div>
    <div class="cols">
      <div class="stack">
        <div class="grid4">
          <div class="card top-bar c-${f.cor}"><span class="kick">Faixa</span><div class="big" style="color:var(--c)">${f.nome.replace('Faixa ', '')}</div><span class="muted" style="font-size:13px">semana ${a.semana} de 48</span></div>
          <div class="card"><span class="kick">Pontos (XP)</span><div class="big">${a.fase < 5 ? xp : xpTotal(a)}</div><span class="muted" style="font-size:13px">${a.fase < 5 ? 'de ' + meta + ' na faixa' : 'no total'}</span></div>
          <div class="card"><span class="kick">Percentil</span><div class="big">${pc ? 'Top ' + pc.top + '%' : '—'}</div><span class="muted" style="font-size:13px">${pc ? pc.pos + 'º de ' + pc.n + ' na mesma faixa' : 'único na faixa'}</span></div>
          <div class="card"><span class="kick">Presença</span><div class="big">${aulasMes}</div><span class="muted" style="font-size:13px">aulas no mês, de 4 a 5</span></div>
        </div>
        <div class="card"><div class="row"><span class="kick">XP por semana</span><span class="note">últimas 6</span></div>
          <div class="weeks" role="img" aria-label="XP nas últimas 6 semanas: ${sem.join(', ')}">${sem.map((v, i) => `<div><span><i style="height:${Math.round(v / max * 100)}%"></i></span><small>${i === 5 ? 'agora' : v}</small></div>`).join('')}</div>
        </div>
        ${a.fase < 5 ? `<div class="card top-bar c-${f.cor}"><span class="kick" style="color:var(--c)">O que falta pra subir de faixa</span><p style="font-weight:700;margin-top:6px">${esc(f.checkpoint)}</p><p class="muted" style="font-size:14px;margin-top:4px">Na ERON o checkpoint é o exame de faixa: um desafio prático, ao vivo. Tempo e presença sozinhos não sobem ninguém de faixa.</p></div>` : ''}
      </div>
      <div class="stack">
        <div class="card"><span class="kick" style="color:var(--accent)">Recado do professor</span>
          ${a.recados.length ? a.recados.slice().reverse().map(r => `<p style="margin-top:8px">${esc(r.t)}</p><p class="note">${fmt(r.d)}</p>`).join('') : '<p class="muted" style="margin-top:8px">Nenhum recado ainda.</p>'}
        </div>
        <div class="card"><span class="kick">Vídeos de ${esc(a.nome)}</span>
          ${a.videos.length ? `<ul class="list" style="margin-top:12px">${a.videos.slice(0, 4).map(v => `<li class="video"><span class="thumb">▶</span><div>${v.url ? `<a href="${esc(v.url)}" target="_blank" rel="noopener"><b>${esc(v.t)}</b></a>` : `<b>${esc(v.t)}</b>`}<div class="muted" style="font-size:13px">${fmt(v.d)}</div></div></li>`).join('')}</ul>` : '<p class="muted" style="margin-top:8px">Os vídeos das missões aparecem aqui.</p>'}
        </div>
        <p class="note">${missoesFeitas} tarefas de missão feitas · ${desafios} desafios · ${sequencia(a)} semanas seguidas ativo · ${xpTotal(a)} XP no total.</p>
      </div>
    </div>
`;
}

/* ---------- professor ---------- */
const TABS_PROF = [['#/professor', 'Turma'], ['#/professor/aulas', 'Aulas']];
/* XP padrão de cada semana, igual ao da Oficina 3D (oficina.js) */
function xpPadrao(n) {
  const tipo = PLANO[n - 1][5], it = [['Aula', 10]];
  if (tipo === 'exame') it.push(['Exame', 100]); else it.push(['Desafio', 20], ['Documentar', 15], ['Fim de semana', 10]);
  if (n >= 9) it.push(['Foto do kit', 10]);
  return it;
}
function telaProfAulas() {
  setWho(`<span class="name">Professor</span><span class="av" style="color:var(--green)">PR</span>`);
  setTabs(TABS_PROF, '#/professor/aulas');
  const quem = {};
  S.alunos.forEach(a => (quem[a.semana] = quem[a.semana] || []).push(a.nome));
  const linha = n => {
    const base = PLANO[n - 1], ed = S.aulas[n] || {}, v = k => ed[k] ?? base[{ aula: 1, sabe: 2, desafio: 3, mat: 4 }[k]] ?? '';
    const xp = xpPadrao(n).map(([k, x]) => [k, ed.xp && ed.xp[k] != null ? ed.xp[k] : x]);
    return `<details class="aula-ed"${S.aulas[n] ? ' data-ed' : ''}><summary><span class="num muted">Sem. ${n}</span><b>${esc(v('aula'))}</b>${S.aulas[n] ? '<span class="pill" style="--c:var(--warn)">editada</span>' : ''}${quem[n] ? `<span class="pill">${quem[n].map(esc).join(', ')}</span>` : ''}</summary>
      <form class="stack" data-aula="${n}" style="margin-top:10px">
        <label>Nome da aula<input name="aula" value="${esc(v('aula'))}" maxlength="60" required></label>
        <label>${base[5] === 'exame' ? 'O que o Creator mostra ao vivo' : 'O Creator sai sabendo'}<textarea name="sabe" maxlength="300">${esc(v('sabe'))}</textarea></label>
        <label>Desafio da semana<textarea name="desafio" maxlength="300">${esc(v('desafio'))}</textarea></label>
        <label>Material<input name="mat" value="${esc(v('mat'))}" maxlength="160"></label>
        <div class="grid3">${xp.map(([k, x]) => `<label>XP ${esc(k)}<input type="number" name="xp:${esc(k)}" value="${x}" min="0" max="500" step="5"></label>`).join('')}</div>
        <div class="row" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn btn-fill btn-sm" type="submit">Salvar aula</button>${S.aulas[n] ? `<button class="btn btn-ghost btn-sm" type="button" data-orig="${n}">Voltar ao plano original</button>` : ''}</div>
      </form></details>`;
  };
  const midia = S.midiaComp.map((m, i) => `<li class="row"><span>${m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener"><b>${esc(m.titulo)}</b></a>` : `<b>${esc(m.titulo)}</b> <span class="muted small">foto</span>`}</span><button class="btn btn-ghost btn-sm" data-delm="${i}">remover</button></li>`).join('');
  $('#app').innerHTML = `
    <div class="stack" style="gap:4px"><span class="kick">Plano de 48 semanas</span><h1 class="h1">Conteúdo das aulas</h1>
      <p class="muted">O que você muda aqui aparece pros Creators matriculados. Fica salvo na nuvem.</p></div>
    ${FASES.map(f => `<section class="card top-bar c-${f.cor} stack"><h2 class="h2">${f.nome} <span class="muted" style="font-size:14px;font-weight:400">· semanas ${f.ini} a ${f.fim}</span></h2>
      ${Array.from({ length: f.fim - f.ini + 1 }, (_, k) => linha(f.ini + k)).join('')}
      ${f.id === 5 ? `<div class="stack" style="margin-top:8px"><span class="kick">Exemplos reais da competição</span>
        ${midia ? `<ul class="list">${midia}</ul>` : '<p class="muted small">Nenhum ainda. Aparecem na Faixa Preta do robô semana a semana.</p>'}
        <form class="stack" id="fmid"><div class="grid2"><label>Título<input id="mt" maxlength="80" required placeholder="Ex.: etapa regional, modalidade resgate"></label>
          <label>Link do vídeo ou foto<input id="mu" type="url" placeholder="https://"></label></div>
          <label>Ou foto do computador<input id="mf" type="file" accept="image/*"></label>
          <button class="btn btn-fill btn-sm" type="submit" style="justify-self:start">Adicionar exemplo</button></form></div>` : ''}
    </section>`).join('')}`;
  document.querySelectorAll('form[data-aula]').forEach(fm => fm.onsubmit = e => {
    e.preventDefault(); const p = { xp: {} };
    for (const [k, v] of new FormData(fm).entries()) { if (k.startsWith('xp:')) p.xp[k.slice(3)] = Math.max(0, +v || 0); else p[k] = String(v).trim(); }
    S.aulas[fm.dataset.aula] = p; save(); toast('Aula salva'); render();
  });
  document.querySelectorAll('[data-orig]').forEach(b => b.onclick = () => { delete S.aulas[b.dataset.orig]; save(); toast('Aula voltou ao plano original'); render(); });
  document.querySelectorAll('[data-delm]').forEach(b => b.onclick = () => { S.midiaComp.splice(+b.dataset.delm, 1); save(); render(); });
  $('#fmid').onsubmit = async e => {
    e.preventDefault(); const titulo = $('#mt').value.trim(), url = $('#mu').value.trim(), file = $('#mf').files[0];
    if (!url && !file) return toast('Cole um link ou escolha uma foto.');
    let data = null;
    if (file) data = await new Promise(ok => { const img = new Image(); img.onload = () => { const k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .8)); }; img.onerror = () => ok(null); img.src = URL.createObjectURL(file); });
    oficinaHost.addMidia({ titulo, url: data ? '' : url, data }); render();
  };
}

function telaProfessor() {
  setWho(`<span class="name">Professor</span><span class="av" style="color:var(--green)">PR</span>`);
  setTabs(TABS_PROF, '#/professor');
  const porFase = FASES.map(f => [f, S.alunos.filter(a => a.fase === f.id)]).filter(([, l]) => l.length);
  $('#app').innerHTML = `
    <div class="stack" style="gap:4px"><span class="kick">Painel da turma</span><h1 class="h1">${esc(S.turma)}</h1></div>
    <div class="cols">
      <div class="card top-bar c-blue">
        <span class="kick" style="color:var(--accent)">Registrar aula de hoje</span>
        <div class="present">${S.alunos.map(a => `<label><input type="checkbox" value="${a.id}" checked> ${esc(a.nome)}</label>`).join('')}</div>
        <button class="btn btn-fill btn-sm" id="aula">Dar +${ACOES.aula.xp} XP de presença</button>
      </div>
      <div class="card stack">
        <label class="stack" style="gap:6px"><span class="kick">Próximo checkpoint</span><input type="date" id="cpd" value="${S.proximoCheckpoint || ''}"></label>
        <label class="stack" style="gap:6px"><span class="kick">Nome da turma</span><input type="text" id="tnome" maxlength="60" value="${esc(S.turma)}"></label>
        <div class="row" style="flex-wrap:wrap;justify-content:flex-start"><button class="btn btn-ghost btn-sm" id="exp">Baixar cópia da turma</button></div>
      </div>
    </div>
    ${porFase.map(([f, l]) => `
      <section class="stack"><h2 class="h2">${f.nome} <span class="muted" style="font-size:14px;font-weight:400">· ${l.length} ${l.length === 1 ? 'Creator' : 'Creators'}</span></h2>
      <div class="students">${l.map(a => cardAluno(a, f)).join('')}</div></section>`).join('')}
    ${blocoAcessos()}
    <form class="card stack" id="novo">
      <span class="kick">Adicionar Creator</span>
      <div class="grid3"><label>Nome<input type="text" id="nn" required maxlength="40"></label><label>Idade<input type="number" id="ni" min="5" max="17" value="10"></label>
      <label>Faixa<select id="nf">${FASES.map(f => `<option value="${f.id}">${f.nome}</option>`).join('')}</select></label></div>
      <button class="btn btn-fill" type="submit" style="justify-self:start">Adicionar</button>
    </form>`;

  $('#aula').onclick = () => {
    const ids = [...document.querySelectorAll('.present input:checked')].map(i => i.value);
    ids.forEach(id => registrar(aluno(id), 'aula')); save(); toast(`Aula registrada pra ${ids.length}`); render();
  };
  document.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    const a = aluno(b.dataset.id), act = b.dataset.act;
    if (act === 'ok' || act === 'refaz') {
      const de = a.fase; checkpoint(a, act === 'ok');
      toast(act === 'ok' ? `${a.nome} passou! ${'Agora na ' + fase(a.fase).nome + '.'}` : `${a.nome} refaz o checkpoint da ${fase(de).nome}`);
    } else if (act === 'sem+' || act === 'sem-') {
      const fx = fase(a.fase);
      a.semana = Math.max(fx.ini, Math.min(fx.fim, a.semana + (act === 'sem+' ? 1 : -1)));
      toast(`${a.nome} na semana ${a.semana}`);
    } else if (act === 'del') {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Confirmar remoção'; return; }
      S.alunos = S.alunos.filter(x => x !== a); toast('Creator removido');
    } else { registrar(a, act); toast(`${a.nome} +${ACOES[act].xp} XP`); }
    save(); render();
  });
  document.querySelectorAll('[data-undo]').forEach(b => b.onclick = () => {
    const a = aluno(b.dataset.id); a.hist.splice(+b.dataset.undo, 1); save(); render();
  });
  document.querySelectorAll('form[data-rec]').forEach(fm => fm.onsubmit = e => {
    e.preventDefault(); const a = aluno(fm.dataset.rec), t = fm.querySelector('textarea').value.trim();
    if (t) { a.recados.push({ d: hoje(), t }); save(); toast('Recado enviado pros pais'); render(); }
  });
  $('#novo').onsubmit = e => {
    e.preventDefault(); const nome = $('#nn').value.trim(); if (!nome) return;
    let id = nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '') || 'aluno'; while (aluno(id)) id += '1';
    S.alunos.push({ id, nome, idade: +$('#ni').value, fase: +$('#nf').value, semana: fase(+$('#nf').value).ini, hist: [], feitas: {}, videos: [], checkpoints: [], recados: [] });
    save(); toast(`${nome} entrou na turma`); render();
  };
  $('#cpd').onchange = e => { S.proximoCheckpoint = e.target.value; save(); toast('Data do checkpoint salva'); };
  $('#exp').onclick = () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `eron-turma-${hoje()}.json`; a.click();
  };
  $('#tnome').onchange = e => { S.turma = e.target.value.trim() || 'Turma ERON'; save(); toast('Nome da turma salvo'); };
  ligarAcessos();
}

/* ---------- acessos: quem pode entrar ---------- */
function blocoAcessos() {
  const nomeDe = id => (aluno(id) || {}).nome || id;
  const lista = (S.acessos || []).map(x => `<li class="row"><span><b>${esc(x.email)}</b> <span class="muted small">${x.papel === 'professor' ? 'professor' : 'família de ' + esc(nomeDe(x.aluno))}</span></span>
      <span class="row" style="gap:6px"><button class="btn btn-ghost btn-sm" data-msg="${esc(x.email)}">Mensagem de boas-vindas</button><button class="btn btn-ghost btn-sm" data-bloq="${esc(x.email)}">Tirar acesso</button></span></li>`).join('');
  return `<section class="card stack" id="acessos">
      <span class="kick" style="color:var(--green)">Acessos · quem pode entrar</span>
      <p class="muted small">Só entra na plataforma o e-mail liberado aqui. Libere depois que a família pagou e assinou. A família cria a senha em "Primeiro acesso", com esse mesmo e-mail, ou entra com o Google se for Gmail.</p>
      ${lista ? `<ul class="list">${lista}</ul>` : '<p class="muted small">Ninguém liberado ainda.</p>'}
      <form class="stack" id="flib"><div class="grid3">
        <label>E-mail<input type="email" id="le" required placeholder="responsavel@email.com"></label>
        <label>Quem é<select id="lq">${S.alunos.map(a => `<option value="${esc(a.id)}">Família de ${esc(a.nome)}</option>`).join('')}<option value="__prof">Professor</option></select></label>
        <span style="align-self:end"><button class="btn btn-fill" type="submit">Liberar acesso</button></span></div>
        ${S.alunos.length ? '' : '<p class="note">Cadastre o Creator primeiro (lá embaixo) pra liberar a família dele.</p>'}
      </form>
      <div class="card stack" id="msgbox" hidden><span class="kick">Mande pro WhatsApp da família</span><textarea id="msgtxt" rows="7" readonly></textarea><button class="btn btn-fill btn-sm" id="msgcp" type="button" style="justify-self:start">Copiar</button></div>
    </section>`;
}
function ligarAcessos() {
  const mostrar = email => {
    const x = (S.acessos || []).find(y => y.email === email) || {}, nome = (aluno(x.aluno) || {}).nome;
    $('#msgtxt').value = `Oi! O acesso${nome ? ' de ' + nome : ''} na Plataforma ERON está liberado.\n\n1. Entre em ${NUVEM.link}\n2. Toque em "Primeiro acesso"\n3. Use este e-mail: ${email}\n4. Crie uma senha e confirme pelo link que chega no e-mail.\n\nSe o e-mail for Gmail, pode só tocar em "Entrar com Google".`;
    $('#msgbox').hidden = false; $('#msgtxt').focus(); $('#msgtxt').select();
  };
  $('#flib').onsubmit = e => {
    e.preventDefault();
    const email = $('#le').value.trim().toLowerCase(), q = $('#lq').value;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('E-mail inválido');
    const dados = q === '__prof' ? { papel: 'professor', d: hoje() } : { papel: 'familia', aluno: q, d: hoje() };
    NUVEM.liberar(email, dados).then(() => { toast('Acesso liberado'); setTimeout(() => mostrar(email), 400); }).catch(x => toast(NUVEM.erroPt(x)));
  };
  document.querySelectorAll('[data-msg]').forEach(b => b.onclick = () => mostrar(b.dataset.msg));
  document.querySelectorAll('[data-bloq]').forEach(b => b.onclick = () => {
    if (b.dataset.bloq === (SESSAO && SESSAO.email)) return toast('Esse é o seu acesso. Não dá pra tirar daqui.');
    if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Confirmar'; return; }
    NUVEM.bloquear(b.dataset.bloq).then(() => toast('Acesso removido')).catch(x => toast(NUVEM.erroPt(x)));
  });
  $('#msgcp').onclick = () => { const t = $('#msgtxt'); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('Copiado'), () => { document.execCommand('copy'); toast('Copiado'); }); };
}

function cardAluno(a, f) {
  const xp = xpFase(a), meta = META_XP[a.fase], pc = percentil(a);
  const ult = a.hist.length ? a.hist.reduce((m, h) => h.d > m ? h.d : m, a.hist[0].d) : null;
  const parado = ult && semanaIdx(ult) >= 2;
  const acts = ['aula', 'desafio', 'documentar', 'fds', 'ajudar'].concat(a.fase > 1 ? ['kit'] : []);
  const hist = a.hist.map((h, i) => [h, i]).slice(-12).reverse();
  return `<div class="card top-bar c-${f.cor}">
    <div class="st-head"><span class="av">${iniciais(a.nome)}</span>
      <div style="min-width:0"><b>${esc(a.nome)}</b> <span class="muted" style="font-size:13px">${a.idade} anos</span>
        <div class="muted" style="font-size:13px">${a.fase < 5 ? `${xp}/${meta} XP` : `${xpTotal(a)} XP total`}${pc ? ` · ${pc.pos}º de ${pc.n}` : ''} · ${ult ? 'última atividade ' + fmt(ult) : 'sem atividade'}</div></div>
      ${parado ? '<span class="pill" style="--c:var(--warn)">parado</span>' : xp >= meta && a.fase < 5 ? '<span class="pill" style="--c:var(--green)">pronto p/ checkpoint</span>' : ''}
    </div>
    ${a.fase < 5 ? `<div class="bar"><i style="width:${Math.min(100, xp / meta * 100)}%"></i></div>` : ''}
    <div class="st-acts" style="align-items:center"><span class="small muted">Semana ${a.semana} de 48 · ${esc(tituloSemana(a.semana))}</span><button class="btn btn-ghost btn-sm" data-id="${a.id}" data-act="sem-" aria-label="Voltar uma semana">−</button><button class="btn btn-ghost btn-sm" data-id="${a.id}" data-act="sem+" aria-label="Avançar uma semana">+ semana</button></div>
    <div class="st-acts">${acts.map(k => `<button class="btn btn-ghost btn-sm" data-id="${a.id}" data-act="${k}">+${ACOES[k].xp} ${ACOES[k].curto}</button>`).join('')}</div>
    ${a.fase < 5 ? `<div class="st-acts"><button class="btn btn-ok btn-sm" data-id="${a.id}" data-act="ok">Checkpoint: passou</button><button class="btn btn-bad btn-sm" data-id="${a.id}" data-act="refaz">Refaz</button></div>` : ''}
    <details><summary>Recado pros pais</summary><form class="stack" data-rec="${a.id}" style="margin-top:8px"><textarea maxlength="400" placeholder="O que ${esc(a.nome)} fez de bom essa semana?"></textarea><button class="btn btn-fill btn-sm" type="submit" style="justify-self:start">Enviar recado</button></form></details>
    <details><summary>Histórico de XP</summary><ul class="hist">${hist.map(([h, i]) => `<li><span>${fmt(h.d)} · ${ACOES[h.a]?.nome || h.a} <span class="num muted">+${xpDe(h)}</span></span><button data-id="${a.id}" data-undo="${i}" aria-label="Desfazer">desfazer</button></li>`).join('') || '<li class="muted">Nada ainda.</li>'}</ul>
      <button class="btn btn-ghost btn-sm" data-id="${a.id}" data-act="del" style="margin-top:8px">Remover Creator</button></details>
  </div>`;
}

window.toast = toast;
