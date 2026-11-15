/* Firebase Realtime Database boundary. UI roles are convenience; rules are authority. */
(()=>{'use strict';
const BASE='classrooms/webgame-v1', OWNER='jminjoo3@gmail.com';
const copy=x=>JSON.parse(JSON.stringify(x)), same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
let auth,db,ref,seed,model,user=null,teacher=false,connected=false,ready=false,started=false,unsubs=[],answerOff=[],questionOff=null,questionAllowed=null,generation=0;
const events=new EventTarget();
const emit=(name,detail)=>events.dispatchEvent(new CustomEvent(name,{detail}));
const status=()=>({uid:user?.uid||null,teacher,connected,ready,configured:!!ref});
const fail=e=>{emit('error',e?.message||String(e));};
function listen(path,fn,list=unsubs){const r=ref.child(path),cb=s=>fn(s.val());r.on('value',cb,fail);list.push(()=>r.off('value',cb));}
function publish(){if(model)emit('state',copy(model));emit('status',status());}
function records(v){return Object.entries(v||{}).map(([id,x])=>({...x,id}));}
function syncQuestions(){const allowed=!!user&&(teacher||!model.policies.gate||model.enrollments.some(e=>e.person===user.uid&&e.approved));if(allowed===questionAllowed)return;questionAllowed=allowed;if(questionOff){questionOff();questionOff=null;}model.questions=[];if(allowed){const r=ref.child('questions'),cb=s=>{model.questions=records(s.val()).map(q=>({...q,voters:Object.keys(q.votes||{}).filter(k=>q.votes[k]===true)}));publish();};r.on('value',cb,fail);questionOff=()=>r.off('value',cb);}}
function ownAnswers(){answerOff.forEach(f=>f());answerOff=[];if(!user||teacher)return;model.answers={};for(const s of model.slides.filter(s=>s.kind==='quiz'))listen('answers/'+s.id+'/'+user.uid,v=>{model.answers[s.id]=v===null?{}:{[user.uid]:v};publish();},answerOff);}
async function bind(u){const gen=++generation;if(questionOff)questionOff();questionOff=null;questionAllowed=null;unsubs.forEach(f=>f());answerOff.forEach(f=>f());unsubs=[];answerOff=[];user=u;teacher=false;ready=false;model=copy(seed);model.publicReviews=[];publish();if(!u)return;
try{const tok=await u.getIdTokenResult();if(gen!==generation)return;teacher=tok.claims.firebase?.sign_in_provider==='google.com'&&tok.claims.email_verified===true&&tok.claims.email===OWNER;if(!teacher&&!u.isAnonymous){fail('이 Google 계정에는 강사 권한이 없습니다. 익명 수강생으로 전환합니다.');await auth.signOut();return;}
listen('shared',v=>{if(v){try{const normalized=normalizeContent(v);const oldIds=model.slides.filter(s=>s.kind==='quiz').map(s=>s.id).join();model.course=normalized.course;model.slides=normalized.slides;model.policies={...seed.policies,...normalized.policies};model.live={...seed.live,...normalized.live};model.updated=normalized.updated||0;if(oldIds!==model.slides.filter(s=>s.kind==='quiz').map(s=>s.id).join())ownAnswers();}catch(e){fail(e);}}syncQuestions();publish();});
syncQuestions();
listen('publicReviews',v=>{model.publicReviews=records(v);publish();});
for(const node of ['reviews','enrollments'])listen(node+(teacher?'':'/'+u.uid),v=>{model[node]=teacher?records(v):v?[{...v,id:u.uid}]:[];if(node==='enrollments')syncQuestions();publish();});
if(teacher)listen('answers',v=>{model.answers=v||{};publish();});else ownAnswers();
ready=true;publish();if(teacher){const s=await ref.child('shared').once('value');if(!s.exists())await ref.child('shared').transaction(old=>old||{course:seed.course,slides:seed.slides,policies:seed.policies,live:seed.live,updated:Date.now()});}
if(!teacher&&!u.isAnonymous)fail('이 Google 계정에는 강사 권한이 없습니다. 수강생으로 이용하거나 승인된 계정으로 다시 로그인하세요.');
}catch(e){fail(e);}}
async function start(defaults){if(started)return;started=true;seed=copy(defaults);model=copy(seed);model.publicReviews=[];
try{const config=window.WEBGAME_FIREBASE_CONFIG;if(!window.firebase||!config?.apiKey||!config?.databaseURL)throw Error('온라인 강의실 연결 설정이 없습니다. 슬라이드 열람과 독립 게임만 사용할 수 있습니다.');
const app=firebase.apps.length?firebase.app():firebase.initializeApp(config);auth=app.auth();db=app.database();ref=db.ref(BASE);await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
db.ref('.info/connected').on('value',s=>{connected=s.val()===true;emit('status',status());});
auth.onAuthStateChanged(u=>{if(u)bind(u);else{bind(null);auth.signInAnonymously().catch(fail);}},fail);
}catch(e){fail(e);publish();}}
async function login(){if(!auth)throw Error('Firebase 연결 설정을 확인해주세요.');const p=new firebase.auth.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});await auth.signInWithPopup(p);}
async function logout(){if(auth)await auth.signOut();}
function assertReady(){if(!ready||!user)throw Error('수강생 인증을 기다려주세요. 연결이 안 되면 새로고침해주세요.');if(!connected)throw Error('서버 연결이 끊겼습니다. 연결 후 다시 저장해주세요.');}
async function commit(prev,next){assertReady();const writes={},put=(p,v)=>writes[p]=v;
for(const k of ['course','slides'])if(!same(prev[k],next[k])){if(!teacher)throw Error('강사만 콘텐츠를 변경할 수 있습니다.');put('shared/'+k,next[k]);}
for(const k of ['policies','live'])for(const child of Object.keys(next[k]))if(!same(prev[k][child],next[k][child])){if(!teacher)throw Error('강사만 수업 진행을 변경할 수 있습니다.');put('shared/'+k+'/'+child,next[k][child]);}
if(Object.keys(writes).length)put('shared/updated',Date.now());
for(const q of next.questions){const old=prev.questions.find(x=>x.id===q.id);if(!old){if(!teacher&&(!next.policies.questions||q.person!==user.uid))throw Error('질문을 등록할 수 없습니다.');put('questions/'+q.id,{person:user.uid,text:q.text,created:q.created,done:false});}else{if(teacher&&q.done!==old.done)put('questions/'+q.id+'/done',q.done);for(const voter of q.voters||[])if(!old.voters.includes(voter)){if(voter!==user.uid)throw Error('본인 공감만 추가할 수 있습니다.');put('questions/'+q.id+'/votes/'+user.uid,true);}}}
for(const q of prev.questions)if(!next.questions.some(x=>x.id===q.id)){if(!teacher)throw Error('강사 권한이 필요합니다.');put('questions/'+q.id,null);}
for(const node of ['reviews','enrollments']){for(const item of next[node]){const old=prev[node].find(x=>x.person===item.person);if(same(old,item))continue;const id=item.person;if(!teacher&&id!==user.uid)throw Error('본인 기록만 작성할 수 있습니다.');const obj=node==='reviews'?{person:id,text:item.text,rating:item.rating,created:item.created,approved:teacher?!!item.approved:false}:{person:id,name:item.name,created:item.created,approved:teacher?!!item.approved:false};put(node+'/'+id,obj);if(!teacher&&node==='reviews')put('publicReviews/'+id,null);if(teacher&&node==='reviews')put('publicReviews/'+id,obj.approved?{text:obj.text,rating:obj.rating,created:obj.created,approved:true}:null);}
for(const item of prev[node])if(!next[node].some(x=>x.person===item.person)){if(!teacher)throw Error('강사 권한이 필요합니다.');put(node+'/'+item.person,null);if(node==='reviews')put('publicReviews/'+item.person,null);}}
for(const slide of new Set([...Object.keys(prev.answers),...Object.keys(next.answers)])){const before=prev.answers[slide]||{},after=next.answers[slide]||{};if(teacher&&!(slide in next.answers)){put('answers/'+slide,null);continue;}for(const id of Object.keys(after))if(before[id]!==after[id]){if(!teacher&&id!==user.uid)throw Error('본인 응답만 기록할 수 있습니다.');if(!teacher&&next.policies.gate&&!next.enrollments.find(e=>e.person===user.uid)?.approved)throw Error('수강 승인 후 응답할 수 있습니다.');put('answers/'+slide+'/'+id,after[id]);}}
if(!Object.keys(writes).length)return;
await ref.update(writes);}

function contentError(message){throw Error('강의/백업 형식 오류: '+message);}
const validKey=(v,max=128)=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[.#$\/\[\]\u0000-\u001f\u007f]/.test(v)&&!['__proto__','prototype','constructor'].includes(v);
function normalizeContent(input){const x=copy(input),c=x?.course;if(!c||typeof c!=='object'||!Array.isArray(c.modules)||!c.modules.length||c.modules.length>12)contentError('모듈 1~12개가 필요합니다.');
for(const key of ['title','subtitle','instructor','date','duration','audience','description'])if(typeof c[key]!=='string'||c[key].length>2000)contentError('강의 정보 '+key);
const moduleIds=new Set();for(const m of c.modules){if(!validKey(m.id,80)||moduleIds.has(m.id)||typeof m.title!=='string'||typeof m.summary!=='string'||!Number.isFinite(m.minutes)||m.minutes<0)contentError('모듈');moduleIds.add(m.id);}
for(const key of ['resources','glossary']){if(c[key]==null)c[key]=[];if(!Array.isArray(c[key]))contentError(key);}
if(c.resources.some(r=>!r||typeof r.title!=='string'||typeof r.description!=='string'||!['checklist','notes','prompts'].includes(r.type)))contentError('자료실');
if(c.glossary.some(g=>!g||typeof g.term!=='string'||typeof g.definition!=='string'))contentError('용어집');
if(!Array.isArray(x.slides)||!x.slides.length||x.slides.length>150)contentError('슬라이드 1~150개가 필요합니다.');const slideIds=new Set();for(const s of x.slides){if(!s||!validKey(s.id,80)||slideIds.has(s.id)||!moduleIds.has(s.module)||!['cover','cards','steps','compare','prompt','quiz','practice','break','ending'].includes(s.kind)||typeof s.title!=='string'||typeof s.subtitle!=='string')contentError('슬라이드 기본 정보');slideIds.add(s.id);if(s.items==null)s.items=[];if(!Array.isArray(s.items)||s.items.length>4||s.items.some(i=>!i||typeof i.title!=='string'||typeof i.body!=='string'))contentError('슬라이드 카드');if(s.kind==='quiz'&&(!Array.isArray(s.options)||s.options.length<2||s.options.length>4||s.options.some(o=>typeof o!=='string')||!Number.isInteger(s.answer)||s.answer<0||s.answer>=s.options.length))contentError('퀴즈');if(s.kind==='prompt'&&typeof s.prompt!=='string')contentError('프롬프트');}return x;}
function validateRestore(input){const next=normalizeContent(input),out={shared:{course:next.course,slides:next.slides,policies:{},live:{},updated:Date.now()},questions:null,reviews:null,publicReviews:null,enrollments:null,answers:null};
const bad=label=>contentError(label),text=(v,max)=>typeof v==='string'&&v.length>=1&&v.length<=max,time=v=>Number.isFinite(v)&&v>0&&v<=Date.now()+60000;
for(const k of ['locked','pdf','materials','gate','questions','reviews']){if(typeof next.policies?.[k]!=='boolean')bad('정책 '+k);out.shared.policies[k]=next.policies[k];}
for(const k of ['slide','timerEnd','timerPaused']){const v=next.live?.[k];if(!Number.isFinite(v)||v<0||(k==='slide'&&(!Number.isInteger(v)||v>=next.slides.length)))bad('진행 상태 '+k);out.shared.live[k]=v;}
const collection=k=>{const a=next[k]??[];if(!Array.isArray(a)||a.length>5000)bad(k+' 배열');return a;};
const qmap=Object.create(null);for(const q of collection('questions')){if(!q||!validKey(q.id,80)||qmap[q.id]||!validKey(q.person)||!text(q.text,600)||!time(q.created)||typeof q.done!=='boolean')bad('질문');let voters=q.voters;if(voters==null&&q.votes!=null){if(typeof q.votes!=='object'||Array.isArray(q.votes)||Object.values(q.votes).some(v=>v!==true))bad('공감');voters=Object.keys(q.votes);}voters??=[];if(!Array.isArray(voters)||voters.length>5000||voters.some(v=>!validKey(v)))bad('공감');const votes=Object.create(null);for(const id of voters)votes[id]=true;qmap[q.id]={person:q.person,text:q.text,created:q.created,done:q.done};if(voters.length)qmap[q.id].votes=votes;}if(Object.keys(qmap).length)out.questions=qmap;
for(const node of ['reviews','enrollments']){const map=Object.create(null),pub=Object.create(null);for(const r of collection(node)){if(!r||!validKey(r.person)||map[r.person]||!time(r.created)||typeof r.approved!=='boolean')bad(node+' 작성자/시간/상태');if(node==='reviews'){if(!text(r.text,500)||!Number.isInteger(r.rating)||r.rating<1||r.rating>5)bad('후기');map[r.person]={person:r.person,text:r.text,rating:r.rating,created:r.created,approved:r.approved};if(r.approved)pub[r.person]={text:r.text,rating:r.rating,created:r.created,approved:true};}else{if(!text(r.name,80))bad('신청 이름');map[r.person]={person:r.person,name:r.name,created:r.created,approved:r.approved};}}if(Object.keys(map).length)out[node]=map;if(node==='reviews'&&Object.keys(pub).length)out.publicReviews=pub;}
const answers=next.answers??{};if(!answers||typeof answers!=='object'||Array.isArray(answers))bad('답안');const amap=Object.create(null);for(const [slide,rows]of Object.entries(answers)){if(!validKey(slide,80)||!rows||typeof rows!=='object'||Array.isArray(rows))bad('답안 슬라이드');const vals=Object.create(null);for(const [id,a]of Object.entries(rows)){if(!validKey(id)||!Number.isInteger(a)||a<0||a>3)bad('답안 값');vals[id]=a;}if(Object.keys(vals).length)amap[slide]=vals;}if(Object.keys(amap).length)out.answers=amap;return out;}
async function restore(next){assertReady();if(!teacher)throw Error('강사 권한이 필요합니다.');const updates=validateRestore(next);await ref.update(updates);}

async function reset(all=false){assertReady();if(!teacher)throw Error('강사 권한이 필요합니다.');const w={questions:null,reviews:null,publicReviews:null,enrollments:null,answers:null,'shared/live':copy(seed.live),'shared/updated':Date.now()};if(all){w['shared/course']=copy(seed.course);w['shared/slides']=copy(seed.slides);w['shared/policies']=copy(seed.policies);}await ref.update(w);}
window.ClassroomCloud={start,login,logout,commit,reset,restore,validateRestore,normalizeContent,status,on:(n,fn)=>events.addEventListener(n,e=>fn(e.detail)),snapshot:()=>copy(model||seed)};
})();
