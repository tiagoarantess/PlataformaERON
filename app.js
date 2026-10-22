/* Plataforma ERON: aluno, pais e professor num site estático.
   Os dados ficam no navegador (localStorage). Exportar/Importar leva a turma pra outro computador. */

const KEY = 'eron-plataforma-v1';
const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hoje = () => new Date().toISOString().slice(0, 10);
const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
const fase = id => FASES.find(f => f.id === id);
const iniciais = n => n.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();

/* ---------- estado ---------- */
let S = load();
function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
  if (!s || !Array.isArray(s.alunos)) s = JSON.parse(JSON.stringify(SEED));
  s.alunos.forEach(a => a.hist.forEach(h => { if (!h.f) h.f = a.fase; }));
  return s;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* sem armazenamento: segue em memória */ } }
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
    ['✓', 'Checkpoint', 'Passou de fase', a.checkpoints.some(c => c.ok)],
    ['■', 'Faixa preta', 'Terminou as 4 fases', a.fase === 5]
  ].concat(a.fase < 5 ? [['★', fase(a.fase).nome + ' firme', 'Meta de XP da Fase ' + a.fase, xpFase(a) >= META_XP[a.fase]]] : []);
}
/* A conquista mais perto de sair, com o que falta. */
function proximaConquista(a) {
  const n = k => a.hist.filter(h => h.a === k).length, seq = sequencia(a);
  const falta = {
    'Primeiro passo': [1, 'Faça a primeira atividade'],
    'Sequência de 3': [3 - seq, `Falta${3 - seq > 1 ? 'm' : ''} ${3 - seq} semana${3 - seq > 1 ? 's' : ''} seguida${3 - seq > 1 ? 's' : ''}`],
    'Mão amiga': [3 - n('ajudar'), `Falta ajudar ${3 - n('ajudar')} colega${3 - n('ajudar') > 1 ? 's' : ''}`],
    'Criador': [1, 'Falta 1 vídeo da missão'],
    'Checkpoint': [2, `Passe no checkpoint da Fase ${a.fase}`],
    'Faixa preta': [9, 'Termine as 4 fases']
  };
  if (a.fase < 5) { const r = META_XP[a.fase] - xpFase(a); falta[fase(a.fase).nome + ' firme'] = [r / 15, `Falta${r > 1 ? 'm' : ''} ${r} XP`]; }
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
    if (a.fase < 5) a.fase++;
  }
}

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

/* ---------- sessão (simulada: sem servidor, qualquer senha entra) ---------- */
const SKEY = 'eron-sessao';
let SESSAO = null;
try { SESSAO = JSON.parse(localStorage.getItem(SKEY)); } catch (e) { SESSAO = null; }
function entrar(s) { SESSAO = s; try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {} }
function sair() { SESSAO = null; try { localStorage.removeItem(SKEY); } catch (e) {} location.hash = '#/entrar'; render(); }
function casa(s) { return s.papel === 'professor' ? '#/professor' : `#/${s.papel}/${s.id}`; }

function render() {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  window.scrollTo(0, 0);
  document.body.classList.toggle('is-login', !SESSAO);
  if (!SESSAO || p[0] === 'entrar') { if (SESSAO) { location.hash = casa(SESSAO); return; } return telaLogin(); }
  // cada perfil só vê o que é dele; o professor vê tudo
  if (SESSAO.papel !== 'professor' && (p[0] !== SESSAO.papel || p[1] !== SESSAO.id)) {
    if (!(SESSAO.papel === 'aluno' && p[0] === 'aluno' && p[1] === SESSAO.id)) { location.hash = casa(SESSAO); return; }
  }
  if (p[0] === 'aluno' && aluno(p[1])) return telaAluno(aluno(p[1]), p[2] || 'trilha');
  if (p[0] === 'pais' && aluno(p[1])) return telaPais(aluno(p[1]));
  if (p[0] === 'professor') return telaProfessor();
  location.hash = casa(SESSAO);
}
window.addEventListener('hashchange', render);

/* ---------- login ---------- */
const PAPEIS = {
  aluno:     { nome: 'Aluno',     cor: 'blue',   campo: 'Seu código de aluno', ph: 'luna', dica: 'Use o código que veio no e-mail de boas-vindas.' },
  pais:      { nome: 'Pais',      cor: 'orange', campo: 'E-mail do responsável', ph: 'voce@email.com', dica: 'O mesmo e-mail do contrato.' },
  professor: { nome: 'Professor', cor: 'green',  campo: 'E-mail da ERON', ph: 'professor@eron.com.br', dica: 'Acesso da equipe.' }
};
let papelLogin = 'aluno';
function acharAluno(txt) {
  const k = txt.trim().toLowerCase().split('@')[0].normalize('NFD').replace(/[^a-z0-9]/g, '');
  return S.alunos.find(a => a.id === k || a.nome.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '') === k);
}
function telaLogin() {
  setWho(''); setTabs(null);
  const P = PAPEIS[papelLogin];
  const linhas = FASES.map(f => `<li class="c-${f.cor}"><span class="ln">${f.id < 5 ? 'L' + f.id : 'FP'}</span><b>${f.nome}</b><span class="muted">${esc(f.titulo)}</span></li>`).join('');
  $('#app').innerHTML = `
  <div class="login">
    <section class="login-hero">
      <span class="kick live"><i></i>Estação ERON · plataforma do aluno</span>
      <h1 class="wide">Entrar<br>na trilha.</h1>
      <div class="strip" aria-hidden="true">${FASES.map(f => `<i class="c-${f.cor}"></i>`).join('')}</div>
      <p class="lead">Quatro fases, um checkpoint por fase e a faixa preta no fim da linha. Entra pra ver onde você está.</p>
      <div class="board"><div class="row"><span class="kick">Linhas da trilha</span><span class="kick" id="relogio"></span></div><ol>${linhas}</ol></div>
    </section>
    <form class="card login-card c-${P.cor}" id="flogin" novalidate>
      <div class="seg" role="tablist" aria-label="Quem está entrando">${Object.entries(PAPEIS).map(([k, v]) =>
        `<button type="button" role="tab" class="c-${v.cor}" aria-selected="${k === papelLogin}" data-papel="${k}">${v.nome}</button>`).join('')}</div>
      <h2 class="h2">${papelLogin === 'aluno' ? 'Bora pra missão.' : papelLogin === 'pais' ? 'Acompanhe a evolução.' : 'Painel da turma.'}</h2>
      <label>${P.campo}<input type="text" id="lu" autocomplete="username" placeholder="${P.ph}" required></label>
      <label>Senha<input type="password" id="lp" autocomplete="current-password" placeholder="••••••••" required></label>
      <p class="erro" id="lerr" role="alert" hidden></p>
      <button class="btn btn-fill login-go" type="submit" id="lgo">Entrar</button>
      <button class="btn btn-ghost" type="button" id="lgoogle"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3zM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22zM6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14zM12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"/></svg>Entrar com Google</button>
      <div class="row"><a href="#/entrar" id="lesq" class="muted small">Esqueci minha senha</a><span class="small muted">${P.dica}</span></div>
      <div class="demo"><span class="kick">Demonstração · qualquer senha entra</span>
        <div class="chips">${papelLogin === 'professor' ? '<button type="button" class="chip" data-rapido="prof">Entrar como professor</button>'
          : S.alunos.map(a => `<button type="button" class="chip" data-rapido="${a.id}">${esc(a.nome)}</button>`).join('')}</div></div>
    </form>
  </div>`;
  const tick = () => { const el = $('#relogio'); if (el) el.textContent = 'Agora ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  tick(); clearInterval(telaLogin.t); telaLogin.t = setInterval(tick, 15000);
  document.querySelectorAll('[data-papel]').forEach(b => b.onclick = () => { papelLogin = b.dataset.papel; telaLogin(); $('#lu').focus(); });
  const erro = m => { const e = $('#lerr'); e.textContent = m; e.hidden = !m; };
  function fazerLogin(user) {
    let s;
    if (papelLogin === 'professor') s = { papel: 'professor', id: 'prof', nome: 'Professor' };
    else {
      const a = acharAluno(user);
      if (!a) return erro(`Não achamos "${user}". Na demo, use o nome de um aluno: ${S.alunos.map(x => x.id).join(', ')}.`);
      s = { papel: papelLogin, id: a.id, nome: a.nome };
    }
    erro(''); const go = $('#lgo'); go.disabled = true; go.textContent = 'Entrando…';
    setTimeout(() => { clearInterval(telaLogin.t); entrar(s); location.hash = casa(s); render(); toast(papelLogin === 'aluno' ? `Bem-vindo de volta, ${s.nome}!` : 'Login feito'); }, 650);
  }
  $('#flogin').onsubmit = e => {
    e.preventDefault();
    const u = $('#lu').value.trim(), pw = $('#lp').value;
    if (!u || !pw) return erro('Preencha os dois campos.');
    fazerLogin(u);
  };
  $('#lgoogle').onclick = () => fazerLogin(papelLogin === 'professor' ? 'prof' : ($('#lu').value.trim() || S.alunos[0].id));
  $('#lesq').onclick = e => { e.preventDefault(); toast('Simulação: um link de nova senha iria pro seu e-mail.'); };
  document.querySelectorAll('[data-rapido]').forEach(b => b.onclick = () => { $('#lu').value = b.dataset.rapido === 'prof' ? 'professor@eron.com.br' : b.dataset.rapido; $('#lp').value = 'demo'; fazerLogin($('#lu').value); });
}

/* ---------- aluno ---------- */
function telaAluno(a, aba) {
  const base = `#/aluno/${a.id}`;
  setWho(`<span class="name">${esc(a.nome)}</span><span class="av">${iniciais(a.nome)}</span>`);
  setTabs([[base + '/trilha', 'Trilha'], [base + '/missao', 'Missão'], [base + '/turma', 'Turma'], [base + '/portfolio', 'Portfólio']], base + '/' + aba);
  const f = fase(a.fase);
  const meta = META_XP[a.fase], xp = xpFase(a), pc = percentil(a), seq = sequencia(a);
  const resumo = `
    <div class="card top-bar c-${f.cor}">
      ${a.fase < 5 ? `<div class="row"><span class="kick">Pontos (XP) da fase</span><span class="num" style="color:var(--c);font-weight:700">${xp} / ${meta}</span></div>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${meta}" aria-valuenow="${xp}"><i style="width:${Math.min(100, xp / meta * 100)}%"></i></div>
      ${xp >= meta ? `<p class="muted" style="margin-top:8px;font-size:13px">Meta batida. Agora quem promove é o checkpoint.</p>` : ''}`
      : `<div class="row"><span class="kick">Faixa preta</span><span class="num" style="font-weight:700">${xpTotal(a)} pontos (XP) no total</span></div>`}
      <div class="row" style="margin-top:14px;align-items:end">
        <div><div class="big">${pc ? 'Top ' + pc.top + '%' : '—'}</div><div class="muted" style="font-size:13px">${pc ? pc.pos + 'º de ' + pc.n + ' na ' + (a.fase < 5 ? 'Fase ' + a.fase : 'faixa preta') : 'Único aluno nesta fase'}</div></div>
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
    $('#app').innerHTML = `${head('Turma', a.fase < 5 ? 'Ranking da Fase ' + a.fase : 'Ranking dos faixas pretas')}
      <div class="cols">
        <div class="card"><ol class="rank">${pares.map((x, i) => `
          <li class="${x.id === a.id ? 'me' : ''}"><span class="pos">${i + 1}º</span><span class="av">${iniciais(x.nome)}</span><span>${esc(x.nome)}${x.id === a.id ? ' (você)' : ''}</span><span class="num">${xpFase(x)} XP</span></li>`).join('')}</ol>
          <p class="note" style="margin-top:10px">O ranking compara só quem está na mesma fase. Quem entrou depois não fica sempre no fim da fila.</p>
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
  const m = missaoAtual(a);
  const inicio = FASES.filter(x => x.id < a.fase).reduce((t, x) => t + x.aulas, 0);
  const total = FASES.reduce((t, x) => t + x.aulas, 0);
  const aulaFase = m && m.aula ? m.aula - inicio : null;
  const aulaInfo = a.fase < 5 && m && m.aula
    ? `<div class="aula-atual"><span class="kick">Aula atual</span><b>Aula ${m.aula} de ${total}</b><span class="muted">${aulaFase}ª de ${f.aulas} na Fase ${a.fase} · ${esc(m.titulo)}</span></div>`
    : `<div class="aula-atual"><span class="kick">Treino atual</span><b>${esc(m ? m.titulo : 'Treino livre')}</b></div>`;
  $('#app').innerHTML = `${head('Minha trilha', a.fase < 5 ? `Fase ${a.fase} · ${f.nome}` : 'Faixa preta')}
    <div class="card"><div class="mapa-h"><div class="mapa-h-in">
      <svg viewBox="0 0 ${LARG} ${ALT}" aria-hidden="true">${pts.slice(0, -1).map((p, k) =>
        `<path d="${trecho(k)}" class="${FASES[k + 1].id <= a.fase ? 'feito' : ''}"/>`).join('')}</svg>
      ${FASES.map((x, k) => { const st = estado(x), p = pts[k];
        const dot = st === 'done' ? '✓' : x.id === 5 ? '<span class="belt"></span>' : x.id;
        const tag = st === 'done' ? 'Checkpoint ok' : st === 'now' ? 'Você está aqui' : 'Bloqueada';
        return `<button class="no-h ${st} c-${x.cor} ${k % 2 ? 'cima' : ''}" style="left:${p.x}%;top:${p.y / ALT * 100}%" data-f="${x.id}" aria-label="${esc(x.nome)}: ${tag}">
          <span class="dot">${dot}</span><span class="rot"><b>${esc(x.nome)}</b><small>${tag}</small></span></button>`; }).join('')}
    </div></div></div>
    <div class="cols" style="margin-top:16px">
      <div class="stack">${resumo.replace('<div class="row" style="margin-top:14px;align-items:end">', aulaInfo + '<div class="row" style="margin-top:14px;align-items:end">')}
        ${a.fase < 5 ? `<div class="card chk c-${f.cor}"><span class="kick" style="color:var(--c)">Próximo checkpoint</span><p style="font-weight:700;font-size:17px;margin-top:6px">${esc(f.checkpoint)}</p>${S.proximoCheckpoint ? `<p class="muted" style="font-size:13px;margin-top:4px">Marcado pra ${fmt(S.proximoCheckpoint)}</p>` : ''}</div>` : ''}
      </div>
      <div class="card" id="det"></div>
    </div>`;
  const detalhe = id => {
    const x = fase(id), st = estado(x);
    $('#det').className = `card top-bar c-${x.cor}`;
    $('#det').innerHTML = `<span class="kick" style="color:var(--c)">${x.id < 5 ? 'Fase ' + x.id : 'Depois da Fase 4'} · ${x.aulas ? x.aulas + ' aulas' : 'sem prazo'}</span>
      <p style="font-weight:800;font-size:18px;margin-top:6px">${esc(x.nome)}: ${esc(x.titulo)}</p>
      <p class="muted" style="margin-top:4px">${esc(x.resumo)}</p>
      <p style="margin-top:10px;font-size:14px"><span class="kick">Checkpoint</span><br>${esc(x.checkpoint)}</p>
      ${st === 'lock' ? '<p class="note" style="margin-top:8px">Abre quando você passar no checkpoint da fase anterior.</p>' : ''}`;
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
  setTabs(null);
  const f = fase(a.fase), sem = xpSemanas(a, 6), max = Math.max(1, ...sem);
  const aulasMes = a.hist.filter(h => h.a === 'aula' && semanaIdx(h.d) < 4).length;
  const missoesFeitas = Object.values(a.feitas).reduce((t, l) => t + l.length, 0);
  const desafios = a.hist.filter(h => h.a === 'desafio').length;
  const ultimoCp = a.checkpoints.filter(c => c.ok).slice(-1)[0];
  $('#app').innerHTML = `
    <div class="stack" style="gap:4px"><span class="kick">Painel da família</span>
      <h1 class="h1">${esc(a.nome)} está ${a.fase < 5 ? `na Fase ${a.fase} · ${f.nome}` : 'na faixa preta'}${ultimoCp ? `, passou de fase em ${fmt(ultimoCp.d)}` : ''}.</h1></div>
    <div class="cols">
      <div class="stack">
        <div class="grid3">
          <div class="card"><span class="kick">Aulas no mês</span><div class="big">${aulasMes}</div><span class="muted" style="font-size:13px">de 4 a 5 previstas</span></div>
          <div class="card"><span class="kick">Desafios</span><div class="big">${desafios}</div><span class="muted" style="font-size:13px">cumpridos no total</span></div>
          <div class="card"><span class="kick">Sequência</span><div class="big">${sequencia(a)}</div><span class="muted" style="font-size:13px">semanas ativas</span></div>
        </div>
        <div class="card"><div class="row"><span class="kick">XP por semana</span><span class="note">últimas 6</span></div>
          <div class="weeks" role="img" aria-label="XP nas últimas 6 semanas: ${sem.join(', ')}">${sem.map((v, i) => `<div><span><i style="height:${Math.round(v / max * 100)}%"></i></span><small>${i === 5 ? 'agora' : v}</small></div>`).join('')}</div>
        </div>
        ${a.fase < 5 ? `<div class="card top-bar c-${f.cor}"><span class="kick" style="color:var(--c)">O que falta pra passar de fase</span><p style="font-weight:700;margin-top:6px">${esc(f.checkpoint)}</p><p class="muted" style="font-size:14px;margin-top:4px">Na ERON quem promove é o checkpoint, um desafio prático. Tempo e presença sozinhos não passam de fase.</p></div>` : ''}
      </div>
      <div class="stack">
        <div class="card"><span class="kick" style="color:var(--accent)">Recado do professor</span>
          ${a.recados.length ? a.recados.slice().reverse().map(r => `<p style="margin-top:8px">${esc(r.t)}</p><p class="note">${fmt(r.d)}</p>`).join('') : '<p class="muted" style="margin-top:8px">Nenhum recado ainda.</p>'}
        </div>
        <div class="card"><span class="kick">Vídeos de ${esc(a.nome)}</span>
          ${a.videos.length ? `<ul class="list" style="margin-top:12px">${a.videos.slice(0, 4).map(v => `<li class="video"><span class="thumb">▶</span><div>${v.url ? `<a href="${esc(v.url)}" target="_blank" rel="noopener"><b>${esc(v.t)}</b></a>` : `<b>${esc(v.t)}</b>`}<div class="muted" style="font-size:13px">${fmt(v.d)}</div></div></li>`).join('')}</ul>` : '<p class="muted" style="margin-top:8px">Os vídeos das missões aparecem aqui.</p>'}
        </div>
        <p class="note">${missoesFeitas} tarefas de missão feitas · ${xpTotal(a)} XP no total.</p>
      </div>
    </div>`;
}

/* ---------- professor ---------- */
function telaProfessor() {
  setWho(`<span class="name">Professor</span><span class="av" style="color:var(--green)">PR</span>`);
  setTabs(null);
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
        <div class="row" style="flex-wrap:wrap;justify-content:flex-start"><button class="btn btn-ghost btn-sm" id="exp">Exportar turma</button><label class="btn btn-ghost btn-sm">Importar<input type="file" id="imp" accept="application/json" hidden></label><button class="btn btn-ghost btn-sm" id="rst">Voltar ao exemplo</button></div>
      </div>
    </div>
    ${porFase.map(([f, l]) => `
      <section class="stack"><h2 class="h2">${f.id < 5 ? 'Fase ' + f.id + ' · ' : ''}${f.nome} <span class="muted" style="font-size:14px;font-weight:400">· ${l.length} ${l.length === 1 ? 'aluno' : 'alunos'}</span></h2>
      <div class="students">${l.map(a => cardAluno(a, f)).join('')}</div></section>`).join('')}
    <form class="card stack" id="novo">
      <span class="kick">Adicionar aluno</span>
      <div class="grid3"><label>Nome<input type="text" id="nn" required maxlength="40"></label><label>Idade<input type="number" id="ni" min="5" max="17" value="10"></label>
      <label>Fase<select id="nf">${FASES.map(f => `<option value="${f.id}">${f.id < 5 ? 'Fase ' + f.id + ' · ' : ''}${f.nome}</option>`).join('')}</select></label></div>
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
      toast(act === 'ok' ? `${a.nome} passou! ${a.fase === 5 ? 'Faixa preta.' : 'Agora na Fase ' + a.fase + '.'}` : `${a.nome} refaz o checkpoint da Fase ${de}`);
    } else if (act === 'del') {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Confirmar remoção'; return; }
      S.alunos = S.alunos.filter(x => x !== a); toast('Aluno removido');
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
    S.alunos.push({ id, nome, idade: +$('#ni').value, fase: +$('#nf').value, hist: [], feitas: {}, videos: [], checkpoints: [], recados: [] });
    save(); toast(`${nome} entrou na turma`); render();
  };
  $('#cpd').onchange = e => { S.proximoCheckpoint = e.target.value; save(); toast('Data do checkpoint salva'); };
  $('#exp').onclick = () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `eron-turma-${hoje()}.json`; a.click();
  };
  $('#imp').onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    file.text().then(t => { const d = JSON.parse(t); if (!Array.isArray(d.alunos)) throw 0; S = d; save(); S = load(); toast('Turma importada'); render(); })
      .catch(() => toast('Arquivo inválido'));
  };
  $('#rst').onclick = e => {
    if (e.target.dataset.sure !== '1') { e.target.dataset.sure = '1'; e.target.textContent = 'Apaga tudo? Clique de novo'; return; }
    S = JSON.parse(JSON.stringify(SEED)); S.alunos.forEach(a => a.hist.forEach(h => { if (!h.f) h.f = a.fase; })); save(); toast('Turma de exemplo restaurada'); render();
  };
}

function cardAluno(a, f) {
  const xp = xpFase(a), meta = META_XP[a.fase], pc = percentil(a);
  const ult = a.hist.length ? a.hist.reduce((m, h) => h.d > m ? h.d : m, a.hist[0].d) : null;
  const parado = ult && semanaIdx(ult) >= 2;
  const acts = ['aula', 'desafio', 'documentar', 'fds', 'ajudar'];
  const hist = a.hist.map((h, i) => [h, i]).slice(-12).reverse();
  return `<div class="card top-bar c-${f.cor}">
    <div class="st-head"><span class="av">${iniciais(a.nome)}</span>
      <div style="min-width:0"><b>${esc(a.nome)}</b> <span class="muted" style="font-size:13px">${a.idade} anos</span>
        <div class="muted" style="font-size:13px">${a.fase < 5 ? `${xp}/${meta} XP` : `${xpTotal(a)} XP total`}${pc ? ` · ${pc.pos}º de ${pc.n}` : ''} · ${ult ? 'última atividade ' + fmt(ult) : 'sem atividade'}</div></div>
      ${parado ? '<span class="pill" style="--c:var(--warn)">parado</span>' : xp >= meta && a.fase < 5 ? '<span class="pill" style="--c:var(--green)">pronto p/ checkpoint</span>' : ''}
    </div>
    ${a.fase < 5 ? `<div class="bar"><i style="width:${Math.min(100, xp / meta * 100)}%"></i></div>` : ''}
    <div class="st-acts">${acts.map(k => `<button class="btn btn-ghost btn-sm" data-id="${a.id}" data-act="${k}">+${ACOES[k].xp} ${ACOES[k].curto}</button>`).join('')}</div>
    ${a.fase < 5 ? `<div class="st-acts"><button class="btn btn-ok btn-sm" data-id="${a.id}" data-act="ok">Checkpoint: passou</button><button class="btn btn-bad btn-sm" data-id="${a.id}" data-act="refaz">Refaz</button></div>` : ''}
    <details><summary>Recado pros pais</summary><form class="stack" data-rec="${a.id}" style="margin-top:8px"><textarea maxlength="400" placeholder="O que ${esc(a.nome)} fez de bom essa semana?"></textarea><button class="btn btn-fill btn-sm" type="submit" style="justify-self:start">Enviar recado</button></form></details>
    <details><summary>Histórico de XP</summary><ul class="hist">${hist.map(([h, i]) => `<li><span>${fmt(h.d)} · ${ACOES[h.a]?.nome || h.a} <span class="num muted">+${xpDe(h)}</span></span><button data-id="${a.id}" data-undo="${i}" aria-label="Desfazer">desfazer</button></li>`).join('') || '<li class="muted">Nada ainda.</li>'}</ul>
      <button class="btn btn-ghost btn-sm" data-id="${a.id}" data-act="del" style="margin-top:8px">Remover aluno</button></details>
  </div>`;
}

render();
