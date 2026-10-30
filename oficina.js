/* Oficina 3D do Creator: o robô de cada semana do plano de 48 semanas (Three.js + GSAP).
   app.js carrega este módulo só quando alguém abre uma tela com 3D e chama montar(slot, opcoes).
   Modos: creator (até a semana em que está), pais (só a semana atual) e professor (tudo + edição das aulas). */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
const gsap = window.gsap;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ================= DADOS DO PLANO (oficial 22/10, em data.js) ================= */
const F = {
  amarela:{nome:"F1 Amarela",short:"Amarela",ini:1,fim:8,cor:"#F5C542",exame:"Motor DC girando e mudando de velocidade no simulador",sai:"motor girando no Tinkercad, sem kit nenhum"},
  verde:{nome:"F2 Verde",short:"Verde",ini:9,fim:20,cor:"#3DDC84",exame:"Robô no chassi anda e para sozinho antes do obstáculo",sai:"robô que anda e para antes de bater"},
  azul:{nome:"F3 Azul",short:"Azul",ini:21,fim:33,cor:"#4DB2FF",exame:"Segue a linha, obedece sinais de cor e desvia do obstáculo",sai:"robô que segue linha, lê cor e desvia"},
  roxa:{nome:"F4 Roxa",short:"Roxa",ini:34,fim:44,cor:"#A970FF",exame:"Acha a bolinha, pega com a garra e leva até a área segura",sai:"robô de resgate com garra 3D"},
  preta:{nome:"FP Preta",short:"Preta",ini:45,fim:48,cor:"#E8E8EE",exame:"Sem exame: Influencer treina pra competição",sai:"Influencer competindo e puxando os novos"}
};
function faixaDe(n){for(const k in F){if(n>=F[k].ini&&n<=F[k].fim)return k}}
const W0 = PLANO.map(([n,aula,sabe,desafio,mat,tipo])=>({n,aula,sabe,desafio,mat,tipo:tipo||"aula",f:faixaDe(n)}));
function xpPadrao(w){
  const it=[["Aula",10]];
  if(w.tipo==="exame")it.push(["Exame",100]); else it.push(["Desafio",20],["Documentar",15],["Fim de semana",10]);
  if(w.n>=9)it.push(["Foto do kit",10]);
  return it;
}
/* aula da semana n = plano oficial + o que o professor editou por cima */
let host=null;
function aula(n){const base=W0[n-1],ed=(host&&host.aula(n))||null;const w={...base,...(ed||{}),n,f:base.f,tipo:base.tipo,editada:!!ed};
  w.xpItens=(ed&&ed.xp)?xpPadrao(base).map(([k,v])=>[k,ed.xp[k]??v]):xpPadrao(base);return w}
function xpDe(w){const it=w.xpItens.filter(i=>i[1]>0);return {it,total:it.reduce((s,i)=>s+i[1],0)}}

const PART_INFO = {
  uno:["Placa Uno R3","O cérebro: roda o código que o Creator escreve."],
  proto:["Protoboard 400 pontos","Monta circuitos encaixando, sem solda."],
  led1:["LED vermelho","Primeiro circuito: acender e piscar."],
  led2:["LED amarelo","Sinais e sequências de luz."],
  led3:["LED verde","Completa o semáforo."],
  button:["Chave momentânea","Manda um sinal quando é apertada."],
  buzzer:["Buzzer","Faz som: bipes, alarmes e música."],
  ldr:["LDR 5 mm","Sensor de luz: mede a claridade do ambiente."],
  motorDC:["Motor DC com redução","Gira a roda; a velocidade vem do PWM."],
  wiresB:["Jumpers","Ligam a placa à protoboard."],
  chassis:["Chassi 10x20 cm","O corpo do robô, com adesivo ERON."],
  motors:["2 motores com redução","Fazem o robô andar."],
  wheels:["2 rodas","Tração do robô."],
  caster:["Roda boba","Apoio da frente, gira pra qualquer lado."],
  l298n:["Ponte H L298N","Controla velocidade e sentido dos motores."],
  battery:["Suporte + 2 baterias 18650","Energia do robô: 7,4 V."],
  wiresR:["Fiação do robô","Liga placa, ponte H, motores e sensores."],
  hcsr04:["Sensor ultrassônico","Os olhos: mede a distância até o obstáculo."],
  line:["Seguidor de linha 5 canais","Enxerga a fita preta no chão."],
  color:["Sensor de cor TCS34725","Lê vermelho, verde e azul dos sinais."],
  servo:["Servo SG90","Motor de ângulo: abre e fecha a garra."],
  claw:["Garra impressa em 3D","Pega e solta a bolinha."],
  ball:["Bolinha de resgate","O alvo da missão."],
  box:["Caixa organizadora","Cada peça no seu lugar, com adesivo ERON."]
};

/* Etapas: como o projeto fica em cada semana */
const BENCH1=["uno","proto","wiresB"];
const ROBOT_BASE=["chassis","motors","wheels","caster"];
const ROBOT_POWER=[...ROBOT_BASE,"uno","l298n","battery","wiresR"];
/* Faixa Preta: duas modalidades, cada uma na sua arena. Nunca linha e resgate na mesma cena. */
let fpModo="linha";
const fpPadrao=n=>n===46?"linha":"resgate";
function stageFor(n){
  if(n<=5){const p=[...BENCH1,"led1"]; if(n>=2)p.push("led2","led3"); if(n>=3)p.push("button"); if(n>=4)p.push("buzzer"); if(n>=5)p.push("ldr");
    return {mode:"bench",env:"sim",holo:true,parts:p,action:["blink","semaforo","button","buzzer","ldr"][n-1],cam:"bench",
      badge:"simulador Tinkercad",look:["Um LED piscando na protoboard virtual. Ainda sem kit: tudo no navegador.","Três LEDs viram um semáforo que repete pra sempre.","O botão entra: um toque liga, outro desliga.","O buzzer toca as 8 notas do desafio.","O LDR lê a luz e acende o LED quando escurece."][n-1]};}
  if(n<=8) return {mode:"bench",env:"sim",holo:true,parts:[...BENCH1,"button","motorDC"],action:"motor",cam:"bench",badge:"simulador Tinkercad",
      look:n===6?"O motor DC gira e acelera em rampa com PWM.":n===7?"Exame: o motor liga pelo botão e muda de velocidade. O Creator explica o código.":"Recuperação, ou desafio extra: o motor obedece o sensor de luz."};
  if(n===9) return {mode:"layout",env:"floor",parts:["box","uno","proto","led1","led2","led3","button","buzzer","ldr","chassis","motors","wheels","caster","l298n","battery","hcsr04"],action:"none",cam:"layout",badge:"Kit Iniciante chegou",
      look:"A caixa abre e cada peça ganha nome. Primeiro upload real na placa."};
  if(n===10) return {mode:"bench",env:"bench",holo:false,parts:[...BENCH1,"led1","led2","led3","button","buzzer"],action:"semaforo",cam:"bench",badge:"bancada real",
      look:"O mesmo circuito do simulador, agora na protoboard de verdade."};
  if(n===11) return {mode:"robot",env:"floor",parts:ROBOT_BASE,action:"none",cam:"robot",badge:"montagem",look:"Chassi 10x20 com motores, rodas e roda boba parafusados."};
  if(n===12) return {mode:"robot",env:"floor",parts:ROBOT_POWER,action:"spin",cam:"robot",badge:"montagem",look:"Placa, ponte H e baterias no lugar: as duas rodas giram pela primeira vez."};
  if(n<=14) return {mode:"robot",env:"floor",parts:ROBOT_POWER,action:n===13?"backforth":"square",cam:"floor",badge:"robô andando",
      look:n===13?"frente(), tras(), esquerda(), direita(): o robô vai e volta.":"Ajuste de PWM: o robô desenha um quadrado no chão."};
  const R2=[...ROBOT_POWER,"hcsr04"];
  if(n===15) return {mode:"robot",env:"floor",parts:R2,action:"ping",cam:"robot",badge:"sensor novo",look:"O ultrassônico entra na frente e mede a distância em cm."};
  if(n<=20) return {mode:"robot",env:"wall",parts:R2,action:"wall",cam:"floor",badge:n===19?"exame de faixa":"robô decide",
      look:n===19?"Exame: anda sozinho e para antes da parede, 3 vezes seguidas.":"Anda, vê a parede, para, recua e gira. Primeira decisão do robô."};
  const R3=[...R2,"line"];
  if(n<=25) return {mode:"robot",env:"track",parts:R3,action:n<=22?"lineIdle":"follow",cam:"track",badge:"Kit Avançado",
      look:n<=22?"O seguidor de 5 canais lê a fita preta: o robô sabe onde está a linha.":n===23?"Liga-desliga: o robô segue a linha, ainda tremendo.":n===24?"Controle proporcional: segue a linha sem serpentear.":"Duas curvas: o robô guarda a última posição e reencontra a linha."};
  if(n<=27) return {mode:"robot",env:"track",obstacle:true,parts:R3,action:"detour",cam:"track",badge:"desvio",
      look:n===26?"Uma caixa no caminho: contorna e volta pra linha.":"Máquina de estados: SEGUINDO, DESVIANDO, PROCURANDO, PARADO."};
  const R4=[...R3,"color"];
  if(n<=33) return {mode:"robot",env:"track",obstacle:n>=31,signs:true,parts:R4,action:n>=31?"full":"signs",cam:"track",badge:n===32?"exame de faixa":"sinais de cor",
      look:n===28?"O sensor de cor olha pro chão e lê R, G e B.":n<=30?"Verde vira, vermelho para, azul acelera.":n===32?"Exame: linha, sinal de cor e obstáculo na mesma pista.":"Pista completa: curva, sinal e obstáculo juntos."};
  const R5=[...R4,"servo"];
  if(n===34) return {mode:"robot",env:"floor",parts:R5,action:"servo",cam:"robot",badge:"servo",look:"O servo SG90 varre de 0 a 180 graus com pausas."};
  if(n===35) return {mode:"robot",env:"floor",parts:[...R5,"claw"],action:"claw",cam:"robot",badge:"garra 3D",look:"A garra impressa em 3D abre e fecha por comando."};
  if(n===36) return {mode:"robot",env:"floor",parts:[...R5,"claw","ball"],action:"grab",cam:"robot",badge:"garra 3D",look:"pegar() e soltar(): a bolinha vai 20 cm adiante."};
  const R6=[...R5,"claw","ball"];
  if(n<=44) return {mode:"robot",env:"arena",parts:R6,action:"mission",cam:"arena",badge:n===43?"exame de faixa":"missão de resgate",
      look:n===37?"A arena de papelão e o plano no papel antes do código.":n===43?"Exame: acha a bolinha, pega e leva pra área segura.":"Navegar, localizar, pegar, entregar: a missão completa."};
  const FP=[...R5,"claw"];
  if(n===45) return {mode:"robot",env:"cer",parts:FP,action:"cer",cam:"cer",badge:"Faixa Preta",fp:false,
      look:"Cerimônia: o Creator vira Influencer, com os pais assistindo."};
  const lead=n===48?"O Influencer apresenta o robô pros pais e planeja o ano 2. ":n===47?"Mini-torneio interno, rodadas cronometradas. ":"Treino no padrão do regulamento, cronômetro e equipe com Capitão. ";
  if(fpModo==="linha") return {mode:"robot",env:"compLinha",parts:FP,action:"compLinha",cam:"compLinha",badge:"pista de linha",fp:true,
      look:lead+"Modalidade seguidor de linha: pista própria, só linha, contra o relógio."};
  return {mode:"robot",env:"compResgate",parts:FP,action:"compResgate",cam:"arena",badge:"arena de resgate",fp:true,
      look:lead+"Modalidade resgate: arena própria, sem linha. O robô acha a bolinha, pega com a garra, carrega e solta na área de resgate."};
}

/* ================= DOM ================= */
const R=document.createElement("div");R.className="of";
R.innerHTML=`
  <div class="o-top">
    <div class="o-ttl"><span class="o-eyebrow" id="oEyebrow">Plano de aulas · 48 semanas</span><h2 id="oTitle">O robô do Creator, semana a semana</h2></div>
    <div class="o-belts" id="oBelts" role="group" aria-label="Pular para a faixa"></div>
  </div>
  <div class="o-main">
    <div class="o-stage">
      <div class="o-vp" id="oVp">
        <div class="o-loading" id="oLoading">montando a oficina…</div>
        <div class="o-hud">
          <div class="o-now"><span class="o-wk" id="oHudWk">SEM. 01 · F1 AMARELA</span><span class="o-scn" id="oHudScn">Primeiro LED</span></div>
          <div class="o-hudr"><span class="o-badge" id="oHudBadge">simulador</span><span class="o-ilus">modelo 3D ilustrativo</span><span class="o-crono" id="oCrono" hidden><small>CRONÔMETRO</small><span>00.0</span></span></div>
        </div>
        <div class="o-hint">arraste pra girar · pinça ou roda pra zoom · toque numa peça</div>
        <div class="o-tools">
          <div class="o-modal" id="oModal" role="group" aria-label="Modalidade da competição" hidden>
            <button class="o-tool" data-fp="linha" aria-pressed="false">Pista de linha</button><button class="o-tool" data-fp="resgate" aria-pressed="false">Arena de resgate</button>
          </div>
          <button class="o-tool" id="oExplode" aria-pressed="false">Explodir peças</button>
          <button class="o-tool" id="oSpin" aria-pressed="false">Girar sozinho</button>
          <button class="o-tool" id="oCam">Recentrar</button>
        </div>
        <div class="o-tip" id="oTip" hidden></div>
      </div>
      <div class="o-timeline" aria-label="Linha do tempo do ano">
        <div class="o-tlrow">
          <button class="o-nav" id="oPrev" aria-label="Semana anterior">←</button>
          <div class="o-track" id="oTrack"></div>
          <button class="o-nav" id="oNext" aria-label="Próxima semana">→</button>
        </div>
        <div class="o-ticks"><span>1</span><span>9</span><span>21</span><span>34</span><span>45</span><span>48</span></div>
        <div class="o-kit" id="oKit"><span><b>sem. 4</b> encomendar Kit Iniciante</span><span><b>sem. 9</b> Kit Iniciante chega</span><span><b>sem. 21</b> Kit Avançado chega</span><span>barra alta = exame de faixa</span>
          <button class="o-nav o-play" id="oPlay" aria-pressed="false" aria-label="Tocar as semanas" style="width:auto;height:auto;padding:4px 10px;font-family:var(--omono);font-size:11px;margin-left:auto">▶ tocar</button></div>
      </div>
    </div>
    <aside class="o-panel" id="oPanel" aria-live="polite"></aside>
  </div>
  <div class="o-below" id="oBelow"></div>
  <div class="o-foot">
    <span>XP: aula 10 · desafio 20 · documentar 15 · fim de semana 10 · foto do kit organizado 10 (da sem. 9 em diante) · ajudar colega 15 · exame 100. XP registra esforço; quem promove é o exame.</span>
    <span>Fonte: plano oficial "O ano semana por semana" (22/10/2026) e comparação dos kits (27/10/2026). Modelos 3D são ilustrativos, não fotos das peças compradas.</span>
  </div>`;
const $=s=>R.querySelector(s);

/* ================= THREE.JS: CENA ================= */
const vp=$("#oVp");
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
vp.prepend(renderer.domElement);
const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0x0A0A0F,14,30);
const camera=new THREE.PerspectiveCamera(40,1,0.05,100);
camera.position.set(3,2.2,3.2);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true; controls.dampingFactor=.08;
controls.minDistance=.6; controls.maxDistance=16; controls.maxPolarAngle=Math.PI*.49;
controls.autoRotateSpeed=1.4;

scene.add(new THREE.HemisphereLight(0xcfe6ff,0x1a1420,1.3));
const sun=new THREE.DirectionalLight(0xffffff,2.6);
sun.position.set(4,8,3); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:1,far:25});
sun.shadow.bias=-0.0004;
scene.add(sun);
const rim=new THREE.DirectionalLight(0x4DB2FF,1.4); rim.position.set(-5,3,-4); scene.add(rim);

const ground=new THREE.Mesh(new THREE.CircleGeometry(30,64),new THREE.MeshStandardMaterial({color:0x0E0E16,roughness:.95}));
ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);

/* helpers */
const std=(color,o={})=>new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.05,...o});
function mesh(geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m}
const B=(w,h,d,mat,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
const C=(r1,r2,h,mat,x,y,z,seg=28)=>mesh(new THREE.CylinderGeometry(r1,r2,h,seg),mat,x,y,z);
function canvasTex(w,h,draw){const c=document.createElement("canvas");c.width=w;c.height=h;draw(c.getContext("2d"),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
function wire(pts,color,r=.009){const curve=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));return mesh(new THREE.TubeGeometry(curve,40,r,6,false),std(color,{roughness:.4}))}
function glowTex(){return canvasTex(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,"rgba(255,255,255,1)");r.addColorStop(.3,"rgba(255,255,255,.45)");r.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=r;g.fillRect(0,0,64,64)})}
const GLOW=glowTex();
function glow(color,size){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));s.scale.setScalar(size);return s}
const logoImg=new Image(); logoImg.src=new URL("logo-eron.png",document.baseURI).href;
const logoTex=new THREE.Texture(logoImg); logoTex.colorSpace=THREE.SRGBColorSpace;
logoImg.onload=()=>{logoTex.needsUpdate=true};
function sticker(w,h){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:logoTex,roughness:.6}));m.rotation.x=-Math.PI/2;return m}

/* ================= PEÇAS (modelos low-poly) ================= */
const builders={
  uno(){const g=new THREE.Group();const pcb=std(0x1E5AA8,{roughness:.45});
    g.add(B(.69,.018,.53,pcb,0,.009,0));
    const blk=std(0x15151a);g.add(B(.46,.06,.04,blk,.06,.048,.235),B(.36,.06,.04,blk,.1,.048,-.235),B(.3,.032,.08,blk,.12,.034,0));
    g.add(B(.16,.11,.12,std(0xC9CED6,{metalness:.8,roughness:.3}),-.3,.064,.14),B(.13,.1,.09,blk,-.3,.06,-.17));
    const label=new THREE.Mesh(new THREE.PlaneGeometry(.2,.07),new THREE.MeshBasicMaterial({map:canvasTex(160,56,(c,w,h)=>{c.fillStyle="#1E5AA8";c.fillRect(0,0,w,h);c.fillStyle="#fff";c.font="bold 38px monospace";c.fillText("UNO",30,42)}) }));
    label.rotation.x=-Math.PI/2;label.position.set(-.08,.0195,-.1);g.add(label);
    const led=C(.012,.012,.012,std(0x3DDC84,{emissive:0x3DDC84,emissiveIntensity:1.5}),.25,.024,-.12,10);g.add(led);return g},
  proto(){const g=new THREE.Group();g.add(B(.82,.08,.55,std(0xEDEDF0,{roughness:.7}),0,.04,0));
    const t=canvasTex(512,344,(c,w,h)=>{c.fillStyle="#EDEDF0";c.fillRect(0,0,w,h);c.fillStyle="#E14B4B";c.fillRect(10,10,w-20,3);c.fillRect(10,h-36,w-20,3);c.fillStyle="#3D6FE0";c.fillRect(10,32,w-20,3);c.fillRect(10,h-14,w-20,3);
      c.fillStyle="#3a3a44";for(let i=0;i<30;i++)for(let j=0;j<10;j++){c.fillRect(20+i*16.2,62+j*21+(j>4?14:0),5,5)}
      for(let i=0;i<25;i++){c.fillRect(30+i*18.5,18,4,4);c.fillRect(30+i*18.5,h-28,4,4)}
      c.fillStyle="#c9c9d0";c.fillRect(10,h/2-4,w-20,6)});
    const top=new THREE.Mesh(new THREE.PlaneGeometry(.82,.55),new THREE.MeshStandardMaterial({map:t,roughness:.7}));top.rotation.x=-Math.PI/2;top.position.y=.0805;g.add(top);return g},
  led1(){return makeLed(0xFF3B3B)},led2(){return makeLed(0xFFC930)},led3(){return makeLed(0x31E06E)},
  button(){const g=new THREE.Group();g.add(B(.07,.035,.07,std(0x1b1b20),0,.0175,0));const cap=C(.022,.022,.025,std(0x2c2c34),0,.045,0);cap.name="cap";g.add(cap);
    const leg=std(0xb8bcc4,{metalness:.8});[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>g.add(B(.006,.03,.006,leg,a*.03,-.01,b*.03)));return g},
  buzzer(){const g=new THREE.Group();g.add(C(.06,.06,.05,std(0x16161b,{roughness:.4}),0,.025,0,32),C(.012,.012,.052,std(0x050505),0,.026,0,12));return g},
  ldr(){const g=new THREE.Group();const t=canvasTex(64,64,(c)=>{c.fillStyle="#E8A048";c.beginPath();c.arc(32,32,32,0,7);c.fill();c.strokeStyle="#7a3b12";c.lineWidth=4;c.beginPath();c.moveTo(14,22);for(let i=0;i<5;i++){c.lineTo(50,22+i*5);c.lineTo(14,24.5+i*5)}c.stroke()});
    const head=C(.028,.028,.014,[std(0xE8A048),new THREE.MeshStandardMaterial({map:t}),std(0xE8A048)],0,.09,0,24);g.add(head);
    const leg=std(0xb8bcc4,{metalness:.8});g.add(B(.004,.08,.004,leg,-.012,.045,0),B(.004,.08,.004,leg,.012,.045,0));return g},
  motorDC(){return makeTT(true)},
  wiresB(){const g=new THREE.Group();
    g.add(wire([[-.6,.08,.235],[-.42,.22,.3],[-.2,.12,.26],[.33,.1,.12],[.36,.081,.1]],0xFF4D4D),
          wire([[-.56,.08,.235],[-.38,.18,.2],[-.1,.14,.0],[.33,.1,-.06],[.36,.081,-.08]],0x4DB2FF),
          wire([[-.5,.08,-.235],[-.3,.2,-.33],[0,.14,-.3],[.35,.1,-.22],[.4,.081,-.2]],0x15151a),
          wire([[-.46,.08,-.235],[-.25,.25,-.1],[.1,.16,.18],[.55,.1,.18],[.58,.081,.17]],0xF5C542));return g},
  chassis(){const g=new THREE.Group();const s=new THREE.Shape();const w=2,d=1,r=.12;
    s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
    [[-.15,0],[.45,0],[-.75,0]].forEach(([x,z])=>{const h=new THREE.Path();h.absellipse(x,z,.09,.035,0,Math.PI*2);s.holes.push(h)});
    for(let i=0;i<6;i++){const h=new THREE.Path();h.absarc(-.7+i*.28,.4,.025,0,Math.PI*2);s.holes.push(h);const h2=new THREE.Path();h2.absarc(-.7+i*.28,-.4,.025,0,Math.PI*2);s.holes.push(h2)}
    const geo=new THREE.ExtrudeGeometry(s,{depth:.04,bevelEnabled:false});geo.rotateX(-Math.PI/2);
    const plate=mesh(geo,new THREE.MeshPhysicalMaterial({color:0x2a3c5c,roughness:.15,metalness:0,transparent:true,opacity:.72,clearcoat:1}),0,.38,0);g.add(plate);
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo,30),new THREE.LineBasicMaterial({color:0x7cc8ff,transparent:true,opacity:.55}));edges.position.y=.38;g.add(edges);
    const st=sticker(.36,.12);st.position.set(.62,.4215,.3);g.add(st);
    const brass=std(0xC9A440,{metalness:.9,roughness:.3});[[.85,.4],[.85,-.4],[-.9,.4],[-.9,-.4]].forEach(([x,z])=>g.add(C(.02,.02,.08,brass,x,.46,z,8)));return g},
  motors(){const g=new THREE.Group();const a=makeTT(false),b=makeTT(false);a.position.set(-.45,.26,.3);b.position.set(-.45,.26,-.3);b.rotation.y=Math.PI;g.add(a,b);return g},
  wheels(){const g=new THREE.Group();[.62,-.62].forEach(z=>{const wh=makeWheel();wh.position.set(-.45,.33,z);g.add(wh)});return g},
  caster(){const g=new THREE.Group();g.add(C(.07,.06,.24,std(0x9aa0aa,{metalness:.8,roughness:.3}),.72,.26,0,16));g.add(mesh(new THREE.SphereGeometry(.075,20,14),std(0xd8dde4,{metalness:1,roughness:.15}),.72,.075,0));return g},
  l298n(){const g=new THREE.Group();g.add(B(.43,.018,.43,std(0xD7262E,{roughness:.45}),0,.009,0));
    const hs=std(0x111114,{metalness:.6,roughness:.4});for(let i=0;i<6;i++)g.add(B(.018,.2,.24,hs,-.06+i*.035,.11,-.05));
    const term=std(0x2D68E0);g.add(B(.09,.08,.14,term,.16,.05,.14),B(.09,.08,.14,term,-.16,.05,.14),B(.14,.08,.08,term,0,.05,.18));
    g.add(C(.04,.04,.09,std(0x1b1b22),.14,.055,-.14,16));return g},
  battery(){const g=new THREE.Group();g.add(B(.72,.06,.42,std(0x141418),0,.03,0));
    const green=std(0x6BD34B,{roughness:.35}),cap=std(0xC9CED6,{metalness:.9,roughness:.25});
    [-.1,.1].forEach(z=>{const c=C(.09,.09,.64,green,0,.11,z,24);c.rotation.z=Math.PI/2;g.add(c);const e=C(.05,.05,.03,cap,.335,.11,z,16);e.rotation.z=Math.PI/2;g.add(e)});return g},
  wiresR(){const g=new THREE.Group();
    g.add(wire([[-.42,.5,.22],[-.2,.64,.25],[.05,.62,.1],[.22,.54,-.12]],0xFF4D4D),wire([[-.38,.5,-.22],[-.15,.6,-.35],[.1,.58,-.42],[.2,.53,-.36]],0xF5C542),
      wire([[.33,.5,-.15],[.4,.42,-.48],[0,.3,-.48],[-.3,.3,-.42]],0x4DB2FF),wire([[.33,.5,-.35],[.3,.4,.5],[0,.3,.48],[-.3,.3,.42]],0x3DDC84),
      wire([[.15,.3,.2],[.1,.36,.0],[.15,.5,-.1]],0x15151a,.012));return g},
  hcsr04(){const g=new THREE.Group();g.add(B(.03,.22,.46,std(0x2A6FD6,{roughness:.45}),0,0,0));
    const eye=std(0xC9CED6,{metalness:.85,roughness:.25}),mesh_=std(0x2a2a30,{roughness:.9});
    [-.12,.12].forEach(z=>{const c=C(.08,.08,.12,eye,.075,0,z,28);c.rotation.z=-Math.PI/2;g.add(c);const m=C(.066,.066,.01,mesh_,.137,0,z,24);m.rotation.z=-Math.PI/2;g.add(m)});
    g.add(B(.05,.04,.1,std(0x15151a),-.02,-.13,0));g.position.set(0,0,0);
    const brk=B(.16,.02,.2,std(0x8a8f99,{metalness:.7}),-.08,-.12,0);g.add(brk);return g},
  line(){const g=new THREE.Group();g.add(B(.14,.018,.72,std(0x16161b),0,0,0));
    const s=std(0x2a3550),l=std(0xFF4040,{emissive:0xFF2020,emissiveIntensity:2});for(let i=0;i<5;i++){g.add(B(.05,.03,.06,s,0,-.02,-.28+i*.14));g.add(B(.016,.01,.016,l,.04,.012,-.28+i*.14))}
    g.add(B(.03,.2,.05,std(0x8a8f99,{metalness:.7}),-.05,.11,.3),B(.03,.2,.05,std(0x8a8f99,{metalness:.7}),-.05,.11,-.3));return g},
  color(){const g=new THREE.Group();g.add(B(.2,.016,.2,std(0x3B3FA8),0,0,0));const led=B(.04,.02,.04,std(0xffffff,{emissive:0xffffff,emissiveIntensity:3}),0,-.016,0);g.add(led);
    const gl=glow(0xffffff,.4);gl.material.opacity=.8;gl.position.y=-.05;g.add(gl);g.add(B(.03,.22,.04,std(0x8a8f99,{metalness:.7}),-.07,.11,0));return g},
  servo(){const g=new THREE.Group();const blue=std(0x2E7BD6,{roughness:.45});g.add(B(.23,.22,.12,blue,0,.11,0),B(.32,.02,.12,blue,0,.17,0),C(.035,.035,.04,std(0xe9e9ee),.05,.24,0,16));
    const horn=new THREE.Group();horn.name="horn";horn.position.set(.05,.265,0);horn.add(B(.18,.015,.035,std(0xf2f2f5),.06,0,0));g.add(horn);return g},
  claw(){const g=new THREE.Group();const pla=std(0xA970FF,{roughness:.5});
    g.add(B(.05,.32,.46,pla,0,0,0),B(.22,.04,.2,pla,-.1,.15,0));
    [1,-1].forEach(s=>{const piv=new THREE.Group();piv.name=s>0?"fL":"fR";piv.position.set(.04,-.02,s*.2);
      const f=B(.32,.05,.04,pla,.16,-.08,0);f.rotation.z=-.4;piv.add(f);const tip=B(.06,.12,.04,pla,.3,-.17,s*-.02);piv.add(tip);g.add(piv)});return g},
  ball(){const g=new THREE.Group();g.add(mesh(new THREE.SphereGeometry(.2,32,20),std(0xFF7A1A,{roughness:.35})));return g},
  box(){const g=new THREE.Group();const clear=new THREE.MeshPhysicalMaterial({color:0xbfe3ff,roughness:.1,transparent:true,opacity:.28,depthWrite:false});
    g.add(B(1.8,.04,1.2,std(0x1c2433),0,.02,0));
    [[1.8,.45,.03,0,.24,.6],[1.8,.45,.03,0,.24,-.6],[.03,.45,1.2,.9,.24,0],[.03,.45,1.2,-.9,.24,0]].forEach(a=>{const m=B(...a.slice(0,3),clear,...a.slice(3));m.castShadow=false;g.add(m)});
    [[-.3],[.3]].forEach(([x])=>{const m=B(.02,.3,1.18,clear,x,.17,0);m.castShadow=false;g.add(m)});
    const lid=new THREE.Group();lid.name="lid";lid.position.set(0,.47,-.6);const lp=B(1.8,.03,1.2,clear,0,0,.6);lp.castShadow=false;lid.add(lp);const st=sticker(.6,.2);st.position.set(0,.017,.6);lid.add(st);lid.rotation.x=-1.9;g.add(lid);return g}
};
function makeLed(color){const g=new THREE.Group();const mat=std(color,{emissive:color,emissiveIntensity:.15,transparent:true,opacity:.92,roughness:.2});
  g.add(C(.024,.024,.045,mat,0,.1,0,18));const dome=mesh(new THREE.SphereGeometry(.024,18,10,0,Math.PI*2,0,Math.PI/2),mat,0,.1225,0);g.add(dome);
  g.add(C(.029,.029,.008,mat,0,.08,0,18));const leg=std(0xb8bcc4,{metalness:.8});g.add(B(.004,.08,.004,leg,-.01,.04,0),B(.004,.06,.004,leg,.01,.05,0));
  const gl=glow(color,.32);gl.position.y=.115;g.add(gl);g.userData.led={mat,gl};return g}
function makeTT(withShaft){const g=new THREE.Group();const y=std(0xF5C542,{roughness:.5});g.add(B(.64,.2,.2,y,0,0,0));
  const motor=C(.1,.1,.24,std(0xC9CED6,{metalness:.85,roughness:.25}),-.4,0,0,20);motor.rotation.z=Math.PI/2;g.add(motor);
  const shaft=new THREE.Group();shaft.name="shaft";shaft.position.set(.18,0,.1);const sm=B(.03,.03,.12,std(0xf2f2f5),0,0,.06);shaft.add(sm);
  if(withShaft){const flag=B(.18,.02,.03,std(0xFF4D4D),.06,0,.12);shaft.add(flag)}g.add(shaft);return g}
function makeWheel(){const g=new THREE.Group();const spin=new THREE.Group();spin.name="spin";g.add(spin);
  const tyre=mesh(new THREE.CylinderGeometry(.33,.33,.14,40),std(0x1a1a1f,{roughness:.95}));tyre.rotation.x=Math.PI/2;spin.add(tyre);
  const hub=mesh(new THREE.CylinderGeometry(.22,.22,.15,32),std(0xF5C542,{roughness:.5}));hub.rotation.x=Math.PI/2;spin.add(hub);
  for(let i=0;i<4;i++){const s=B(.4,.05,.02,std(0x111114),0,0,0);s.position.z=.078*Math.sign(1);s.rotation.z=i*Math.PI/4;spin.add(s)}
  for(let i=0;i<18;i++){const t=B(.05,.04,.15,std(0x26262c,{roughness:1}),0,0,0);const a=i/18*Math.PI*2;t.position.set(Math.cos(a)*.33,Math.sin(a)*.33,0);t.rotation.z=a;spin.add(t)}
  return g}

/* poses: [x,y,z, rotY] por modo */
const POSE={
  bench:{uno:[-.62,0,0],proto:[.45,0,0],wiresB:[0,0,0],led1:[.37,.08,-.1],led2:[.5,.08,-.1],led3:[.63,.08,-.1],button:[.4,.098,.16],buzzer:[.62,.08,.15],ldr:[.25,.08,.05],motorDC:[.45,.1,.6,0]},
  robot:{chassis:[0,0,0],motors:[0,0,0],wheels:[0,0,0],caster:[0,0,0],uno:[-.55,.42,0,0],l298n:[.2,.42,-.24],battery:[.25,.17,0],wiresR:[0,0,0],
    hcsr04:[1.0,.58,0],line:[.95,.06,0],color:[.62,.05,.24],servo:[.6,.42,.3,0],claw:[1.12,.24,0],ball:[1.45,.2,0]},
};
/* onde a bolinha fica quando a garra fecha (coordenadas do robô) */
const GARRA=new THREE.Vector3(1.45,.2,0),ALCANCE=1.45;
const EXPLODE={chassis:[0,0,0],motors:[0,-.15,0],wheels:[0,0,0],caster:[0,-.25,0],uno:[0,.55,0],l298n:[0,.55,-.15],battery:[0,-.35,0],wiresR:[0,.35,0],hcsr04:[.5,.2,0],line:[.4,-.35,0],color:[0,-.45,.2],servo:[0,.55,.25],claw:[.55,0,0],ball:[.4,0,0],
  proto:[0,0,0],wiresB:[0,.25,0],led1:[0,.25,0],led2:[0,.3,0],led3:[0,.35,0],button:[0,.25,0],buzzer:[0,.25,0],ldr:[0,.25,0],motorDC:[0,.2,0],box:[0,0,0]};

/* constrói, guarda e prepara bordas de holograma */
const parts={};
const world=new THREE.Group(),robot=new THREE.Group(),bench=new THREE.Group();
scene.add(world);world.add(robot,bench);
const holoMat=new THREE.LineBasicMaterial({color:0x4DB2FF,transparent:true,opacity:.0});
for(const k in builders){
  const inner=builders[k]();
  const p=new THREE.Group();p.add(inner);p.name=k;p.visible=false;p.userData.key=k;
  inner.traverse(o=>{if(o.isMesh&&o.geometry&&!o.geometry.parameters?.path){const e=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,35),holoMat);e.raycast=()=>{};o.add(e)}});
  parts[k]=p;
}

/* ================= AMBIENTES ================= */
const envs={};
function envGroup(name){const g=new THREE.Group();g.name=name;g.visible=false;scene.add(g);envs[name]=g;return g}
function floorLabel(g,txt,x,z,w=2.4,color="#0c0c0e"){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,w*.12),new THREE.MeshBasicMaterial({transparent:true,map:canvasTex(800,96,(c)=>{c.font="600 44px JetBrains Mono, monospace";c.fillStyle=color;c.fillText(txt,12,66)})}));m.rotation.x=-Math.PI/2;m.position.set(x,.007,z);g.add(m);return m}
{ // simulador
  const g=envGroup("sim");const grid=new THREE.GridHelper(4,40,0x4DB2FF,0x1d3550);grid.material.transparent=true;grid.material.opacity=.55;grid.position.y=.002;g.add(grid);
  const lbl=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.22),new THREE.MeshBasicMaterial({transparent:true,map:canvasTex(560,88,(c,w,h)=>{c.font="600 34px JetBrains Mono, monospace";c.fillStyle="#4DB2FF";c.fillText("SIMULADOR · TINKERCAD",10,58)})}));
  lbl.position.set(0,.02,-.7);lbl.rotation.x=-Math.PI/2;g.add(lbl);
}
{ // bancada real
  const g=envGroup("bench");const mat=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.7),new THREE.MeshStandardMaterial({roughness:.9,map:canvasTex(512,364,(c,w,h)=>{c.fillStyle="#1f5a45";c.fillRect(0,0,w,h);c.strokeStyle="rgba(255,255,255,.18)";c.lineWidth=1;for(let i=0;i<w;i+=21){c.beginPath();c.moveTo(i,0);c.lineTo(i,h);c.stroke()}for(let j=0;j<h;j+=21){c.beginPath();c.moveTo(0,j);c.lineTo(w,j);c.stroke()}})}));
  mat.rotation.x=-Math.PI/2;mat.position.y=.002;mat.receiveShadow=true;g.add(mat);
}
envGroup("floor");
{ const g=envGroup("wall");const w=B(.25,.7,2.6,std(0x5b6070,{roughness:.8}),3.2,.35,0);g.add(w);
  const tape=new THREE.Mesh(new THREE.PlaneGeometry(.04,1.2),new THREE.MeshBasicMaterial({color:0xF5C542}));tape.rotation.x=-Math.PI/2;tape.position.set(2.05,.004,0);g.add(tape);
  const tl=new THREE.Mesh(new THREE.PlaneGeometry(.6,.14),new THREE.MeshBasicMaterial({transparent:true,map:canvasTex(240,56,(c)=>{c.font="600 30px JetBrains Mono, monospace";c.fillStyle="#F5C542";c.fillText("15 cm",40,40)})}));tl.rotation.x=-Math.PI/2;tl.position.set(2.05,.006,.8);g.add(tl);
}
/* pista: oval com S */
const TRACK=new THREE.CatmullRomCurve3([[-3.2,0,0],[-2.6,0,-1.7],[-.8,0,-1.9],[.8,0,-1.5],[2.6,0,-1.8],[3.4,0,-.4],[2.8,0,1.5],[1,0,1.9],[-.6,0,1.3],[-2.4,0,1.8]].map(p=>new THREE.Vector3(...p)),true,"catmullrom",.5);
const OBST_T=.27;
const DETOUR=(()=>{const pts=[];for(let i=0;i<=200;i++){const t=i/200;const p=TRACK.getPointAt(t);const d=Math.abs(t-OBST_T);if(d<.06){const n=TRACK.getTangentAt(t);const off=Math.cos(d/.06*Math.PI/2)**2*1.05;p.add(new THREE.Vector3(n.z,0,-n.x).multiplyScalar(off))}pts.push(p)}return new THREE.CatmullRomCurve3(pts,true)})();
const SIGNS=[[.08,"#31E06E","verde: vira"],[.5,"#FF3B3B","vermelho: para"],[.72,"#3D7BFF","azul: acelera"]];
function linhaTex(curve,W_,H_,lw=30,extra){return canvasTex(1472,896,(c,w,h)=>{c.fillStyle="#F3F1EC";c.fillRect(0,0,w,h);c.strokeStyle="#0c0c0e";c.lineWidth=lw;c.lineJoin="round";c.beginPath();
    for(let i=0;i<=400;i++){const p=curve.getPointAt(i/400);const x=(p.x/W_+.5)*w,y=(p.z/H_+.5)*h;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.stroke();if(extra)extra(c,w,h)})}
{ const g=envGroup("track");const W_=9.2,H_=5.6;
  const tex=linhaTex(TRACK,W_,H_,30,(c,w,h)=>{c.fillStyle="#0c0c0e";c.font="600 26px JetBrains Mono, monospace";c.fillText("LARGADA",60,h/2+70)});
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(W_,H_),new THREE.MeshStandardMaterial({map:tex,roughness:.85}));pl.rotation.x=-Math.PI/2;pl.position.y=.003;pl.receiveShadow=true;g.add(pl);
  const obst=B(.6,.6,.6,std(0xB98A55,{roughness:.9}),0,.3,0);obst.name="obst";const p=TRACK.getPointAt(OBST_T);obst.position.set(p.x,.3,p.z);g.add(obst);
  const signs=new THREE.Group();signs.name="signs";SIGNS.forEach(([t,col])=>{const q=TRACK.getPointAt(t);const tg=TRACK.getTangentAt(t);const s=new THREE.Mesh(new THREE.PlaneGeometry(.55,.55),new THREE.MeshStandardMaterial({color:col,roughness:.8}));s.rotation.x=-Math.PI/2;s.rotation.z=Math.atan2(tg.z,tg.x)*-1;s.position.set(q.x,.006,q.z);s.receiveShadow=true;signs.add(s)});g.add(signs);
}
/* arena da Faixa Roxa (plano: segue a linha até a área de resgate, sem. 38) */
const ARENA={start:new THREE.Vector3(-2.7,0,1.5),ball:new THREE.Vector3(1.0,0,-.9),area:new THREE.Vector3(2.6,0,1.6)};
{ const g=envGroup("arena");
  g.add((()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(7.4,5),new THREE.MeshStandardMaterial({color:0xD9C29A,roughness:.9}));m.rotation.x=-Math.PI/2;m.position.y=.003;m.receiveShadow=true;return m})());
  const wm=std(0xA9875A,{roughness:.9});g.add(B(7.4,.35,.06,wm,0,.175,-2.5),B(7.4,.35,.06,wm,0,.175,2.5),B(.06,.35,5,wm,-3.7,.175,0),B(.06,.35,5,wm,3.7,.175,0));
  const area=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0,0),new THREE.Vector2(-1.6,0),new THREE.Vector2(0,1.6)])),new THREE.MeshStandardMaterial({color:0x2fbf62,roughness:.8}));
  area.rotation.x=-Math.PI/2;area.position.set(3.68,.006,2.48);g.add(area);
  const st=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial({color:0x4DB2FF,roughness:.8,transparent:true,opacity:.5}));st.rotation.x=-Math.PI/2;st.position.set(-2.9,.005,1.7);g.add(st);
  const lt=canvasTex(1184,800,(c,w,h)=>{c.strokeStyle="#111";c.lineWidth=22;c.lineCap="round";c.beginPath();const P=(x,z)=>[(x/7.4+.5)*w,(z/5+.5)*h];c.moveTo(...P(-2.9,1.7));c.bezierCurveTo(...P(-2.9,-.8),...P(-.6,-1.6),...P(1,-1.6));c.bezierCurveTo(...P(2.6,-1.6),...P(3.0,0),...P(3.1,1.9));c.stroke()});
  const line=new THREE.Mesh(new THREE.PlaneGeometry(7.4,5),new THREE.MeshBasicMaterial({map:lt,transparent:true}));line.rotation.x=-Math.PI/2;line.position.y=.0045;g.add(line);
}
/* ---- Faixa Preta ---- */
function trofeu(){const gold=std(0xE8B84A,{metalness:1,roughness:.25});const tr=new THREE.Group();tr.name="trophy";
  tr.add(C(.35,.4,.15,std(0x15151a),0,.075,0),C(.06,.08,.5,gold,0,.4,0,16),mesh(new THREE.CylinderGeometry(.34,.12,.5,32,1,true),gold,0,.85,0),mesh(new THREE.TorusGeometry(.15,.03,8,24),gold,.34,.85,0),mesh(new THREE.TorusGeometry(.15,.03,8,24),gold,-.34,.85,0));
  tr.children.at(-2).rotation.y=Math.PI/2;tr.children.at(-1).rotation.y=Math.PI/2;return tr}
function spots(g,list){list.forEach(([x,z])=>{const s=new THREE.SpotLight(0x9fd3ff,60,14,.45,.5);s.position.set(x,4.5,z);s.target.position.set(0,0,0);g.add(s,s.target)})}
{ // sem. 45: cerimônia de faixa (palco, faixa preta flutuando, troféu)
  const g=envGroup("cer");
  const palco=C(1.9,2.0,.3,std(0x15151c,{roughness:.6}),0,.15,0,64);g.add(palco);
  const aro=mesh(new THREE.TorusGeometry(1.95,.02,8,96),std(0x4DB2FF,{emissive:0x4DB2FF,emissiveIntensity:1.6}));aro.rotation.x=Math.PI/2;aro.position.y=.3;g.add(aro);
  const tr=trofeu();tr.position.set(-2.6,0,-1.2);g.add(tr);
  const belt=mesh(new THREE.TorusGeometry(.5,.06,8,48),std(0x0b0b0b,{roughness:.6}));belt.scale.set(1,.55,1);belt.position.set(0,2.2,0);belt.name="belt";g.add(belt);
  spots(g,[[-3.6,-2.4],[3.6,-2.4],[0,3]]);
}
/* sem. 46-48, modalidade linha: pista só de linha, contra o relógio */
const LINHA_FP=new THREE.CatmullRomCurve3([[-3.4,0,1.6],[-3.6,0,-.6],[-2.6,0,-2.0],[-1.5,0,-.8],[-.6,0,-2.0],[.4,0,-.7],[1.4,0,-2.0],[2.8,0,-2.0],[3.6,0,-.6],[2.6,0,.4],[3.4,0,1.4],[2.2,0,2.2],[.6,0,1.2],[-1.0,0,2.2],[-2.4,0,1.4]].map(p=>new THREE.Vector3(...p)),true,"catmullrom",.5);
{ const g=envGroup("compLinha");const W_=8.6,H_=5.4;
  const tex=linhaTex(LINHA_FP,W_,H_,26,(c,w,h)=>{const p=LINHA_FP.getPointAt(0),x=(p.x/W_+.5)*w,y=(p.z/H_+.5)*h;c.fillStyle="#0c0c0e";for(let i=0;i<8;i++)for(let j=0;j<2;j++)if((i+j)%2)c.fillRect(x-64+i*16,y-8+j*16,16,16);
    c.font="600 24px JetBrains Mono, monospace";c.fillText("LARGADA / CHEGADA",x+40,y+50);c.fillText("PISTA DE LINHA · FAIXA PRETA",40,44)});
  const pl=new THREE.Mesh(new THREE.PlaneGeometry(W_,H_),new THREE.MeshStandardMaterial({map:tex,roughness:.85}));pl.rotation.x=-Math.PI/2;pl.position.y=.003;pl.receiveShadow=true;g.add(pl);
  const borda=std(0x23232c,{roughness:.9});g.add(B(W_,.12,.06,borda,0,.06,-H_/2),B(W_,.12,.06,borda,0,.06,H_/2),B(.06,.12,H_,borda,-W_/2,.06,0),B(.06,.12,H_,borda,W_/2,.06,0));
  spots(g,[[-3.6,-2.4],[3.6,-2.4]]);
}
/* sem. 46-48, modalidade resgate: arena própria, SEM linha. Bolinhas soltas, área de resgate no canto. */
const RESG={start:new THREE.Vector3(-3.0,0,1.7),vit:[new THREE.Vector3(-.5,.2,-1.3),new THREE.Vector3(1.0,.2,.3)],area:new THREE.Vector3(3.15,0,1.95),solta:[new THREE.Vector3(3.2,.2,2.05),new THREE.Vector3(2.75,.2,2.15)]};
const vitimas=[];
{ const g=envGroup("compResgate");
  const piso=new THREE.Mesh(new THREE.PlaneGeometry(7.4,5),new THREE.MeshStandardMaterial({color:0xEDEDED,roughness:.9}));piso.rotation.x=-Math.PI/2;piso.position.y=.003;piso.receiveShadow=true;g.add(piso);
  const wm=std(0x23232c,{roughness:.9});g.add(B(7.4,.35,.06,wm,0,.175,-2.5),B(7.4,.35,.06,wm,0,.175,2.5),B(.06,.35,5,wm,-3.7,.175,0),B(.06,.35,5,wm,3.7,.175,0));
  const area=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0,0),new THREE.Vector2(-1.6,0),new THREE.Vector2(0,1.6)])),new THREE.MeshStandardMaterial({color:0x2fbf62,roughness:.8}));
  area.rotation.x=-Math.PI/2;area.position.set(3.68,.006,2.48);g.add(area);
  const ent=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial({color:0x4DB2FF,roughness:.8,transparent:true,opacity:.5}));ent.rotation.x=-Math.PI/2;ent.position.set(-3.1,.005,1.9);g.add(ent);
  floorLabel(g,"ARENA DE RESGATE · SEM LINHA",-1.6,-2.15,2.6,"#33333d");floorLabel(g,"ÁREA DE RESGATE",2.45,1.15,1.6,"#1d7a3d");
  RESG.vit.forEach(v=>{const b=mesh(new THREE.SphereGeometry(.2,32,20),std(0xD9DEE6,{metalness:.45,roughness:.28}),v.x,v.y,v.z);g.add(b);vitimas.push(b)});
  spots(g,[[-3.6,-2.4],[3.6,-2.4]]);
}

/* ================= ESTADO + ANIMAÇÃO (GSAP) ================= */
let cur=0,curStage=null,actionTl=null,exploded=false,selected=null;
const state={carry:false,speed:0,spinIdle:0,lineBlink:0,crono:null};
const tmp=new THREE.Vector3();

function placePart(k,mode){
  const p=parts[k];
  if(mode==="robot"){ if(k==="ball"){scene.add(p);p.position.copy(robot.localToWorld(tmp.set(...POSE.robot.ball)))} else {robot.add(p);const q=POSE.robot[k];p.position.set(q[0],q[1],q[2]);p.rotation.set(0,q[3]||0,0)}}
  else if(mode==="bench"){bench.add(p);const q=POSE.bench[k]||[0,0,0];p.position.set(q[0],q[1],q[2]);p.rotation.set(0,q[3]||0,0)}
  else if(mode==="layout"){world.add(p)}
  p.userData.base=p.position.clone();
}
function layoutPositions(keys){
  const list=keys.filter(k=>k!=="box");
  parts.box.position.set(0,0,-2.1);parts.box.rotation.set(0,0,0);parts.box.userData.base=parts.box.position.clone();
  const rows=[["chassis","motors","wheels"],["uno","proto","l298n","battery","hcsr04"],["led1","led2","led3","button","buzzer","ldr","caster"]];
  const gap={0:.35,1:.35,2:.3};let z=-.75;
  rows.forEach((row,ri)=>{const items=row.filter(k=>list.includes(k)).map(k=>{const p=parts[k];p.position.set(0,0,0);p.rotation.set(0,0,0);p.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(p);return {k,p,b,w:b.max.x-b.min.x,d:b.max.z-b.min.z}});
    const total=items.reduce((s,i)=>s+i.w,0)+gap[ri]*(items.length-1);let x=-total/2;const depth=Math.max(...items.map(i=>i.d));
    items.forEach(i=>{i.p.position.set(x-i.b.min.x,-i.b.min.y,z+depth/2-(i.b.min.z+i.b.max.z)/2);x+=i.w+gap[ri];i.p.userData.base=i.p.position.clone()});z+=depth+.4});
}
const CAMS={bench:[[1.25,1.05,1.45],[0,.06,.1]],layout:[[0,5.6,4.6],[0,0,-.1]],robot:[[2.5,1.7,2.6],[0,.35,0]],floor:[[-1,3.6,5.6],[.6,.3,0]],track:[[0,7.2,6.6],[0,0,0]],arena:[[0,6.8,6.4],[0,0,0]],
  cer:[[4.4,3.1,5.2],[0,.8,0]],compLinha:[[0,7.4,6.4],[0,0,0]]};
function flyCam(name,dur=1.1){
  const [p,t]=CAMS[name];const narrow=vp.clientWidth/vp.clientHeight<1;const f=narrow?1.55:1;
  const tp=new THREE.Vector3(...t),pp=new THREE.Vector3(...p).sub(tp).multiplyScalar(f).add(tp);
  gsap.to(camera.position,{x:pp.x,y:pp.y,z:pp.z,duration:REDUCED?0:dur,ease:"power3.inOut",overwrite:"auto"});
  gsap.to(controls.target,{x:tp.x,y:tp.y,z:tp.z,duration:REDUCED?0:dur,ease:"power3.inOut",overwrite:"auto"});
}

/* bolinha presa na garra de verdade: vira filha do robô enquanto ele carrega */
function pegar(b){robot.attach(b);b.position.copy(GARRA);state.carry=true}
function soltar(b,pai){(pai||scene).attach(b);state.carry=false}
function resetVitimas(){vitimas.forEach((b,i)=>{envs.compResgate.attach(b);gsap.killTweensOf(b.position);b.position.copy(RESG.vit[i]);b.scale.set(1,1,1)})}

function resetActionState(){
  if(actionTl){actionTl.kill();actionTl=null}
  gsap.killTweensOf(robot.position);gsap.killTweensOf(robot.rotation);
  if(parts.ball.parent===robot)scene.attach(parts.ball);
  resetVitimas();
  robot.position.set(0,0,0);robot.rotation.set(0,0,0);state.carry=false;state.spinIdle=0;state.crono=null;
  ["led1","led2","led3"].forEach(k=>setLed(k,0));
  const h=parts.servo.getObjectByName("horn");if(h)h.rotation.y=0;
  setClaw(.5);
  pings.forEach(p=>p.visible=false);
  $("#oCrono").hidden=true;
}
function setLed(k,v){const d=parts[k].children[0].userData.led;d.mat.emissiveIntensity=.15+v*3.2;d.gl.material.opacity=v*.9}
function setClaw(open){const l=parts.claw.getObjectByName("fL"),r=parts.claw.getObjectByName("fR");l.rotation.y=-open*.5;r.rotation.y=open*.5}

/* limites de navegação por perfil */
let lim={min:1,max:48};
function goWeek(n,opts={}){
  n=Math.max(lim.min,Math.min(lim.max,n));
  if(n!==cur&&!opts.fp)fpModo=fpPadrao(n);
  if(opts.fp)fpModo=opts.fp;
  const st=stageFor(n),prev=curStage;cur=n;
  const modeChanged=!prev||prev.mode!==st.mode;
  const prevSet=new Set(prev?prev.parts:[]),nextSet=new Set(st.parts);
  const isNew=k=>!prevSet.has(k)||modeChanged;
  resetActionState();
  // ambiente
  for(const k in envs){const on=k===st.env;envs[k].visible=on}
  const tr=envs.track;tr.getObjectByName("obst").visible=!!st.obstacle;tr.getObjectByName("signs").visible=!!st.signs;
  holoMat.opacity=st.holo?.5:0;
  // peças que saem
  Object.keys(parts).forEach(k=>{const p=parts[k];if(p.visible&&(!nextSet.has(k)||modeChanged)){
    if(REDUCED||modeChanged){p.visible=false}else gsap.to(p.scale,{x:.001,y:.001,z:.001,duration:.22,ease:"power2.in",onComplete:()=>{p.visible=false;p.scale.set(1,1,1)}})}});
  // posiciona as que ficam/entram
  if(st.mode==="layout")st.parts.forEach(k=>placePart(k,"layout")),layoutPositions(st.parts);
  else st.parts.forEach(k=>{if(isNew(k))placePart(k,st.mode)});
  if(exploded)applyExplode(false);
  // entram com a "montagem": cai do alto, encaixa com leve overshoot
  const entering=st.parts.filter(isNew);
  entering.forEach((k,i)=>{const p=parts[k];p.visible=true;gsap.killTweensOf(p.scale);gsap.killTweensOf(p.position);
    if(REDUCED){p.scale.set(1,1,1);return}
    p.scale.set(.001,.001,.001);
    const d=modeChanged?Math.min(i*.05,.45):i*.09;
    gsap.to(p.scale,{x:1,y:1,z:1,duration:.55,delay:d+.15,ease:"back.out(1.7)"});
    gsap.from(p.position,{y:p.userData.base.y+(modeChanged?.6:1.1),duration:.7,delay:d+.15,ease:"power3.out"});
  });
  st.parts.forEach(k=>parts[k].visible=true);
  if(st.mode==="layout"){const lid=parts.box.getObjectByName("lid");gsap.fromTo(lid.rotation,{x:0},{x:-1.9,duration:REDUCED?0:1,delay:.3,ease:"power3.out"})}
  if(modeChanged||!prev||prev.cam!==st.cam||opts.recenter)flyCam(st.cam);
  curStage=st;
  startAction(st,entering.length?(REDUCED?0:.9):0);
  renderUI(n,st,entering);
}

/* ações de cada semana */
const pings=[];
for(let i=0;i<4;i++){const r=new THREE.Mesh(new THREE.RingGeometry(.1,.13,40),new THREE.MeshBasicMaterial({color:0x4DB2FF,transparent:true,side:THREE.DoubleSide,depthWrite:false}));r.visible=false;scene.add(r);pings.push(r)}
function ping(fromObj,dir="x",color=0x4DB2FF){
  const r=pings.find(p=>!p.visible)||pings[0];r.material.color.set(color);r.visible=true;
  fromObj.getWorldPosition(r.position);const q=new THREE.Quaternion();fromObj.getWorldQuaternion(q);r.quaternion.copy(q);
  if(dir==="x")r.rotateY(Math.PI/2);else r.rotateX(-Math.PI/2);
  r.scale.setScalar(.5);r.material.opacity=.9;
  gsap.to(r.scale,{x:4,y:4,z:4,duration:.9,ease:"power2.out"});gsap.to(r.material,{opacity:0,duration:.9,ease:"power1.in",onComplete:()=>r.visible=false});
}
function driveCurve(curve,obj,dur,{from=0,to=1,ease="none"}={}){
  const s={t:from};return gsap.to(s,{t:to,duration:dur,ease,onUpdate:()=>{const t=((s.t%1)+1)%1;const p=curve.getPointAt(t),tg=curve.getTangentAt(t);obj.position.set(p.x,0,p.z);obj.rotation.y=-Math.atan2(tg.z,tg.x)}});
}
/* robô de competição: gira no lugar e anda reto, como no código do Creator. pose = onde o robô vai estar naquele ponto da timeline */
function piloto(tl,pose,sp=1){
  const claw={o:.5};
  const P={
    vira(x,z){const th=-Math.atan2(z-pose.z,x-pose.x);let d=th-pose.th;d=Math.atan2(Math.sin(d),Math.cos(d));if(Math.abs(d)<.01)return P;const t=pose.th+d;
      tl.to(robot.rotation,{y:t,duration:Math.max(.25,Math.abs(d)*.42)*sp,ease:"power1.inOut"});pose.th=t;return P},
    anda(x,z,ease="power1.inOut"){const dist=Math.hypot(x-pose.x,z-pose.z);tl.to(robot.position,{x,z,duration:Math.max(.3,dist*.5)*sp,ease});pose.x=x;pose.z=z;return P},
    vai(x,z){return P.vira(x,z).anda(x,z)},
    re(dist){const x=pose.x-Math.cos(pose.th)*dist,z=pose.z+Math.sin(pose.th)*dist;tl.to(robot.position,{x,z,duration:.5*sp,ease:"power2.inOut"});pose.x=x;pose.z=z;return P},
    garra(o,dur=.3){tl.to(claw,{o,duration:dur*sp,ease:o<.2?"back.out(2)":"power2.out",onUpdate:()=>setClaw(claw.o)});return P},
    /* encosta a garra na bolinha vindo na direção atual, fecha e levanta */
    pega(b,v){const ux=v.x-pose.x,uz=v.z-pose.z,L=Math.hypot(ux,uz);const ax=v.x-ux/L*ALCANCE,az=v.z-uz/L*ALCANCE;
      const px=v.x-ux/L*(ALCANCE+.9),pz=v.z-uz/L*(ALCANCE+.9);
      P.vai(px,pz).vira(v.x,v.z).garra(1).anda(ax,az,"power2.out");tl.call(()=>ping(parts.hcsr04)).to({},{duration:.25*sp});
      P.garra(0,.35);tl.call(()=>pegar(b)).to(b.position,{y:GARRA.y+.08,duration:.25*sp,ease:"power2.out"});return P},
    /* leva até o ponto, abre a garra e a bolinha fica lá */
    solta(b,alvo,pai){const ux=alvo.x-pose.x,uz=alvo.z-pose.z,L=Math.hypot(ux,uz);const ax=alvo.x-ux/L*ALCANCE,az=alvo.z-uz/L*ALCANCE;
      P.vira(alvo.x,alvo.z).anda(ax,az);P.garra(1,.3);tl.call(()=>soltar(b,pai)).to(b.position,{y:.2,duration:.2*sp,ease:"bounce.out"});
      tl.to(b.position,{x:alvo.x,z:alvo.z,duration:.4*sp,ease:"power2.out"});P.re(.8);return P}
  };
  return P;
}
function startAction(st,delay){
  const tl=gsap.timeline({repeat:-1,delay});actionTl=tl;const a=st.action;
  if(a==="blink"){tl.call(()=>setLed("led1",1)).to({},{duration:.5}).call(()=>setLed("led1",0)).to({},{duration:.5})}
  else if(a==="semaforo"){tl.call(()=>{setLed("led3",1);setLed("led1",0)}).to({},{duration:1.2}).call(()=>{setLed("led3",0);setLed("led2",1)}).to({},{duration:.5}).call(()=>{setLed("led2",0);setLed("led1",1)}).to({},{duration:1.2})}
  else if(a==="button"){const cap=parts.button.getObjectByName("cap");let on=false;tl.to(cap.position,{y:.035,duration:.12,ease:"power2.in"}).call(()=>{on=!on;setLed("led1",on?1:0)}).to(cap.position,{y:.045,duration:.25,ease:"back.out(2)"}).to({},{duration:.9})}
  else if(a==="buzzer"){const bz=parts.buzzer;tl.call(()=>ping(bz,"y",0xF5C542)).to({},{duration:.3}).call(()=>ping(bz,"y",0xF5C542)).to({},{duration:.6})}
  else if(a==="ldr"){const s={v:0};tl.to(s,{v:1,duration:1.8,ease:"sine.inOut",yoyo:true,repeat:1,onUpdate:()=>{setLed("led1",s.v>.55?1:0);envs.sim.children[0].material.opacity=.55-s.v*.35;sun.intensity=2.6-s.v*1.8}})}
  else if(a==="motor"){const sh=parts.motorDC.getObjectByName("shaft");const s={w:0};tl.to(s,{w:14,duration:2,ease:"power2.in",onUpdate:()=>{}}).to(s,{w:3,duration:1.6,ease:"power2.out"}).to(s,{w:0,duration:.8});
    const cap=parts.button.getObjectByName("cap");tl.to(cap.position,{y:.035,duration:.1},0).to(cap.position,{y:.045,duration:.2},.1);
    tl.eventCallback("onUpdate",()=>{sh.rotation.z+=s.w*.016})}
  else if(a==="spin"){const s={w:0};tl.to(s,{w:8,duration:1,ease:"power2.out"}).to({},{duration:2}).to(s,{w:0,duration:.8,ease:"power2.in"}).to({},{duration:1});tl.eventCallback("onUpdate",()=>state.spinIdle=s.w)}
  else if(a==="backforth"){tl.to(robot.position,{x:1.6,duration:1.6,ease:"power2.inOut"}).to(robot.position,{x:-1.2,duration:1.8,ease:"power2.inOut"}).to(robot.rotation,{y:Math.PI/2,duration:.6,ease:"power2.inOut"}).to(robot.rotation,{y:-Math.PI/2,duration:1,ease:"power2.inOut"}).to(robot.rotation,{y:0,duration:.6,ease:"power2.inOut"}).to(robot.position,{x:0,duration:1,ease:"power2.inOut"})}
  else if(a==="square"){const sq=new THREE.CatmullRomCurve3([[-1.4,0,-1.2],[1.4,0,-1.2],[1.6,0,-1.0],[1.6,0,1.0],[1.4,0,1.2],[-1.4,0,1.2],[-1.6,0,1.0],[-1.6,0,-1.0]].map(p=>new THREE.Vector3(...p)),true,"catmullrom",.1);tl.add(driveCurve(sq,robot,9))}
  else if(a==="ping"){const h=parts.hcsr04;tl.call(()=>ping(h)).to({},{duration:.7})}
  else if(a==="wall"){robot.position.x=-2.2;const h=parts.hcsr04;
    tl.set(robot.position,{x:-2.2,z:0}).set(robot.rotation,{y:0}).to(robot.position,{x:1.05,duration:2.4,ease:"power1.in"})
      .call(()=>ping(h)).to(robot.position,{x:1.0,duration:.25,ease:"power3.out"}).call(()=>ping(h)).to({},{duration:.6})
      .to(robot.position,{x:.2,duration:.9,ease:"power2.inOut"}).to(robot.rotation,{y:Math.PI*.75,duration:.9,ease:"power2.inOut"})
      .to(robot.position,{x:-1.4,z:1.4,duration:1.4,ease:"power2.inOut"}).to(robot,{duration:.3,onStart:()=>{}})
      .to(robot.rotation,{y:0,duration:.6}).to(robot.position,{x:-2.2,z:0,duration:.8})}
  else if(a==="lineIdle"){const p=TRACK.getPointAt(.95),t=TRACK.getTangentAt(.95);robot.position.set(p.x,0,p.z);robot.rotation.y=-Math.atan2(t.z,t.x);
    tl.to(robot.rotation,{y:"+=0.25",duration:.8,ease:"sine.inOut",yoyo:true,repeat:1}).to(robot.rotation,{y:"-=0.25",duration:.8,ease:"sine.inOut",yoyo:true,repeat:1})}
  else if(a==="follow"){tl.add(driveCurve(TRACK,robot,cur===23?16:13));if(cur===23)tl.eventCallback("onUpdate",()=>{robot.rotation.y+=Math.sin(performance.now()/90)*.06})}
  else if(a==="detour"){tl.add(driveCurve(DETOUR,robot,15))}
  else if(a==="signs"||a==="full"){const curve=a==="full"?DETOUR:TRACK;const s={t:0};const seg=(to,d)=>tl.to(s,{t:to,duration:d,ease:"none",onUpdate:()=>{const t=s.t%1,p=curve.getPointAt(t),tg=curve.getTangentAt(t);robot.position.set(p.x,0,p.z);robot.rotation.y=-Math.atan2(tg.z,tg.x)}});
    const col=parts.color;seg(.06,1.2);tl.call(()=>ping(col,"y",0x31E06E));seg(.47,6);tl.call(()=>ping(col,"y",0xFF3B3B)).to({},{duration:1.1});seg(.7,3.2);tl.call(()=>ping(col,"y",0x3D7BFF));seg(1,2.6)}
  else if(a==="servo"){const h=parts.servo.getObjectByName("horn");tl.to(h.rotation,{y:Math.PI/2,duration:.6,ease:"power2.inOut"}).to({},{duration:.4}).to(h.rotation,{y:Math.PI,duration:.6,ease:"power2.inOut"}).to({},{duration:.4}).to(h.rotation,{y:0,duration:.9,ease:"power2.inOut"}).to({},{duration:.4})}
  else if(a==="claw"){const s={o:.5};tl.to(s,{o:1,duration:.5,ease:"power2.out"}).to(s,{o:0,duration:.35,ease:"back.out(2)"}).to({},{duration:.7}).to(s,{o:.5,duration:.4});tl.eventCallback("onUpdate",()=>setClaw(s.o))}
  else if(a==="grab"){const ball=parts.ball;const P=piloto(tl,{x:-.3,z:0,th:0});
    tl.set(robot.position,{x:-.3,z:0}).set(robot.rotation,{y:0}).call(()=>{if(ball.parent===robot)soltar(ball);ball.position.set(1.45,.2,0)});
    P.garra(1).anda(0,0,"power2.out");P.garra(0,.35);tl.call(()=>pegar(ball)).to(ball.position,{y:.28,duration:.25});
    P.anda(.8,0);tl.to(ball.position,{y:.2,duration:.2});P.garra(1);tl.call(()=>soltar(ball)).to({},{duration:.4});P.re(.5);tl.to({},{duration:.4})}
  else if(a==="mission"){/* Faixa Roxa: segue até a bolinha, pega, carrega até a área segura */
    const ball=parts.ball,v=ARENA.ball;const pose={x:ARENA.start.x,z:ARENA.start.z,th:Math.PI/2};const P=piloto(tl,pose);
    tl.set(robot.position,{x:pose.x,z:pose.z}).set(robot.rotation,{y:pose.th}).call(()=>{if(ball.parent===robot)soltar(ball);ball.position.set(v.x,.2,v.z);ball.scale.set(1,1,1)});
    P.vai(-2.7,-.4);P.pega(ball,new THREE.Vector3(v.x,.2,v.z));P.vai(1.3,.5);P.solta(ball,new THREE.Vector3(3.1,.2,2.0));
    tl.to({},{duration:.8}).to(ball.scale,{x:.001,y:.001,z:.001,duration:.3,ease:"power2.in"})}
  else if(a==="cer"){robot.position.set(0,.3,0);tl.set(robot.position,{y:.3}).to(robot.rotation,{y:Math.PI*2,duration:12,ease:"none"})}
  else if(a==="compLinha"){/* modalidade linha: volta cronometrada */
    const s={t:0};const lap=11;$("#oCrono").hidden=false;let volta=0;
    tl.call(()=>{s.t=0;volta++}).to(s,{t:1,duration:lap,ease:"none",onUpdate:()=>{const t=s.t%1,p=LINHA_FP.getPointAt(t),tg=LINHA_FP.getTangentAt(t);robot.position.set(p.x,0,p.z);robot.rotation.y=-Math.atan2(tg.z,tg.x);
      crono(s.t*lap,volta)}}).call(()=>ping(parts.line,"y",0x3DDC84)).to({},{duration:.8})}
  else if(a==="compResgate"){/* modalidade resgate: duas bolinhas, uma de cada vez, carregadas na garra até a área */
    const pose={x:RESG.start.x,z:RESG.start.z,th:0};const P=piloto(tl,pose,.85);const g=envs.compResgate;
    tl.set(robot.position,{x:pose.x,z:pose.z}).set(robot.rotation,{y:0}).call(resetVitimas);
    P.vai(-1.8,.6);P.pega(vitimas[0],RESG.vit[0]);P.vai(1.0,1.4);P.solta(vitimas[0],RESG.solta[0],g);
    P.vai(-.6,.8);P.pega(vitimas[1],RESG.vit[1]);P.vai(1.5,1.2);P.solta(vitimas[1],RESG.solta[1],g);
    tl.to({},{duration:1.4})}
  else tl.to({},{duration:1});
}
function crono(seg,volta){const el=$("#oCrono span");if(el)el.textContent=`volta ${volta} · ${seg.toFixed(1).padStart(4,"0")} s`}

/* explodir */
function applyExplode(animate=true){
  const mode=curStage.mode;Object.keys(parts).forEach(k=>{const p=parts[k];if(!p.visible||!p.userData.base||mode==="layout"||(k==="ball"))return;
    const o=EXPLODE[k]||[0,0,0];const tgt=exploded?{x:p.userData.base.x+o[0],y:p.userData.base.y+o[1]*(mode==="bench"?.6:1),z:p.userData.base.z+o[2]}:{x:p.userData.base.x,y:p.userData.base.y,z:p.userData.base.z};
    gsap.to(p.position,{...tgt,duration:animate&&!REDUCED?.7:0,ease:exploded?"back.out(1.4)":"power3.inOut",overwrite:"auto"})});
}

/* seleção + tooltip */
const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();
const selBox=new THREE.Box3Helper(new THREE.Box3(),0x4DB2FF);selBox.visible=false;scene.add(selBox);
const tip=$("#oTip");
function partAt(ev){const r=renderer.domElement.getBoundingClientRect();ptr.set(((ev.clientX-r.left)/r.width)*2-1,-((ev.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ptr,camera);
  const vis=Object.values(parts).filter(p=>p.visible);const hit=ray.intersectObjects(vis,true).find(h=>h.object.isMesh);if(!hit)return null;let o=hit.object;while(o&&!o.userData.key)o=o.parent;return o?o.userData.key:null}
function select(k,showTip=true){
  selected=k;selBox.visible=!!k;R.querySelectorAll(".o-part").forEach(b=>b.classList.toggle("sel",b.dataset.k===k));
  if(!k){tip.hidden=true;return}
  if(showTip){const [n,d]=PART_INFO[k];tip.innerHTML=`<b>${n}</b><span>${d}</span>`;tip.hidden=false;placeTip()}
}
function placeTip(){if(!selected||tip.hidden)return;const b=new THREE.Box3().setFromObject(parts[selected]);const c=b.getCenter(new THREE.Vector3());c.y=b.max.y;c.project(camera);
  const x=(c.x*.5+.5)*vp.clientWidth,y=(-c.y*.5+.5)*vp.clientHeight;tip.style.left=Math.max(120,Math.min(vp.clientWidth-120,x))+"px";tip.style.top=Math.max(70,y)+"px"}
let down=null;
renderer.domElement.addEventListener("pointerdown",e=>{down=[e.clientX,e.clientY];stopPlay()});
renderer.domElement.addEventListener("pointerup",e=>{if(!down)return;const moved=Math.hypot(e.clientX-down[0],e.clientY-down[1]);down=null;if(moved>6)return;const k=partAt(e);select(k===selected?null:k)});
renderer.domElement.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse"||down)return;renderer.domElement.style.cursor=partAt(e)?"pointer":"grab"});

/* loop (só roda com a oficina na tela) */
const timer=new THREE.Timer();timer.connect(document);
const lastPos=new THREE.Vector3();
function resize(){const w=vp.clientWidth,h=vp.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(vp);
function frame(){
  timer.update();const dt=Math.min(timer.getDelta(),.05);const t=timer.getElapsed();
  controls.update(dt);
  // rodas acompanham o deslocamento do robô
  const moved=robot.position.distanceTo(lastPos);const fwd=new THREE.Vector3(1,0,0).applyQuaternion(robot.quaternion);const sign=Math.sign(fwd.dot(tmp.subVectors(robot.position,lastPos)))||1;lastPos.copy(robot.position);
  const roll=moved/.33*sign+state.spinIdle*dt;
  parts.wheels.traverse(o=>{if(o.name==="spin")o.rotation.z-=roll});
  parts.motors.traverse(o=>{if(o.name==="shaft")o.rotation.z-=roll});
  // cerimônia: troféu gira, faixa preta flutua
  if(envs.cer.visible){const tr=envs.cer.getObjectByName("trophy");tr.rotation.y+=dt*.6;const b=envs.cer.getObjectByName("belt");b.position.y=2.2+Math.sin(t*1.5)*.08;b.rotation.y+=dt*.8}
  if(selected&&parts[selected].visible){selBox.box.setFromObject(parts[selected]).expandByScalar(.02);placeTip()}else if(selected){select(null)}
  renderer.render(scene,camera);
}

/* ================= MINIATURAS ("desenhos" das peças) ================= */
const thumbs={};
(function makeThumbs(){
  const tr=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});tr.setSize(240,180);tr.toneMapping=THREE.ACESFilmicToneMapping;
  const ts=new THREE.Scene();ts.add(new THREE.HemisphereLight(0xffffff,0x334455,1.8));const d=new THREE.DirectionalLight(0xffffff,2.4);d.position.set(2,3,2);ts.add(d);const d2=new THREE.DirectionalLight(0x4DB2FF,1.2);d2.position.set(-2,1,-2);ts.add(d2);
  const tc=new THREE.PerspectiveCamera(32,4/3,.01,50);
  for(const k in builders){const obj=builders[k]();if(k==="box"){obj.getObjectByName("lid").rotation.x=-1.9}ts.add(obj);
    const b=new THREE.Box3().setFromObject(obj),c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3()).length();
    tc.position.copy(c).add(new THREE.Vector3(.75,.62,.95).normalize().multiplyScalar(s*1.55));tc.lookAt(c);tr.render(ts,tc);thumbs[k]=tr.domElement.toDataURL("image/png");ts.remove(obj)}
  tr.dispose();tr.forceContextLoss();
})();

/* ================= UI ================= */
let modo="professor",editando=false,marcas={};
const trackEl=$("#oTrack");
W0.forEach(w=>{const b=document.createElement("button");b.className="o-seg"+(w.tipo==="exame"?" exam":"");b.dataset.f=w.f;b.dataset.n=w.n;b.style.setProperty("--sc",F[w.f].cor);
  b.onclick=()=>{if(w.n>lim.max||w.n<lim.min)return;stopPlay();editando=false;goWeek(w.n)};trackEl.appendChild(b)});
const beltsEl=$("#oBelts");
Object.entries(F).forEach(([k,f])=>{const b=document.createElement("button");b.className="o-belt";b.dataset.k=k;b.style.setProperty("--bc",f.cor);b.innerHTML=`<i></i>${f.short}`;b.onclick=()=>{stopPlay();editando=false;goWeek(f.ini)};beltsEl.appendChild(b)});
function renderBelow(){
  $("#oBelow").innerHTML=Object.entries(F).map(([k,f])=>{const fechada=f.ini>lim.max;return `<button class="o-bcard" data-k="${k}" style="--bc:${f.cor}" ${fechada?'aria-disabled="true"':""} data-go="${f.fim===48?45:(W0.find(w=>w.f===k&&w.tipo==="exame")||{n:f.ini}).n}">
  <span class="bh"><i></i>${f.nome}</span><span class="wks">semanas ${f.ini} a ${f.fim} · ${f.fim-f.ini+1} semanas${fechada?" · bloqueada":""}</span>
  <p><b>Sai da faixa com:</b> ${f.sai}.</p><p><b>${k==="preta"?"Foco":"Exame"}:</b> ${f.exame}.</p></button>`}).join("");
  R.querySelectorAll(".o-bcard").forEach(b=>b.onclick=()=>{if(b.getAttribute("aria-disabled"))return;stopPlay();editando=false;goWeek(Math.min(+b.dataset.go,lim.max));vp.scrollIntoView({behavior:REDUCED?"auto":"smooth",block:"center"})});
}
function renderTrack(){
  trackEl.querySelectorAll(".o-seg").forEach(s=>{const n=+s.dataset.n,w=aula(n),fora=n>lim.max||n<lim.min;
    s.classList.toggle("lock",fora);s.disabled=fora;s.classList.toggle("aqui",(modo==="creator"||modo==="pais")&&n===lim.max);
    const quem=marcas[n]||[];if(quem.length)s.dataset.qtd=quem.length;else delete s.dataset.qtd;
    s.setAttribute("aria-label",`Semana ${n}: ${w.aula}${fora?" (bloqueada)":""}${quem.length?" · "+quem.join(", "):""}`);
    s.title=`Sem. ${n} · ${w.aula}${fora?" · abre quando você chegar lá":""}${quem.length?"\nCreators aqui: "+quem.join(", "):""}`});
  beltsEl.querySelectorAll(".o-belt").forEach(b=>{b.disabled=F[b.dataset.k].ini>lim.max});
}

/* exemplos reais da competição, que o professor sobe (Faixa Preta) */
function ytId(u){const m=String(u).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{6,})/);return m?m[1]:null}
function midiaHTML(){
  const lista=(host&&host.midia())||[],pode=modo==="professor";
  const item=(m,i)=>{const yt=m.url&&ytId(m.url);
    const vis=m.data?`<img src="${m.data}" alt="${esc(m.titulo)}">`:yt?`<iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="${esc(m.titulo)}" allowfullscreen loading="lazy"></iframe>`
      :/\.(jpe?g|png|webp|gif)(\?|$)/i.test(m.url||"")?`<img src="${esc(m.url)}" alt="${esc(m.titulo)}">`:`<div class="o-vazio">▶ vídeo em link externo</div>`;
    return `<div class="o-mi">${vis}<div class="cap"><span>${m.url&&!m.data?`<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.titulo)}</a>`:esc(m.titulo)}</span>${pode?`<button class="o-btn sm" data-delm="${i}" type="button">remover</button>`:""}</div></div>`};
  const vazios=Math.max(0,2-lista.length);
  return `<div class="o-field r"><span class="o-k">Exemplos reais da competição</span>
    <div class="o-midia">${lista.map(item).join("")}${Array.from({length:vazios},(_,i)=>`<div class="o-vazio">${i?"espaço pra foto da competição":"espaço pro vídeo da competição"}</div>`).join("")}</div>
    ${pode?`<form class="o-edit" id="oMidiaF" style="margin-top:6px"><label>Título<input id="oMt" maxlength="80" placeholder="Ex.: etapa regional, modalidade resgate" required></label>
      <label>Link do vídeo ou foto (YouTube, Drive, Instagram)<input id="oMu" type="url" placeholder="https://"></label>
      <label>Ou foto do computador<input id="oMf" type="file" accept="image/*"></label>
      <div class="o-btns"><button class="o-btn fill" type="submit">Adicionar exemplo</button></div>
      <span class="o-xpnote">Vídeo vai por link. Foto do computador fica salva neste navegador.</span></form>`
    :lista.length?"":`<span class="o-xpnote">Aqui entram vídeos e fotos de competições de verdade.</span>`}</div>`;
}
function fotoReduzida(file){return new Promise((ok,erro)=>{const img=new Image();img.onload=()=>{const s=Math.min(1,1280/Math.max(img.width,img.height));const c=document.createElement("canvas");c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(img.src);ok(c.toDataURL("image/jpeg",.8))};img.onerror=erro;img.src=URL.createObjectURL(file)})}

function formEdicao(w){
  return `<form class="o-edit r" id="oEditF">
    <label>Nome da aula<input name="aula" value="${esc(w.aula)}" maxlength="60" required></label>
    <label>${w.tipo==="exame"?"O que o Creator mostra ao vivo":"O Creator sai sabendo"}<textarea name="sabe" maxlength="300">${esc(w.sabe)}</textarea></label>
    <label>Desafio da semana<textarea name="desafio" maxlength="300">${esc(w.desafio||"")}</textarea></label>
    <label>Material<input name="mat" value="${esc(w.mat)}" maxlength="160"></label>
    <span class="o-k">XP da semana (0 tira o item)</span>
    <div class="o-xpgrid">${w.xpItens.map(([k,v])=>`<label>${esc(k)}<input type="number" name="xp:${esc(k)}" value="${v}" min="0" max="500" step="5"></label>`).join("")}</div>
    <div class="o-btns"><button class="o-btn fill" type="submit">Salvar aula</button><button class="o-btn" type="button" id="oCancel">Cancelar</button>
      ${w.editada?`<button class="o-btn" type="button" id="oReset">Voltar ao plano original</button>`:""}</div>
    <span class="o-xpnote">Fica salvo neste navegador. Creators e famílias veem a versão editada.</span>
  </form>`;
}

function renderUI(n,st,entering){
  const w=aula(n),f=F[w.f],x=xpDe(w);
  R.style.setProperty("--c",f.cor);
  $("#oHudWk").textContent=`SEM. ${String(n).padStart(2,"0")} · ${f.nome.toUpperCase()}`;
  $("#oHudScn").textContent=w.aula;$("#oHudBadge").textContent=st.badge;
  trackEl.querySelectorAll(".o-seg").forEach((s,i)=>{s.classList.toggle("on",i===n-1);s.classList.toggle("past",i<n-1)});
  beltsEl.querySelectorAll(".o-belt").forEach(b=>b.setAttribute("aria-pressed",b.dataset.k===w.f));
  $("#oPrev").disabled=n<=lim.min;$("#oNext").disabled=n>=lim.max;
  const modal=$("#oModal");modal.hidden=!st.fp;R.classList.toggle("o-fp",!!st.fp);modal.querySelectorAll("[data-fp]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.fp===fpModo));
  const tipo={exame:"exame de faixa · 100 XP",rec:"recuperação",cer:"cerimônia de faixa",aula:"aula ao vivo · 1h"}[w.tipo];
  const kitNote=n===4?`<span class="o-tag hot">encomendar Kit Iniciante</span>`:n===9?`<span class="o-tag hot">Kit Iniciante chega</span>`:n===21?`<span class="o-tag hot">Kit Avançado chega</span>`:"";
  const aqui=(modo==="creator"||modo==="pais")&&n===lim.max?`<span class="o-tag hot">${modo==="pais"?"semana atual":"você está aqui"}</span>`:"";
  const uniq=[...new Set(st.parts)];const antes=n>1?stageFor(n-1):null;const newSet=new Set(antes&&antes.mode===st.mode?st.parts.filter(k=>!antes.parts.includes(k)):[]);
  const daFaixa=W0.filter(v=>v.f===w.f).map(v=>aula(v.n));
  const maxXP=w.f==="preta"?null:daFaixa.reduce((s,v)=>s+xpDe(v).total,0);
  const soFar=daFaixa.filter(v=>v.n<=n).reduce((s,v)=>s+xpDe(v).total,0);
  const quem=modo==="professor"&&marcas[n]&&marcas[n].length?`<div class="o-field r"><span class="o-k">Creators nesta semana</span><span class="o-v">${marcas[n].map(esc).join(", ")}</span></div>`:"";
  const conteudo=editando&&modo==="professor"?formEdicao(w):`
    <div class="o-field r"><span class="o-k">${w.tipo==="exame"?"O que o Creator mostra ao vivo":w.f==="preta"?"O que acontece":"O Creator sai sabendo"}</span><span class="o-v">${esc(w.sabe)}</span></div>
    <div class="o-field r"><span class="o-k">Desafio da semana</span><span class="o-v">${esc(w.desafio)||"Sem desafio: semana do exame"}</span></div>
    <div class="o-field r"><span class="o-k">Material</span><span class="o-v">${esc(w.mat)}</span></div>
    <div class="o-field r"><span class="o-k">XP possível na semana</span>
      <div class="o-xprow"><span class="o-xpn" id="oXpn">0</span><span class="o-xpnote">${x.it.map(i=>esc(i[0])+" +"+i[1]).join(" · ")} · ajudar colega +15</span></div>
      ${maxXP?`<div class="o-xpbar"><i id="oXpbar"></i></div><span class="o-xpnote">${soFar} de ${maxXP} XP possíveis na ${f.short} até aqui</span>`:`<span class="o-xpnote">XP e meta da Faixa Preta ainda não definidos no plano.</span>`}</div>
    ${modo==="professor"?`<div class="o-btns r"><button class="o-btn" type="button" id="oEdit">Editar esta aula</button></div>`:""}`;
  $("#oPanel").innerHTML=`
    <div class="r"><span class="o-eyebrow" style="color:${f.cor}">Semana ${n} de 48 · ${f.nome}</span><h3>${esc(w.aula)}</h3></div>
    <div class="o-ptype r"><span class="o-tag ${w.tipo==="exame"?"exam":""}">${tipo}</span>${kitNote}${aqui}${w.editada?`<span class="o-tag ed">editada pelo professor</span>`:""}</div>
    <div class="o-look r"><b>Como o projeto fica:</b> ${st.look}</div>
    ${quem}${conteudo}
    ${w.f==="preta"?midiaHTML():""}
    <div class="o-field r"><span class="o-k">Peças em cena · toque pra achar no 3D</span>
      <div class="o-parts">${uniq.map(k=>`<button class="o-part" data-k="${k}">${newSet.has(k)&&st.mode!=="layout"?'<span class="new">NOVA</span>':""}<img src="${thumbs[k]}" alt=""><span class="nm">${PART_INFO[k][0]}</span></button>`).join("")}</div></div>`;
  $("#oPanel").querySelectorAll(".o-part").forEach(b=>b.onclick=()=>{select(b.dataset.k===selected?null:b.dataset.k)});
  ligarPainel(n);
  if(!editando){
    if(!REDUCED){gsap.from(R.querySelectorAll("#oPanel .r"),{y:10,autoAlpha:0,duration:.35,stagger:.04,ease:"power3.out",overwrite:true,clearProps:"all"});
      const o={v:0};gsap.to(o,{v:x.total,duration:.7,ease:"power2.out",onUpdate:()=>{const e=$("#oXpn");if(e)e.textContent=Math.round(o.v)}});
      if(maxXP)gsap.fromTo($("#oXpbar"),{width:((soFar-x.total)/maxXP*100)+"%"},{width:(soFar/maxXP*100)+"%",duration:.8,ease:"power3.out",delay:.15});
      gsap.fromTo(R.querySelector(".o-now"),{y:6,autoAlpha:0},{y:0,autoAlpha:1,duration:.35,ease:"power3.out"});
    } else {$("#oXpn").textContent=x.total;if(maxXP)$("#oXpbar").style.width=(soFar/maxXP*100)+"%"}
  }
  if(selected&&!st.parts.includes(selected))select(null);
}
function soPainel(){renderUI(cur,curStage,[])}
function ligarPainel(n){
  const ed=$("#oEdit");if(ed)ed.onclick=()=>{editando=true;soPainel();const i=R.querySelector("#oEditF input");if(i)i.focus()};
  const fm=$("#oEditF");
  if(fm){fm.onsubmit=e=>{e.preventDefault();const d=new FormData(fm),patch={xp:{}};
      for(const [k,v] of d.entries()){if(k.startsWith("xp:"))patch.xp[k.slice(3)]=Math.max(0,+v||0);else patch[k]=String(v).trim()}
      host.salvarAula(n,patch);editando=false;renderTrack();soPainel()};
    $("#oCancel").onclick=()=>{editando=false;soPainel()};
    const rs=$("#oReset");if(rs)rs.onclick=()=>{host.salvarAula(n,null);editando=false;renderTrack();soPainel()}}
  const mf=$("#oMidiaF");
  if(mf)mf.onsubmit=async e=>{e.preventDefault();const titulo=$("#oMt").value.trim(),url=$("#oMu").value.trim(),file=$("#oMf").files[0];
    if(!url&&!file){$("#oMu").focus();return}
    let data=null;if(file){try{data=await fotoReduzida(file)}catch(_){return}}
    host.addMidia({titulo,url:data?"":url,data});soPainel()};
  R.querySelectorAll("[data-delm]").forEach(b=>b.onclick=()=>{host.delMidia(+b.dataset.delm);soPainel()});
}

/* controles */
$("#oPrev").onclick=()=>{stopPlay();editando=false;goWeek(cur-1)};$("#oNext").onclick=()=>{stopPlay();editando=false;goWeek(cur+1)};
document.addEventListener("keydown",e=>{if(!R.isConnected||lim.min===lim.max)return;if(e.target.closest&&e.target.closest("input,textarea,select"))return;if(e.key==="ArrowRight"){stopPlay();goWeek(cur+1)}if(e.key==="ArrowLeft"){stopPlay();goWeek(cur-1)}});
$("#oExplode").onclick=e=>{exploded=!exploded;e.currentTarget.setAttribute("aria-pressed",exploded);applyExplode(true)};
$("#oSpin").onclick=e=>{controls.autoRotate=!controls.autoRotate;e.currentTarget.setAttribute("aria-pressed",controls.autoRotate)};
$("#oCam").onclick=()=>flyCam(curStage.cam,.9);
R.querySelectorAll("[data-fp]").forEach(b=>b.onclick=()=>{stopPlay();goWeek(cur,{fp:b.dataset.fp})});
let playT=null;const playBtn=$("#oPlay");
function stopPlay(){if(playT){clearInterval(playT);playT=null;playBtn.setAttribute("aria-pressed","false");playBtn.textContent="▶ tocar"}}
playBtn.onclick=()=>{if(playT){stopPlay();return}playBtn.setAttribute("aria-pressed","true");playBtn.textContent="❚❚ pausar";if(cur>=lim.max)goWeek(lim.min);playT=setInterval(()=>{if(cur>=lim.max){stopPlay();return}goWeek(cur+1)},4200)};
$("#oLoading").remove();

/* ================= API pro app.js ================= */
/* opcoes: { modo: 'creator'|'pais'|'professor', ate: última semana liberada, semana: onde abrir,
             titulo, sub, marcas: {semana: [nomes]}, host: {aula(n), salvarAula(n, patch|null), midia(), addMidia(m), delMidia(i)} } */
export function montar(slot,op){
  host=op.host;modo=op.modo||"professor";marcas=op.marcas||{};editando=false;
  lim=modo==="professor"||modo==="publico"?{min:1,max:48}:modo==="pais"?{min:op.ate,max:op.ate}:{min:1,max:op.ate};
  R.classList.toggle("o-so1",lim.min===lim.max);
  $("#oEyebrow").textContent=op.sub||"Plano de aulas · 48 semanas";$("#oTitle").textContent=op.titulo||"O robô do Creator, semana a semana";
  playBtn.setAttribute("aria-label",modo==="creator"?"Tocar as semanas até onde você está":"Tocar o ano inteiro");
  slot.replaceWith(R);
  stopPlay();renderTrack();renderBelow();resize();
  curStage=null;cur=0;goWeek(op.semana||lim.max,{recenter:true});
  renderer.setAnimationLoop(frame);
}
export function retomar(){if(R.isConnected){renderer.setAnimationLoop(frame);if(actionTl)actionTl.resume()}}
export function pausar(){stopPlay();renderer.setAnimationLoop(null);if(actionTl)actionTl.pause()}
window.__eron={goWeek,parts,robot,camera,state,vitimas,get cur(){return cur},get fpModo(){return fpModo}};
