
const state = { page: "inicio", user: null, data: { tarefas:[], compromissos:[], compras:[], estudos:[], treinos:[], lembretes:[], agua:0, fin:{receitas:0,despesas:0} } };

const icon = {inicio:"⌂", agenda:"▣", assistente:"✦", explorar:"◈", perfil:"●", tarefa:"✓", compra:"🛒", estudo:"▤", treino:"⌁", agua:"💧", fin:"$", familia:"♧"};

async function api(path, options={}){
  const r = await fetch("/api"+path, {headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
  if(!r.ok) throw new Error((await r.text())||"Erro");
  return r.json();
}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(msg){const t=document.querySelector(".toast");t.textContent=msg;t.style.display="block";setTimeout(()=>t.style.display="none",2200)}
function layout(content){
  const nav=[["inicio","Início"],["agenda","Agenda"],["assistente","Assistente"],["explorar","Explorar"],["perfil","Perfil"]];
  return `<div class="app-shell">
    <header class="topbar"><div class="brand"><img src="/assets/logo-lidire-oficial.png" alt="LiDire"><div><strong>LiDire</strong><small>Seu Copiloto para a Vida</small></div></div><button class="icon-btn" onclick="toast('Notificações em breve')">♧</button></header>
    <main>${content}</main>
    <nav class="bottom-nav">${nav.map(([id,label])=>`<button class="nav-btn ${state.page===id?'active':''}" onclick="go('${id}')"><span class="nav-ico">${icon[id]}</span>${label}</button>`).join("")}</nav>
    <div class="toast"></div>
  </div>`;
}
function go(page){state.page=page;render()}
function render(){
  const p=state.page;
  let content="";
  if(p==="inicio") content=home();
  if(p==="agenda") content=agenda();
  if(p==="assistente") content=assistant();
  if(p==="explorar") content=explore();
  if(p==="perfil") content=profile();
  document.getElementById("app").innerHTML=layout(content);
}
function home(){
  const n=state.user?.name||"Alice";
  return `<section class="hero-card card"><div class="eyebrow">Seu Copiloto para a Vida</div><h1>Bom dia,<br><span class="gradient-text">${esc(n)}!</span> ☀️</h1><p class="muted">Tudo pronto para mais um dia. Vamos organizar o que importa?</p>
  <div class="stat-grid"><div class="stat"><b>${state.data.tarefas.filter(x=>!x.done).length}</b><span>Tarefas pendentes</span></div><div class="stat"><b>${state.data.compromissos.length}</b><span>Compromissos</span></div><div class="stat"><b>${state.data.estudos.length}</b><span>Atividades de estudo</span></div><div class="stat"><b>${state.data.compras.length}</b><span>Itens para comprar</span></div></div></section>
  <div class="row"><h2>Resumo do seu dia</h2><span class="pill">organizado</span></div>
  <div class="stack">${[
  ["tarefa","Tarefas","Transforme planos em ações",()=>go("explorar")],
  ["agenda","Agenda","Veja compromissos e horários",()=>go("agenda")],
  ["treino","Treinos","Acompanhe sua rotina",()=>go("explorar")],
  ["estudo","Estudos","Continue de onde parou",()=>go("explorar")]
  ].map(x=>`<button class="item" onclick="(${x[3].toString()})()"><span class="ico">${icon[x[0]]}</span><span style="text-align:left;flex:1"><b>${x[1]}</b><br><small class="muted">${x[2]}</small></span><span>›</span></button>`).join("")}</div>
  <div class="card"><div class="row"><div><h3>Insight da LiDire</h3><p class="muted">Menos coisas para lembrar. Mais clareza para viver.</p></div><span class="ico">✦</span></div></div>`;
}
function agenda(){
  return `<div class="row"><div><div class="eyebrow">Sua rotina</div><h1>Agenda</h1></div><button class="primary" onclick="addCommitment()">+ Adicionar</button></div>
  <div class="card"><p class="muted">Hoje</p>${state.data.compromissos.length?state.data.compromissos.map((x,i)=>`<div class="item"><span class="ico">▣</span><span style="flex:1"><b>${esc(x.title)}</b><br><small class="muted">${esc(x.time||"Horário não definido")}${x.location?" · "+esc(x.location):""}</small></span><button class="secondary" onclick="removeItem('compromissos',${i})">Excluir</button></div>`).join(""):`<div class="empty">Nenhum compromisso cadastrado.</div>`}</div>`;
}
function addCommitment(){
  const title=prompt("Nome do compromisso:");
  if(!title)return;
  const time=prompt("Horário (ex.: 14:00):")||"";
  const location=prompt("Local (opcional):")||"";
  state.data.compromissos.push({title,time,location});
  persist(); render(); toast("Compromisso adicionado");
}
function removeItem(k,i){state.data[k].splice(i,1);persist();render()}
function assistant(){
  return `<div class="eyebrow">Inteligência para sua rotina</div><h1>Assistente LiDire</h1>
  <div class="card hero-card"><h2>Bom dia! 👋</h2><p class="muted">Como posso ajudar você a organizar seu dia?</p><div class="list-actions"><button class="secondary" onclick="toast('Sugestão: confira seus compromissos e tarefas de hoje.')">O que é prioridade?</button><button class="secondary" onclick="toast('Sugestão: reserve um horário para o que está pendente.')">Organizar meu dia</button></div></div>
  <div class="card"><h3>Base do MVP</h3><p class="muted">O Assistente começa com regras e sugestões simples. A arquitetura fica preparada para uma camada de IA futura.</p></div>`;
}
function explore(){
  const cards=[
    ["🛒","Compras","Lista de compras"],
    ["📚","Estudos","Disciplinas e atividades"],
    ["🏋️","Treinos","Rotina e exercícios"],
    ["💧","Hidratação","Meta e registros"],
    ["💰","Finanças","Receitas, despesas e objetivos"],
    ["🎯","Objetivos","Metas e progresso"],
    ["👨‍👩‍👧","Família","Compartilhamento da rotina"]
  ];
  return `<div class="eyebrow">Tudo em um só lugar</div><h1>Explorar</h1><p class="muted">Organize os principais aspectos da sua vida.</p><div class="stack">${cards.map(c=>`<button class="item" onclick="toast('${c[1]}: módulo do MVP em preparação')"><span class="ico">${c[0]}</span><span style="flex:1;text-align:left"><b>${c[1]}</b><br><small class="muted">${c[2]}</small></span><span>›</span></button>`).join("")}</div>`;
}
function profile(){
  return `<div class="eyebrow">Sua conta</div><h1>Perfil</h1><div class="card"><h2>${esc(state.user?.name||"Alice")}</h2><p class="muted">${esc(state.user?.email||"conta@lidire.com")}</p><button class="secondary" onclick="editProfile()">Editar perfil</button></div>
  <div class="card"><h3>LiDire - Life Director</h3><p class="muted">Organize sua rotina. Viva melhor.</p></div>`;
}
function editProfile(){
  const name=prompt("Nome completo:",state.user?.name||"Alice"); if(!name)return;
  state.user={...state.user,name}; persist(); render();
}
async function persist(){localStorage.setItem("lidire-mvp-data",JSON.stringify({user:state.user,data:state.data}))}
function loadLocal(){try{const x=JSON.parse(localStorage.getItem("lidire-mvp-data")||"null");if(x){state.user=x.user;state.data={...state.data,...x.data}}}catch{}}
loadLocal(); render();
