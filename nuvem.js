/* Login de verdade e dados na nuvem (Firebase Auth + Firestore).
   Só entra quem o professor liberou: cada e-mail liberado vira um documento em acessos/{email}.
   Quem barra estranho são as regras do banco (firestore.rules), não esta página. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider, signOut
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, doc, getDoc, setDoc, deleteDoc, updateDoc,
  collection, onSnapshot
} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'pt-BR';
let db;
try { db = initializeFirestore(app, { localCache: persistentLocalCache() }); }
catch (e) { db = initializeFirestore(app, {}); }

const LINK = location.origin + location.pathname;
const emailDe = u => (u && u.email || '').trim().toLowerCase();

/* Traduz os erros do Firebase pro português. */
function erroPt(e) {
  const c = (e && e.code) || '';
  return ({
    'auth/invalid-credential': 'E-mail ou senha não conferem.',
    'auth/wrong-password': 'E-mail ou senha não conferem.',
    'auth/user-not-found': 'E-mail ou senha não conferem.',
    'auth/invalid-email': 'Esse e-mail não parece válido.',
    'auth/email-already-in-use': 'Esse e-mail já tem senha. Use "Entrar" ou "Esqueci minha senha".',
    'auth/weak-password': 'A senha precisa de pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Espere alguns minutos e tente de novo.',
    'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de terminar.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere pop-ups e tente de novo.',
    'auth/network-request-failed': 'Sem internet. Confira a conexão.',
    'permission-denied': 'Sem permissão pra isso.'
  })[c] || 'Não deu certo agora. Tente de novo.';
}

/* ---------- espelho do banco <-> estado S do app ---------- */
let ultimo = {};          // caminho -> JSON do que o banco tem
let parar = [];           // listeners ativos
let PAPEL = null, MEU_ALUNO = null;
const REC_CACHE = {};

function caminhosDe(S) {
  const m = {
    'turma/config': { turma: S.turma || '', proximoCheckpoint: S.proximoCheckpoint || '', aulas: S.aulas || {} },
    'turma/midia': { itens: S.midiaComp || [] }
  };
  S.alunos.forEach(a => {
    const { recados, ...resto } = a;
    m['alunos/' + a.id] = resto;
    m['recados/' + a.id] = { itens: recados || [] };
  });
  return m;
}

function salvar(S) {
  const novo = caminhosDe(S);
  const jobs = [];
  if (PAPEL === 'professor') {
    for (const [p, d] of Object.entries(novo)) {
      const j = JSON.stringify(d);
      if (ultimo[p] !== j) { ultimo[p] = j; jobs.push(setDoc(doc(db, p), d)); }
    }
    for (const p of Object.keys(ultimo)) {
      if (/^(alunos|recados)\//.test(p) && !(p in novo)) { delete ultimo[p]; jobs.push(deleteDoc(doc(db, p))); }
    }
  } else if (PAPEL === 'familia' && MEU_ALUNO) {
    const p = 'alunos/' + MEU_ALUNO, d = novo[p];
    if (d && ultimo[p] !== JSON.stringify(d)) {
      ultimo[p] = JSON.stringify(d);
      jobs.push(updateDoc(doc(db, p), { feitas: d.feitas, hist: d.hist, videos: d.videos }));
    }
  }
  Promise.all(jobs).catch(e => window.toast && window.toast('Não salvou na nuvem: ' + erroPt(e)));
  return true;
}

/* Liga os listeners e chama pronto() quando a primeira leitura de tudo chegou. */
function ouvir(S, aoMudar, pronto) {
  parar.forEach(f => f()); parar = []; ultimo = {};
  const pend = new Set();
  const chegou = k => { if (pend.delete(k) && !pend.size) pronto(); };
  const sub = (k, ref, fn) => {
    pend.add(k);
    parar.push(onSnapshot(ref, snap => {
      fn(snap);
      if (!pend.size) { if (!snap.metadata.hasPendingWrites) aoMudar(); } else chegou(k);
    }, err => { console.warn(k, err); chegou(k); }));
  };
  sub('config', doc(db, 'turma/config'), s => {
    const d = s.exists() ? s.data() : {};
    ultimo['turma/config'] = JSON.stringify({ turma: d.turma || '', proximoCheckpoint: d.proximoCheckpoint || '', aulas: d.aulas || {} });
    S.turma = d.turma || 'Turma ERON'; S.proximoCheckpoint = d.proximoCheckpoint || ''; S.aulas = d.aulas || {};
  });
  sub('midia', doc(db, 'turma/midia'), s => {
    const d = s.exists() ? s.data() : {};
    ultimo['turma/midia'] = JSON.stringify({ itens: d.itens || [] });
    S.midiaComp = d.itens || [];
  });
  sub('alunos', collection(db, 'alunos'), s => {
    Object.keys(ultimo).forEach(p => { if (p.startsWith('alunos/')) delete ultimo[p]; });
    S.alunos = s.docs.map(d => {
      const a = Object.assign({ hist: [], feitas: {}, videos: [], checkpoints: [] }, d.data(), { id: d.id });
      ultimo['alunos/' + d.id] = JSON.stringify((({ recados, ...r }) => r)(Object.assign({}, a)));
      a.recados = REC_CACHE[d.id] || [];
      return a;
    }).sort((x, y) => x.nome.localeCompare(y.nome));
  });
  const recs = PAPEL === 'professor' ? [collection(db, 'recados')] : MEU_ALUNO ? [doc(db, 'recados/' + MEU_ALUNO)] : [];
  recs.forEach(ref => sub('recados', ref, s => {
    const lista = s.docs ? s.docs : [s];
    lista.forEach(d => {
      const itens = d.exists() ? d.data().itens || [] : [];
      ultimo['recados/' + d.id] = JSON.stringify({ itens });
      const a = S.alunos.find(x => x.id === d.id); if (a) a.recados = itens;
      REC_CACHE[d.id] = itens;
    });
  }));
  if (PAPEL === 'professor') sub('acessos', collection(db, 'acessos'), s => {
    S.acessos = s.docs.map(d => Object.assign({ email: d.id }, d.data())).sort((x, y) => x.email.localeCompare(y.email));
  });
}
window.NUVEM = {
  link: LINK,
  erroPt,
  get usuario() { return auth.currentUser; },
  entrar: (e, s) => signInWithEmailAndPassword(auth, e.trim(), s),
  criar: async (e, s) => { const c = await createUserWithEmailAndPassword(auth, e.trim(), s); await sendEmailVerification(c.user, { url: LINK }); return c; },
  reenviar: () => auth.currentUser && sendEmailVerification(auth.currentUser, { url: LINK }),
  esqueci: e => sendPasswordResetEmail(auth, e.trim(), { url: LINK }),
  google: () => signInWithPopup(auth, new GoogleAuthProvider()),
  sair: () => { parar.forEach(f => f()); parar = []; PAPEL = null; MEU_ALUNO = null; return signOut(auth); },
  recarregar: async () => { if (auth.currentUser) { await auth.currentUser.reload(); await auth.currentUser.getIdToken(true); } return auth.currentUser; },
  salvar,
  liberar: (email, dados) => setDoc(doc(db, 'acessos/' + email.trim().toLowerCase()), dados),
  bloquear: email => deleteDoc(doc(db, 'acessos/' + email)),
  /* Lê o acesso do e-mail logado e liga a sincronização. */
  async abrir(S, aoMudar) {
    const u = auth.currentUser, email = emailDe(u);
    let ac = null;
    try { const s = await getDoc(doc(db, 'acessos/' + email)); ac = s.exists() ? s.data() : null; }
    catch (e) { ac = null; }
    if (!ac) return null;
    PAPEL = ac.papel === 'professor' ? 'professor' : 'familia';
    MEU_ALUNO = PAPEL === 'familia' ? ac.aluno : null;
    await new Promise(ok => ouvir(S, aoMudar, ok));
    if (MEU_ALUNO && REC_CACHE[MEU_ALUNO]) { const a = S.alunos.find(x => x.id === MEU_ALUNO); if (a) a.recados = REC_CACHE[MEU_ALUNO]; }
    return { papel: PAPEL, id: MEU_ALUNO, email };
  }
};

onAuthStateChanged(auth, u => window.aoMudarLogin && window.aoMudarLogin(u));
