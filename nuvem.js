/* Nuvem da ERON (Firebase Auth + Firestore, projeto plataforma-eron). Só liga se firebase-config.js tiver a config.
   Estrutura (igual às regras publicadas no console, cópia em firestore.rules):
     acessos/{email}   { papel: 'professor' | 'familia', aluno, quem: 'pais' | 'creator' }   quem pode entrar (só o professor grava)
                       o Creator usa papel 'familia' + quem 'creator': as regras publicadas já deixam ele ler a turma e marcar tarefa/XP/vídeo só dele
     turma/estado      { turma, proximoCheckpoint, aulas, midiaComp }
     alunos/{id}       progresso de cada Creator (todo mundo liberado lê, pro ranking)
     recados/{id}      { lista }  recados do professor, só a família daquele Creator lê */
window.NUVEM = (function () {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey) return { ativo: false };
  const BASE = 'https://www.gstatic.com/firebasejs/12.18.0/';
  let fb = null;
  const norm = e => String(e || '').trim().toLowerCase();

  async function init() {
    if (fb) return fb;
    const [app, A, F] = await Promise.all([import(BASE + 'firebase-app.js'), import(BASE + 'firebase-auth.js'), import(BASE + 'firebase-firestore.js')]);
    const a = app.initializeApp(cfg);
    const auth = A.getAuth(a); auth.languageCode = 'pt';
    fb = { auth, db: F.getFirestore(a), A, F };
    return fb;
  }

  const MSG = {
    'auth/invalid-credential': 'E-mail ou senha errados. Primeira vez? Clique em "Primeiro acesso".',
    'auth/user-not-found': 'Esse e-mail ainda não tem conta. Clique em "Primeiro acesso".',
    'auth/wrong-password': 'Senha errada.',
    'auth/email-already-in-use': 'Esse e-mail já tem conta. Use "Entrar" ou "Esqueci minha senha".',
    'auth/weak-password': 'Senha fraca: use pelo menos 6 caracteres.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/too-many-requests': 'Muitas tentativas. Espere uns minutos.',
    'auth/popup-closed-by-user': 'Janela do Google fechada antes de terminar.',
    'auth/unauthorized-domain': 'Este site ainda não está liberado no Firebase (Authentication > Configurações > Domínios autorizados).',
    'auth/operation-not-allowed': 'Esse tipo de login não está ativado no Firebase.',
    'permission-denied': 'Sem permissão. Confira se as regras do Firestore foram publicadas.'
  };
  const erroTxt = e => MSG[e && e.code] || (/import|fetch/i.test(e && e.message || '') ? 'Não conectou no Firebase. Confira a internet e recarregue a página.' : '') || (e && e.message) || 'Não deu certo. Tente de novo.';

  /* Descobre o papel de quem está logado, pela coleção acessos. */
  async function papelDe(user) {
    const email = norm(user.email);
    if (!user.emailVerified) return { pendente: true, email };
    const { db, F } = await init();
    let r;
    try { r = await F.getDoc(F.doc(db, 'acessos', email)); } catch (e) { return { semVinculo: true, email }; }
    if (!r.exists()) return { semVinculo: true, email };
    const d = r.data();
    if (d.papel === 'professor') return { papel: 'professor', id: 'prof', nome: 'Professor', email };
    if (d.papel === 'familia' && d.aluno) return { papel: d.quem === 'creator' ? 'aluno' : 'pais', id: d.aluno, email };
    return { semVinculo: true, email };
  }

  async function entrar(email, senha) {
    const { auth, A } = await init();
    const c = await A.signInWithEmailAndPassword(auth, norm(email), senha);
    return papelDe(c.user);
  }
  async function entrarGoogle() {
    const { auth, A } = await init();
    const c = await A.signInWithPopup(auth, new A.GoogleAuthProvider());
    return papelDe(c.user);
  }
  async function primeiroAcesso(email, senha) {
    const { auth, A } = await init();
    const c = await A.createUserWithEmailAndPassword(auth, norm(email), senha);
    await A.sendEmailVerification(c.user);
    await A.signOut(auth);
  }
  async function reenviarConfirmacao() {
    const { auth, A } = await init();
    if (auth.currentUser) await A.sendEmailVerification(auth.currentUser);
  }
  async function esqueci(email) {
    const { auth, A } = await init();
    await A.sendPasswordResetEmail(auth, norm(email));
  }
  async function sair() {
    if (!fb) return; await fb.A.signOut(fb.auth);
  }
  /* Espera o Firebase dizer se ainda tem alguém logado (ao recarregar a página). */
  async function restaurar() {
    const { auth, A } = await init();
    const user = await new Promise(ok => { const off = A.onAuthStateChanged(auth, u => { off(); ok(u); }); });
    return user ? papelDe(user) : null;
  }

  /* Monta o estado S a partir da nuvem. Professor recebe tudo; família recebe a turma (ranking) e só os recados do filho. */
  async function carregar(sessao) {
    const { db, F } = await init();
    const [t, al] = await Promise.all([F.getDoc(F.doc(db, 'turma', 'estado')), F.getDocs(F.collection(db, 'alunos'))]);
    const base = t.exists() ? t.data() : {};
    const S = { turma: base.turma || 'Turma ERON', proximoCheckpoint: base.proximoCheckpoint || '', aulas: base.aulas || {}, midiaComp: base.midiaComp || [], alunos: [] };
    al.forEach(d => S.alunos.push(Object.assign({ hist: [], feitas: {}, videos: [], checkpoints: [], recados: [] }, d.data(), { id: d.id, recados: [] })));
    S.alunos.sort((x, y) => (x.ordem ?? 0) - (y.ordem ?? 0));
    const ids = sessao.papel === 'professor' ? S.alunos.map(a => a.id) : [sessao.id];
    await Promise.all(ids.map(async id => {
      const r = await F.getDoc(F.doc(db, 'recados', id)).catch(() => null);
      const a = S.alunos.find(x => x.id === id); if (a && r && r.exists()) a.recados = r.data().lista || [];
    }));
    if (sessao.papel === 'professor') {
      const ac = await F.getDocs(F.collection(db, 'acessos'));
      ac.forEach(d => { const v = d.data(); const a = v.papel === 'familia' && S.alunos.find(x => x.id === v.aluno); if (a) a[v.quem === 'creator' ? 'emailCreator' : 'emailResp'] = d.id; });
      antes = { ids: new Set(S.alunos.map(a => a.id)), emails: new Set(S.alunos.flatMap(a => [norm(a.emailResp), norm(a.emailCreator)]).filter(Boolean)) };
    }
    return S;
  }

  /* Professor grava tudo: turma, cada Creator, recados e o acesso da família. Apaga o que saiu. */
  let antes = { ids: new Set(), emails: new Set() }, timer = null, ultimo = null;
  async function salvarTurma(S) {
    const { db, F } = await init();
    const L = JSON.parse(JSON.stringify(S));
    const b = F.writeBatch(db);
    b.set(F.doc(db, 'turma', 'estado'), { turma: L.turma || '', proximoCheckpoint: L.proximoCheckpoint || '', aulas: L.aulas || {},
      midiaComp: (L.midiaComp || []).filter(m => !m.data) }); // fotos do computador ficam só no navegador (limite de 1 MB por doc)
    const ids = new Set(), emails = new Set();
    L.alunos.forEach((a, i) => {
      const { recados, emailResp, emailCreator, id, ...resto } = a;
      ids.add(id);
      b.set(F.doc(db, 'alunos', id), Object.assign(resto, { ordem: i }));
      b.set(F.doc(db, 'recados', id), { lista: recados || [] });
      const e = norm(emailResp);
      if (e) { emails.add(e); b.set(F.doc(db, 'acessos', e), { papel: 'familia', aluno: id, quem: 'pais' }); }
      const c = norm(emailCreator);
      if (c && c !== e) { emails.add(c); b.set(F.doc(db, 'acessos', c), { papel: 'familia', aluno: id, quem: 'creator' }); }
    });
    antes.ids.forEach(id => { if (!ids.has(id)) { b.delete(F.doc(db, 'alunos', id)); b.delete(F.doc(db, 'recados', id)); } });
    antes.emails.forEach(e => { if (!emails.has(e)) b.delete(F.doc(db, 'acessos', e)); });
    await b.commit();
    antes = { ids, emails };
  }
  /* Creator grava só o que é dele e o que as regras deixam: tarefas, XP (hist) e vídeos. */
  async function salvarProgresso(a) {
    const { db, F } = await init();
    const L = JSON.parse(JSON.stringify(a));
    await F.updateDoc(F.doc(db, 'alunos', a.id), { feitas: L.feitas || {}, hist: L.hist || [], videos: L.videos || [] });
  }
  /* Junta vários cliques numa gravação só. */
  function salvarDepois(S, aviso) {
    ultimo = S; clearTimeout(timer);
    timer = setTimeout(() => salvarTurma(ultimo).then(() => aviso && aviso(null)).catch(e => aviso && aviso(erroTxt(e))), 700);
  }

  return { ativo: true, entrar, entrarGoogle, primeiroAcesso, reenviarConfirmacao, esqueci, sair, restaurar, carregar, salvarTurma, salvarDepois, salvarProgresso, erroTxt, norm };
})();
