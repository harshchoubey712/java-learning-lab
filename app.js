'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich=s=>esc(s).replace(/`([^`]+)`/g,'<code>$1</code>');
const KEY='java-learning-lab-v2';
let course, current=0, timer, toastTimer, playToken=0, playing=false, slideIndex=0;
let prefs={last:null,done:[],sections:{},notes:{},speed:.85,voice:'',audio:true};
try{const stored=JSON.parse(localStorage.getItem(KEY)||'null');if(stored&&typeof stored==='object') prefs={...prefs,...stored};}catch{}
if(!Array.isArray(prefs.done))prefs.done=[];
for(const k of ['sections','notes'])if(!prefs[k]||typeof prefs[k]!=='object')prefs[k]={};
function save(){try{localStorage.setItem(KEY,JSON.stringify(prefs));return true;}catch{toast('Browser storage unavailable. Progress lasts for this session.');return false;}}
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2600);}
function lesson(){return course.lessons[current];}
function sectionDone(key){return Boolean(prefs.sections[lesson().id]?.[key]);}
function markCheck(key){return `<label class="check-row"><input type="checkbox" data-check="${key}" ${sectionDone(key)?'checked':''}>${({reading:'I understand the reading',java:'I traced the Java example',qa:'I reviewed the QA application',watch:'I reviewed the walkthrough'})[key]}</label>`;}
function codeBox(code,label){return `<div class="codebox"><div class="codebar"><span>${esc(label)}</span><button class="copy" type="button">Copy code</button></div><pre><code>${esc(code)}</code></pre></div>`;}
function findLesson(moduleIndex,topic){const exact=course.lessons.findIndex(l=>l.moduleIndex===moduleIndex&&l.topic===topic);return exact>=0?exact:course.lessons.findIndex(l=>l.moduleIndex===moduleIndex&&l.covers.includes(topic));}
function renderModules(){
 const open=new Set($$('.module[open]').map(d=>d.dataset.module));
 const query=$('#search').value.trim().toLowerCase();
 let html='';course.modules.forEach((m,mi)=>{
  const matchModule=m.name.toLowerCase().includes(query);
  const topics=m.topics.filter(t=>!query||matchModule||t.toLowerCase().includes(query));
  if(!topics.length)return;
  const lessons=course.lessons.filter(l=>l.moduleIndex===mi);
  const count=lessons.filter(l=>prefs.done.includes(l.id)).length;
  html+=`<details class="module" data-module="${mi}" ${query||open.has(String(mi))?'open':''}><summary><span class="modnum">${String(mi+1).padStart(2,'0')}</span><span>${esc(m.name.replace(/^\d+\. /,''))}</span><span class="modmeta">${count}/${lessons.length}</span><span class="chevron">+</span></summary><p class="chapter-info">${m.topics.length} topics · ${lessons.length} guided lesson${lessons.length===1?'':'s'}</p><ol>${topics.map(t=>{const i=findLesson(mi,t),l=course.lessons[i];return `<li><a href="#/lesson/${l.id}" class="topic-btn ${i===current?'selected':''}" data-lesson="${i}" data-topic="${esc(t)}"><span class="topic-state">${prefs.done.includes(l.id)?'✓':'·'}</span><span>${esc(t)}</span></a></li>`;}).join('')}</ol></details>`;
 });
 $('#modules').innerHTML=html||'<div class="empty">No matching concept. Try Java, Spring, testing or a chapter name.</div>';
 $$('[data-lesson]').forEach(b=>b.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();selectLesson(Number(b.dataset.lesson),true,b.dataset.topic);}));
}
function updateProgress(){
 const done=course.lessons.filter(l=>prefs.done.includes(l.id)).length;
 $('#progress-text').textContent=`${done} / ${course.lessons.length} completed`;
 $('#total-progress').max=course.lessons.length;$('#total-progress').value=done;
 $('#resume').innerHTML=`${prefs.last?'Continue learning':'Start learning'} <span>↗</span>`;
 $('#resume-label').textContent=prefs.last?`Continue: ${lesson().topic}`:'One clear concept at a time.';
 $$('[data-status]').forEach(s=>s.textContent=sectionDone(s.dataset.status)?'✓':'');
}
function setUrl(){const path='#/lesson/'+lesson().id;if(location.hash!==path)history.pushState(null,'',path);document.body.classList.add('lesson-route');document.title=lesson().topic+' · Java with Harsh';}
function goHome(){stopPlayer();document.body.classList.remove('lesson-route');document.title='Java with Harsh – Java, Spring Boot & QA Automation Course';if(location.hash!=='#syllabus')history.pushState(null,'','#syllabus');$('#syllabus').scrollIntoView({behavior:'smooth'});}

function whyFor(l){
 const t=l.topic.toLowerCase();
 const exact=[
  [/jdk vs jre vs jvm/,'Ye separation isliye exist karti hai taaki developer tools, runtime libraries aur bytecode execution engine ki responsibilities clear rahen. Compile karne ke liye JDK chahiye; run karne ke liye compatible runtime/JVM.'],
  [/methods introduction/,'Method ka main purpose repeated logic ko ek meaningful naam dena hai. Agar same logic 5 jagah copy karoge, bug fix bhi multiple jagah karna padega; method us logic ka single reusable home banata hai.'],
  [/arrays introduction/,'Array tab useful hai jab same type ke multiple values ko ek ordered, fixed-size structure me rakhna ho. Har value ke liye alag variable banane ke bajay index se access milta hai.'],
  [/this keyword/,'this tab zaroori hota hai jab current object ko explicitly refer karna ho—especially field aur parameter ka naam same ho, constructor chaining karni ho, ya fluent API me same object return karna ho.'],
  [/inheritance/,'Inheritance related classes ke common behavior ko reuse karne aur is-a relationship model karne ke liye hoti hai. Sirf code reuse ke liye inheritance force karna tight coupling create kar sakta hai.'],
  [/polymorphism/,'Polymorphism caller ko concrete implementation se loosely coupled rakhta hai. Same contract/reference ke through different runtime behavior mil sakta hai.'],
  [/streams/,'Streams collection ko manually loop karne ke bajay data-processing pipeline ke form me express karte hain: source se filter/map aur phir terminal result.'],
  [/rest controller/,'REST Controller HTTP request ko Java method tak map karta hai aur response ko HTTP response me convert karta hai. Business logic ko controller me bharna nahi; orchestration thin rakhna better hai.'],
  [/dependency injection/,'Dependency Injection object ko apni dependency khud create karne ke bajay bahar se receive karne deta hai. Isse replacement, testing aur configuration easy hoti hai.'],
  [/kafka basics/,'Kafka producers aur consumers ko time aur availability ke level par decouple karta hai. Event durable log me store hota hai, isliye consumer baad me bhi process kar sakta hai.'],
  [/docker basics/,'Docker environment ko repeatable banata hai: same image se local, CI aur server par predictable process start kiya ja sakta hai. Works-on-my-machine gap reduce hota hai.'],
  [/rag basics/,'RAG model ko answer se pehle external evidence retrieve karne deta hai. Goal model memory par blind trust ke bajay relevant source context provide karna hai.']
 ];
 for(const [re,v] of exact) if(re.test(t)) return v;
 if(/keyword|identifier|variable|data type|operator|wrapper/.test(t)) return 'Ye basic language building block compiler ko clear intent deta hai: data ka naam kya hai, type kya hai, aur operation ka meaning kya hai. Strong basics ke bina later OOP/Spring code sirf syntax yaad karne jaisa lagta hai.';
 if(/if\/else|switch|loop|jump/.test(t)) return 'Program ko sirf top-to-bottom fixed script nahi rehna; runtime data ke basis par decision, repetition aur flow control chahiye. Ye construct wahi control provide karta hai.';
 if(/method|varargs|argument|access modifier|static vs instance/.test(t)) return 'Methods behavior ko organize karte hain. Is topic ka purpose method ko reusable, correctly scoped aur caller-friendly banana hai.';
 if(/array/.test(t)) return 'Related values ko predictable structure me store/process karne ke liye array rules samajhna zaroori hai—especially size, index, reference behavior aur utility operations.';
 if(/string/.test(t)) return 'Text almost har application me hota hai. Java String design, immutability, comparison aur efficient mutation ke rules samajhne se subtle bugs aur performance issues avoid hote hain.';
 if(/class|object|constructor|encapsulation|inheritance|polymorphism|abstraction|package|super|object class/.test(t)) return 'OOP ka goal data aur behavior ko meaningful domain objects me organize karna hai. Is topic se object creation, reuse, visibility ya runtime behavior ka ek specific part control hota hai.';
 if(/interface/.test(t)) return 'Interface implementation se pehle contract define karta hai. Caller kya capability chahiye par depend kar sakta hai, kaunsi concrete class hai par nahi.';
 if(/exception|try|catch|finally|throw|nullpointer/.test(t)) return 'Failures normal control flow se alag handle karne padte hain. Exception mechanism error ko signal, propagate, recover ya translate karne ka structured way deta hai.';
 if(/regex|matcher|character class|quantifier/.test(t)) return 'Text pattern ko manually character-by-character check karna verbose hota hai. Regex compact pattern language deta hai, lekin readability aur correctness carefully handle karni hoti hai.';
 if(/memory|heap|stack|garbage|leak/.test(t)) return 'Java memory automatically managed hai, but object lifetime free nahi hai. Reference reachability aur memory areas samajhne se leaks, OOM aur concurrency behavior reason karna easy hota hai.';
 if(/generic|wildcard|bounded|erasure/.test(t)) return 'Generics compile-time type safety ke saath reusable containers/APIs banate hain. Casts aur wrong-type runtime failures reduce hote hain.';
 if(/collection|list|set|queue|map|iterator|comparable|comparator|hashmap|hashcode/.test(t)) return 'Real applications me data ko sirf store nahi, search, order, deduplicate, map aur traverse bhi karna hota hai. Collections different access patterns ke liye purpose-built structures deti hain.';
 if(/lambda|predicate|consumer|supplier|method reference|collector|optional|map\/filter\/reduce/.test(t)) return 'Java 8+ features behavior ko value ki tarah pass karne aur data transformation ko declarative banane ke liye aaye. Goal boilerplate kam aur intent clearer karna hai.';
 if(/date|time|duration|period|formatter/.test(t)) return 'Date/time bugs timezone, calendar aur duration semantics mix karne se aate hain. Dedicated immutable types intention clear rakhte hain.';
 if(/thread|synchron|lock|deadlock|future|priority/.test(t)) return 'Concurrency multiple tasks ko overlap karne deti hai, lekin shared state race conditions create kar sakta hai. Is topic ka purpose execution aur coordination ke specific rule ko control karna hai.';
 if(/io|reader|writer|file|buffer|nio/.test(t)) return 'External data ko read/write karte waqt bytes, characters, buffering aur resources ki lifecycle manage karni hoti hai. Ye APIs wahi boundary handle karti hain.';
 if(/network|socket|serversocket|url/.test(t)) return 'Do processes ya machines ko data exchange karne ke liye address, connection aur protocol boundary chahiye. Networking APIs us communication ko Java objects me expose karti hain.';
 if(/jdbc|connection|statement|resultset|metadata|pool/.test(t)) return 'Java application aur relational database ke beech standard contract chahiye. JDBC connection, SQL execution, transaction aur result reading ko structured API deta hai.';
 if(/maven|junit|mockito|rest assured|testng|component|contract|testcontainer/.test(t)) return 'Testing/build tools repeatability aur feedback ke liye hain: same build, isolated test, controlled dependency aur reliable assertion ko automate karna.';
 if(/spring|ioc|bean|scope|profile|configuration/.test(t)) return 'Spring object wiring aur application infrastructure ko framework-managed banata hai, taaki business code creation/configuration boilerplate se separate rahe.';
 if(/controller|service layer|validation|actuator|boot project|configuration properties/.test(t)) return 'Spring Boot convention aur auto-configuration se production-style application setup simplify karta hai; har layer ki responsibility separate rakhna maintainability ke liye important hai.';
 if(/jpa|entity|repository|relationship|transaction|flyway|oracle|postgres|pagination/.test(t)) return 'Persistence layer ka goal Java domain model aur durable database state ke beech safe, transactional mapping rakhna hai.';
 if(/microservice|service boundary|feign|webclient|resilience|discovery|gateway|observability|tracing/.test(t)) return 'Distributed systems me network failure, ownership aur observability first-class concerns hain. Is topic ka purpose services ko independently evolve karte hue integration safe rakhna hai.';
 if(/kafka|producer|consumer|offset|retry|dlq|idempot/.test(t)) return 'Event-driven flow me producer aur consumer decoupled hote hain. Delivery, retry, offset aur duplicate handling explicitly design karna padta hai.';
 if(/docker|compose|jenkins|github actions|quality gate/.test(t)) return 'Delivery pipeline ka goal same software ko repeatable environment me build, test aur release karna hai. Automation manual drift reduce karti hai.';
 if(/chatclient|prompt|structured output|tool calling|embedding|vector|advisor|spring ai/.test(t)) return 'AI integration ko plain string call se production feature banane ke liye model boundary, structure, retrieval, tool permission aur observability manage karni padti hai.';
 if(/rag|chunk|retriev|ground|mcp|ai test|failure analysis|evaluation|guardrail/.test(t)) return 'AI-for-QA flow trustworthy tab banta hai jab evidence retrieval, tool boundary, structured evaluation aur failure handling explicit ho—not just model se answer le lo.';
 return 'Is concept ka purpose code ko clearer responsibility dena hai. Pehle problem samjho, phir syntax dekho; syntax yaad karna secondary hai.';
}
function analogyFor(l){
 const t=l.topic.toLowerCase();
 const rules=[
  [/jdk vs jre vs jvm/,'Restaurant analogy: **JDK = full kitchen plus chef tools**, **JRE = required runtime setup**, aur **JVM = actual engine jo bytecode execute karta hai**. Run karne wale user ko compiler tools zaroori nahi.'],
  [/input & output/,'Reception desk socho: input wo information hai jo visitor deta hai; program usko process karta hai; output receipt ya display hai jo system wapas deta hai.'],
  [/identifier/,'Office me har employee ka meaningful badge-name hota hai. Identifier variable, method ya class ko wahi readable naam deta hai; naming rules badge-format rules jaise hain.'],
  [/keyword/,'Traffic sign STOP ka fixed meaning hota hai; tum usko apne variable ka custom meaning nahi de sakte. Java keyword ka compiler-defined meaning fixed hota hai.'],
  [/variable/,'Variable ko **labelled box** samjho: label = name, box ka allowed shape = data type, andar current value. Value replace ho sakti hai, type rule fixed rehta hai.'],
  [/data type/,'Warehouse me liquid tank, document drawer aur pallet alag cheezein hold karte hain. Data type compiler ko batata hai kis kind ka value store hoga aur kaunse operations valid hain.'],
  [/wrapper/,'Primitive ko courier parcel me wrap karna socho. int lightweight raw value hai; Integer us value ko object form deta hai jise generic/object APIs use kar sakti hain.'],
  [/operator/,'Calculator ke buttons jaise +, -, >, && operands par defined operation perform karte hain.'],
  [/if\/else/,'Airport security gate: condition true ho to lane A, false ho to lane B. Program bhi runtime condition dekhkar branch choose karta hai.'],
  [/switch/,'Restaurant token counter: token value ke basis par predefined counter choose hota hai. Bahut saare exact alternatives ho to switch readable ho sakta hai.'],
  [/loop/,'Conveyor belt par 100 boxes ko same inspection se pass karna loop jaisa hai: condition true rahe to repeated action, phir update. Stop rule galat hua to belt rukega nahi.'],
  [/jump statement/,'Playlist analogy: continue current item skip karke next par; break loop hi band; return current method se bahar.'],
  [/methods introduction|method/,'Recipe analogy: chai banane ke steps ek recipe me define karo; har baar inputs do aur recipe call karo. Logic ek jagah maintain hota hai.'],
  [/static vs instance/,'Apartment building: society notice board static/shared hai; har flat ka electricity reading instance-specific state hai.'],
  [/access modifier/,'Office access badge: public lobby sabke liye, private cabin restricted, protected family/team hierarchy ke liye. Visibility ek design boundary hai.'],
  [/varargs/,'Shopping basket jahan 1, 3 ya 10 items de sakte ho. Caller ko count flexible milta hai; method andar array-like data handle karta hai.'],
  [/multi-dimensional array/,'Spreadsheet: row plus column se cell milta hai. 2D array me first index row choose karta hai, second us row ka element.'],
  [/jagged array/,'Cinema rows jahan har row me seats ki count different ho. Java 2D structure arrays-of-arrays hai, isliye row lengths differ kar sakti hain.'],
  [/array/,'Numbered lockers ki fixed row socho: har locker same type ka item rakhta hai; locker number = index; total lockers creation ke baad fixed.'],
  [/== vs equals/,'Do ID cards compare karo: == poochta hai kya same physical object/reference hai; equals typically poochta hai kya meaningful content same hai.'],
  [/stringbuilder/,'Whiteboard par sentence edit karna: same board par append aur replace karte jao. Immutable String me modification par naya value/object create ho sakta hai.'],
  [/stringbuffer/,'Shared office whiteboard jahan controlled synchronized access diya jata hai. Safety milti hai, cost ke saath.'],
  [/string/,'Printed boarding pass analogy: String immutable hai—existing printed text change nahi hota; modified text ke liye naya String value banta hai.'],
  [/classes & objects/,'Class **house blueprint** hai; object us blueprint se bana actual house. Blueprint structure/behavior define karta hai, har house ki own state ho sakti hai.'],
  [/constructor/,'New employee onboarding checklist: object create hote hi initial valid state set karni hoti hai. Constructor wahi setup phase hai.'],
  [/this keyword/,'Meeting me **main khud / current person** bolna this jaisa hai. Same-name parameter ho to this.name current object ka field explicitly identify karta hai.'],
  [/super keyword/,'Child record se parent record ko explicitly access karna super jaisa hai—parent implementation ya constructor select hota hai.'],
  [/encapsulation/,'ATM analogy: account balance ko directly database field edit karke nahi badalte; deposit/withdraw controlled operations se state change hoti hai.'],
  [/inheritance/,'Vehicle family: Car ek Vehicle is-a relation ho sakta hai aur common behavior inherit kar sakta hai, while car-specific behavior add karta hai.'],
  [/polymorphism/,'Universal socket/remote: same contract se different devices apna implementation use karte hain. Caller contract use karta hai; runtime object actual behavior deta hai.'],
  [/abstraction/,'Car driver steering aur brake use karta hai; engine combustion details hide rehti hain. Useful operation visible, unnecessary complexity hidden.'],
  [/interface/,'Electrical socket contract: plug ko defined contract follow karna hai; andar device fan hai ya charger, implementation different ho sakti hai.'],
  [/exception|try\/catch|finally|throw|throws/,'Fire alarm analogy: normal workflow alag; abnormal event signal hota hai, suitable handler react karta hai, cleanup rules separately run hote hain.'],
  [/regex|matcher|character class|quantifier/,'Security gate pattern checklist: 2 letters plus 4 digits jaisi rule ko manually check karne ke bajay compact pattern define karte ho.'],
  [/stack vs heap/,'Desk vs warehouse: method calls ke temporary local frames desk stack jaise come/go; objects shared warehouse/heap me references ke through accessible hote hain.'],
  [/garbage|memory leak/,'Hotel rooms: jo guest/reference reachable nahi, room reclaim ho sakta hai. Unnecessary reference hold karoge to GC room free nahi samjhega.'],
  [/generic|wildcard|bounded|erasure/,'Labelled storage crate: Box of String par clear type label hai. Compiler wrong type dalne se pehle rokta hai.'],
  [/list/,'Train seats ki ordered list: position/index important, duplicates allowed ho sakte hain.'],
  [/set/,'Guest-list desk: same unique guest ko duplicate entry nahi deni. Set uniqueness semantics provide karta hai.'],
  [/queue/,'Billing counter line: generally first aaya pehle serve. Queue processing order model karti hai.'],
  [/map/,'Phone contacts: name/key se phone/value lookup. Key-based access primary idea hai.'],
  [/hashmap/,'Office pigeonholes: hash key ko bucket direction deta hai; equality exact key identify karti hai. hashCode aur equals contract critical hai.'],
  [/comparator|comparable/,'Sorting contest: Comparable object ka natural rank rule hai; Comparator external judge hai jo alternate ranking rule de sakta hai.'],
  [/lambda/,'Courier ko short instruction slip dena: full anonymous class ke bajay required behavior concise expression me pass karte ho.'],
  [/predicate/,'Security checker jo sirf yes/no return karta hai: input leta hai aur boolean decision deta hai.'],
  [/consumer/,'Printer operator: input leta hai, action karta hai, meaningful return value nahi deta.'],
  [/supplier/,'Vending machine: input argument nahi, call karne par value/object supply karta hai.'],
  [/stream/,'Factory conveyor pipeline: source items → filter station → transform station → collect/ship. Pipeline intent describe karti hai.'],
  [/optional/,'Gift box jo value contain kar sakta hai ya empty ho sakta hai, with explicit empty handling operations.'],
  [/localdate|date\/time/,'Calendar page LocalDate date batata hai but wall-clock time nahi; LocalTime clock hai but date nahi. Correct type intent clear karta hai.'],
  [/thread/,'Restaurant kitchen me multiple cooks/tasks overlap kar sakte hain. Shared fridge/resource coordination ke bina race/conflict ho sakta hai.'],
  [/synchron|lock|reentrant/,'Single washroom key: key/lock jis ke paas hai wahi critical section enter kare. Release na hua to doosre wait karenge.'],
  [/deadlock/,'Do log: A ke paas key1 aur key2 ka wait; B ke paas key2 aur key1 ka wait. Dono forever wait kar sakte hain.'],
  [/thread pool/,'Restaurant fixed chefs: har order ke liye naya chef hire nahi karte; limited worker pool incoming tasks process karta hai.'],
  [/completablefuture/,'Food delivery tracking: order place karke counter par block nahi rehna; completion par next action chain ho sakta hai.'],
  [/bufferedreader|bufferedwriter|buffer/,'Paani ek-ek drop transport karne ke bajay bucket/buffer me batch karke move karna—fewer expensive IO operations.'],
  [/reader|writer|java io|file handling|nio/,'File/device se program tak pipeline: Reader/Writer characters ke liye translation pipe hain; buffering throughput improve karti hai.'],
  [/socket|serversocket/,'Phone call: server known number/port par listen karta hai; client connection/socket banata hai; endpoints data exchange karte hain.'],
  [/jdbc|preparedstatement|resultset|connection pool|transaction/,'Bank counter: connection = active counter session, prepared statement = parameterized form, transaction = all-or-nothing operations, pool = reusable counters.'],
  [/maven/,'Construction project manager: pom.xml blueprint/dependencies batata hai; Maven lifecycle compile, test, package repeatably execute karta hai.'],
  [/junit/,'Examiner: setup karo, action run karo, expected vs actual assertion. Pass tab jab evidence expectation satisfy kare.'],
  [/mockito/,'Movie stunt double: real payment/email service ko test me call na karke controlled collaborator use karo.'],
  [/rest assured/,'API inspector: request build, send, phir response status/body/header ko explicit assertions se inspect.'],
  [/component testing/,'Car engine ko car se bahar but realistic dependencies ke saath test karna—component boundary real, external world controlled.'],
  [/contract testing/,'Do teams ke beech signed agreement: consumer expected request/response define karta hai; provider verify karta hai promise break nahi hua.'],
  [/testcontainers/,'Temporary test lab: test start par real PostgreSQL/Kafka container lao, test ke baad discard.'],
  [/dependency injection|ioc/,'Restaurant manager ingredients/tools chef ko supply karta hai. Chef khud dependency create nahi karta, isliye replacement aur testing easy.'],
  [/bean lifecycle/,'Employee join-to-exit lifecycle: create → dependencies set → initialization → use → cleanup. Spring bean hooks isi lifecycle par operate karte hain.'],
  [/profile/,'Same app ki dev/test/prod settings—code same, selected environment configuration change hoti hai.'],
  [/rest controller/,'Hotel reception: HTTP request receive, correct service desk ko forward, formatted response return. Reception khud business logic nahi.'],
  [/service layer/,'Restaurant flow: controller waiter hai, service chef/business rules, repository store/database interaction.'],
  [/validation/,'Airport document check: request process hone se pehle required fields/rules validate; invalid input early reject.'],
  [/actuator/,'Car dashboard: health, metrics aur status indicators operational visibility dete hain without engine kholna.'],
  [/jpa|entity|repository/,'Translator plus librarian: entity Java object ko persistent record semantics deta hai; repository data access operations expose karta hai.'],
  [/flyway/,'Database ka versioned renovation log: V1, V2, V3 migrations exact order me apply so environments same schema history follow karein.'],
  [/microservice|service boundar/,'Company departments: payments, orders, notifications ki ownership clear. Har class ko service banana microservices nahi; boundary meaningful honi chahiye.'],
  [/api gateway/,'Office main reception/security gate: external traffic route aur common policies apply; downstream business ownership replace nahi karta.'],
  [/observability|distributed tracing/,'Courier parcel tracking ID: request multiple services cross kare to same trace context se journey reconstruct karte ho.'],
  [/kafka basics|producer|consumer|offset|consumer group/,'Newspaper distribution: producer publish karta hai, durable log order retain karta hai, subscriber groups apni progress/offset track karte hain.'],
  [/retry|dlq/,'Delivery failed: limited retries; repeatedly failing parcel dead-letter desk me investigation ke liye. Infinite retry main line block kar sakta hai.'],
  [/idempotency/,'Lift button 5 baar press karne se 5 lifts order nahi hone chahiye. Same request repeat ho to duplicate side effect avoid.'],
  [/dockerfile|docker basics/,'Shipping container: image standardized packed template; container us template ka running process. Same package different machines par consistent setup deta hai.'],
  [/docker compose/,'Mini local city plan: app, DB, Kafka services ek file me define aur common network me start.'],
  [/jenkins|github actions/,'Automated factory line: checkout → build → test → scan → package. Har commit same gates se pass hota hai.'],
  [/chatclient|prompt/,'AI ko structured brief dena: system instruction manager policy, user request task, context evidence. Clear roles ambiguity reduce karte hain.'],
  [/embedding|vector store|retrieval/,'Library books ko semantic coordinates dena: similar meaning wale documents vector space me paas aa sakte hain, query nearest candidates retrieve karti hai.'],
  [/tool calling|mcp tool/,'Assistant request suggest karta hai, but locked room kholne se pehle application permission validate karti hai. Model request authorization nahi.'],
  [/rag|grounding/,'Open-book exam: relevant notes retrieve karke answer do aur evidence se grounded raho, memory se guess nahi.'],
  [/chunking/,'Long textbook ko searchable meaningful sections me todna—bahut bada chunk noisy, bahut chhota chunk context lose.'],
  [/evaluation|guardrail/,'Driving test plus guard rail: evaluation measure karta hai behavior kitna correct; guardrail unsafe/invalid path constrain karta hai.']
 ];
 for(const [re,v] of rules) if(re.test(t)) return v;
 return 'Real-life view: **'+l.topic+'** ko '+l.module.replace(/^\d+\.\s*/,'')+' ke ek focused rule/tool ki tarah dekho. Pehle problem identify karo, phir syntax ko us problem ka solution samjho.';
}
function depthPoints(l){
 const pts=[];
 const walk=(l.focusedWalk||'').split(/(?<=[.!?])\s+/).map(x=>x.trim()).filter(x=>x.length>20);
 for(const x of walk.slice(0,5)) pts.push(x);
 if(pts.length<3 && Array.isArray(l.walk)) for(const x of l.walk.slice(0,4)) if(!pts.includes(x)) pts.push(x);
 return pts.slice(0,6);
}


function masterExplanation(l){
 const parts=[];
 const add=x=>{if(x&&typeof x==='string'&&!parts.includes(x))parts.push(x);};
 (l.concept||[]).forEach(add);
 add(whyFor(l));
 (l.chapterConcept||[]).slice(0,3).forEach(add);
 add(l.focusedWalk);
 if(l.normal) add(l.normal);
 return parts.filter(x=>x.length>35).slice(0,8);
}
function conceptRules(l){
 const out=[];
 const seen=new Set();
 const add=x=>{if(x&&x.length>18&&!seen.has(x)){seen.add(x);out.push(x);}};
 (l.interview||[]).forEach(q=>add(q[1]));
 (l.walk||[]).forEach(add);
 add(l.pitfall);
 return out.slice(0,7);
}
function codeLineMeaning(line,l){
 const s=line.trim();
 if(!s)return '';
 if(/^\/\//.test(s)||/^#/.test(s))return 'Comment/config note hai; execution logic ka part tabhi hai jab tool/framework isko interpret kare.';
 if(/^import\s/.test(s))return 'Required type/package ko short name se use karne ke liye import.';
 if(/^package\s/.test(s))return 'Class ka namespace/package declare karta hai.';
 if(/class\s+\w+/.test(s))return 'Class/type define hoti hai; yahin related state aur behavior group hote hain.';
 if(/interface\s+\w+/.test(s))return 'Behavior contract define hota hai; implementation alag class de sakti hai.';
 if(/record\s+\w+/.test(s))return 'Compact immutable-style data carrier declare hota hai with generated accessors/value methods.';
 if(/static void main/.test(s))return 'Program ka entry point; JVM yahan se execution start karti hai.';
 if(/^if\s*\(/.test(s))return 'Condition evaluate hoti hai; true hone par ye branch execute hoti hai.';
 if(/^else\b/.test(s))return 'Previous condition false hone par alternate branch.';
 if(/for\s*\(|while\s*\(/.test(s))return 'Repeated execution/iteration control hota hai.';
 if(/return\b/.test(s))return 'Current method ka result caller ko wapas deta hai aur method yahin finish hoti hai.';
 if(/throw new/.test(s))return 'Invalid/exceptional state ko explicit exception ke through signal karta hai.';
 if(/System\.out\.println/.test(s))return 'Current value/output console par print karta hai so behavior observe kar sako.';
 if(/new\s+\w+/.test(s))return 'Naya object/instance create hota hai; constructor initialization run hoti hai.';
 if(/\bthis\./.test(s))return 'Current object ki field/method ko explicitly refer karta hai.';
 if(/\bsuper\b/.test(s))return 'Parent class constructor/member ko explicitly access karta hai.';
 if(/=/.test(s)&&!/==|>=|<=|!=/.test(s))return 'Right side evaluate karke result left-side variable/field me assign hota hai.';
 if(/\w+\s*\([^)]*\)\s*;?$/.test(s))return 'Method call hai; arguments pass hote hain aur method ka behavior execute hota hai.';
 if(/[{}]/.test(s))return 'Block boundary hai; scope/control structure ko delimit karta hai.';
 return 'Is line ka role '+l.topic+' ke example me syntax ko executable behavior se connect karna hai.';
}
function lineByLine(l){
 const lines=(l.focusedCode||'').split('\n');
 return lines.map((line,i)=>({n:i+1,line,meaning:codeLineMeaning(line,l)})).filter(x=>x.line.trim());
}
function runtimeStory(l){
 const steps=[];
 (l.diagram||[]).forEach(x=>steps.push(x));
 const walk=(l.focusedWalk||'').split(/(?<=[.!?])\s+/).filter(x=>x.trim().length>20);
 walk.slice(0,4).forEach(x=>steps.push(x.trim()));
 return [...new Set(steps)].slice(0,8);
}

function diagramBox(l){
 const steps=l.diagram||[];if(!steps.length)return '';
 const height=steps.length*88;
 return `<figure class="concept-diagram"><figcaption>${esc(l.topic)} · mechanism diagram</figcaption><svg viewBox="0 0 480 ${height}" role="img" aria-label="${esc(steps.join(' then '))}"><defs><marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#406f60"/></marker></defs>${steps.map((s,i)=>`<rect x="20" y="${i*88+5}" width="440" height="58" rx="10" fill="${i===1?'#e4f1b8':'#edf3ef'}" stroke="#406f60"/><text x="240" y="${i*88+40}" text-anchor="middle" font-size="18" font-family="system-ui" fill="#153f36">${esc(s)}</text>${i<steps.length-1?`<line x1="240" y1="${i*88+65}" x2="240" y2="${i*88+88}" stroke="#406f60" stroke-width="2" marker-end="url(#flow-arrow)"/>`:''}`).join('')}</svg><p>Diagram conceptual mechanism dikhata hai. Neeche focused example ke saath har step trace karo; JVM memory diagrams exact physical layout nahi hain.</p></figure>`;
}
function selectLesson(i,scroll=true,topic=''){
 if(i<0||i>=course.lessons.length)return;
 if(topic&&topic!==course.lessons[i].topic){const exact=course.lessons.findIndex(l=>l.moduleIndex===course.lessons[i].moduleIndex&&l.topic===topic);if(exact>=0)i=exact;}
 stopPlayer();current=i;slideIndex=0;prefs.last=lesson().id;save();setUrl(topic);renderLesson();renderModules();updateProgress();
 if(scroll){$('#lesson').scrollIntoView({behavior:'smooth',block:'start'});$('#lesson').focus({preventScroll:true});}
}
function renderLesson(){
 const l=lesson(),complete=prefs.done.includes(l.id);
 $('#chapter-label').textContent=l.module;$('#outline-title').textContent=l.topic;
 $('#lesson-content').innerHTML=`<div class="lesson-header"><button type="button" id="all-topics" class="quiet">All topics / syllabus</button><div class="lesson-meta"><span class="badge">LESSON ${String(current+1).padStart(2,'0')} / ${course.lessons.length}</span><span>${esc(l.module)}</span><span>~${l.minutes} min + practice</span></div><h2>${esc(l.topic)}</h2><p>Read first. Trace the code. Apply it. Then replay it at your pace.</p></div>
 ${complete?'<div class="completion-banner">✓ You marked this lesson complete. Revisit any section whenever you need it.</div>':''}
 <section class="lesson-block" id="reading"><div class="block-title"><span class="step">01</span><h3>Read & understand</h3><span class="type">HINGLISH · CONCEPT FIRST</span></div><div class="master-explanation"><span class="analogy-label">MASTER EXPLANATION</span><h4>${esc(l.topic)} ko basic se deeply samjho</h4>${masterExplanation(l).map((p,i)=>`<p><strong>${i+1}.</strong> ${rich(p)}</p>`).join('')}</div><div class="why-card"><h4>Why do we need ${esc(l.topic)}?</h4><p>${rich(whyFor(l))}</p></div><div class="analogy-card"><span class="analogy-label">REAL-LIFE ANALOGY</span><h4>Dimag me picture banao</h4><p>${rich(analogyFor(l))}</p></div><div class="deep-breakdown"><h4>Concept ko layer-by-layer samjho</h4><ol>${depthPoints(l).map(x=>`<li>${rich(x)}</li>`).join('')}</ol></div><div class="rules-card"><h4>Rules, behavior aur edge cases</h4><ul>${conceptRules(l).map(x=>`<li>${rich(x)}</li>`).join('')}</ul></div><div class="runtime-card"><h4>Runtime me exactly kya hota hai?</h4><ol>${runtimeStory(l).map(x=>`<li>${rich(x)}</li>`).join('')}</ol></div>${l.where?.length?`<div class="use-card"><h4>When would you use this?</h4><ul>${l.where.map(x=>`<li>${rich(x)}</li>`).join('')}</ul></div>`:''}<div class="rules-card"><h4>Important rules & edge cases</h4><ul>${l.interview.slice(0,Math.min(4,l.interview.length)).map(q=>`<li><strong>${esc(q[0])}</strong><br>${rich(q[1])}</li>`).join('')}</ul></div>${diagramBox(l)}${l.extra?`<h4>Uses ko alag-alag samjho</h4><div class="usage-list">${l.extra.map(n=>`<div><h5><code>${esc(n[0])}</code></h5><p>${rich(n[1])}</p></div>`).join('')}</div>`:''}<div class="mistake-box"><h4>Common mistake · kyun hoti hai?</h4><p>${rich(l.pitfall)}</p></div><details class="chapter-context"><summary>Connect this topic to the chapter</summary>${l.chapterConcept.map(p=>`<p>${rich(p)}</p>`).join('')}</details><div class="lesson-references"><strong>Further reading</strong><a href="${esc(l.reference)}" target="_blank" rel="noopener">Official chapter reference</a><a href="${l.topic==='this Keyword'?'https://www.geeksforgeeks.org/java/java-this-keyword/':'https://www.geeksforgeeks.org/java/java/'}" target="_blank" rel="noopener">GeeksforGeeks ${l.topic==='this Keyword'?'this keyword':'Java topic index'}</a></div>
 ${(l.notes||[]).length?`<div class="topic-notes">${l.notes.map((n,i)=>`<div class="concept-note" id="concept-${i}"><h4>${esc(n[0])}</h4><p>${rich(n[1])}</p></div>`).join('')}</div>`:''}${markCheck('reading')}</section>
 <section class="lesson-block" id="java"><div class="block-title"><span class="step">02</span><h3>${esc(l.topic)} · examples from basic to practical</h3><span class="type">TRACE THE LOGIC</span></div><div class="real-example"><div class="real-example-head"><span>EXAMPLE 1 · BASIC / FOCUSED</span><strong>Sabse chhota example — sirf concept isolate karke</strong></div>${codeBox(l.focusedCode,l.snippetLabel)}<p class="lesson-tip">Pehle code ko khud read karke output predict karo. Phir explanation kholo.</p><details class="output"><summary>Predict first · reveal output or behavior</summary><pre>${esc(l.focusedOutput)}</pre></details><h4>Overall flow</h4><p>${rich(l.focusedWalk)}</p><h4>Line-by-line explanation</h4><div class="line-explain">${lineByLine(l).map(x=>`<div class="line-row"><code>${x.n}. ${esc(x.line)}</code><p>${rich(x.meaning)}</p></div>`).join('')}</div></div><div class="real-example"><div class="real-example-head"><span>EXAMPLE 2 · COMPLETE PROGRAM</span><strong>Ab concept ko bigger runnable example me dekho</strong></div><p>${rich(l.normal)}</p>${codeBox(l.code,'EXAMPLE 2 · PRACTICAL / COMPLETE PROGRAM')}<div class="run"><strong>How to run · </strong>${esc(l.run)}</div><details class="output" open><summary>Expected output</summary><pre>${esc(l.output)}</pre></details><h4>Line-by-line / step-by-step explanation</h4><ol class="walk">${l.walk.map(w=>`<li>${rich(w)}</li>`).join('')}</ol></div><details class="chapter-workshop"><summary>Complete chapter workshop · ${esc(l.relatedWorkshop)}</summary><p>${rich(l.normal)}</p>${codeBox(l.code,'COMPLETE CHAPTER EXAMPLE')}<div class="run"><strong>Run the workshop · </strong>${esc(l.run)}</div><pre class="workshop-output">${esc(l.output)}</pre><ol class="walk">${l.walk.map(w=>`<li>${rich(w)}</li>`).join('')}</ol></details>${markCheck('java')}</section>
 <section class="lesson-block" id="qa"><div class="block-title"><span class="step">03</span><h3>Apply it in QA</h3><span class="type">CHAPTER APPLICATION</span></div><div class="qa-callout"><p>${rich(l.qa)}</p></div>${codeBox(l.qacode,'EXAMPLE 3 · QA / SDET REAL-WORLD')}${l.qaOutput?`<h4>Expected output</h4><pre class="workshop-output">${esc(l.qaOutput)}</pre><p>${esc(l.qaRun)}</p>`:''}<h4>${esc(l.topic)} · QA checkpoint</h4><p>${rich(l.pitfall)} Is failure ko test mein reproduce karo; corrected behavior ke liye meaningful assertion likho.</p><p class="lesson-tip">Examples run in your local JDK or the stated project. This page does not compile Java. Shared chapter examples connect the focused topic to a complete application.</p>${l.where?.length?`<ul class="walk">${l.where.map(w=>`<li>${rich(w)}</li>`).join('')}</ul>`:''}${markCheck('qa')}</section>
 <section class="lesson-block" id="watch"><div class="block-title"><span class="step">04</span><h3>Watch & listen</h3><span class="type">HINGLISH WALKTHROUGH</span></div><p>A paced, narrated slide walkthrough of this lesson. Follow the captions, pause to think, and step through the code.</p><div class="player"><div class="player-top"><span class="dot"></span><span>JAVA LAB / NARRATED SLIDES</span><span id="slide-count"></span></div><div class="slide" id="slide" aria-live="polite"></div><input class="seek" id="seek" type="range" min="0" max="${l.slides.length-1}" value="0" aria-label="Walkthrough slide"><div class="player-controls"><button id="slide-prev" aria-label="Previous slide">←</button><button id="play">▶ Play</button><button id="slide-next" aria-label="Next slide">→</button><button id="restart">↺ Restart</button><span id="play-state" class="small">Ready</span></div><div class="player-settings"><label>Speed <select id="speed"><option value="0.7">0.7× · slow</option><option value="0.85">0.85×</option><option value="1">1×</option><option value="1.15">1.15×</option></select></label><label><input type="checkbox" id="audio" ${prefs.audio?'checked':''}> Narration</label><label>Voice <select id="voice" aria-label="Narration voice"><option value="">Device default</option></select></label></div><p class="player-note" id="audio-note">Device speech reads Hinglish captions. Voice quality and availability depend on your browser. This is an interactive walkthrough, not a recorded video.</p></div><details class="transcript"><summary>Read the complete walkthrough transcript (${l.slides.length} scenes)</summary><ol>${l.slides.map(s=>`<li><strong>${esc(s.title)}</strong><br>${rich(s.text)}</li>`).join('')}</ol></details>${markCheck('watch')}</section>
 <section class="lesson-block" id="practice"><div class="block-title"><span class="step">+</span><h3>Make it stick</h3></div><div class="practice-task">${rich(l.practice)}</div>${l.interview.map(q=>`<details class="answer"><summary>${esc(q[0])}</summary><p>${rich(q[1])}</p></details>`).join('')}<label class="notes-label" for="notes">Your notes</label><textarea id="notes" placeholder="What clicked? What would you like to try next?">${esc(prefs.notes[l.id]||'')}</textarea><p class="lesson-tip" id="notes-status">Notes and progress are saved only in this browser.</p></section>
 <div class="bottom-nav"><button id="prev" ${current===0?'disabled':''}>← Previous lesson</button><button id="mark" class="primary">${complete?'✓ Completed · undo':'Mark lesson complete ✓'}</button><button id="next" ${current===course.lessons.length-1?'disabled':''}>Next lesson →</button></div><p class="lesson-tip">Progress is self-marked. Completing a lesson does not imply that its examples were executed.</p>`;
 $('#all-topics').onclick=goHome;
 $$('.copy').forEach(b=>b.onclick=async()=>{const text=b.closest('.codebox').querySelector('code').textContent;try{await navigator.clipboard.writeText(text);toast('Code copied');}catch{const ta=document.createElement('textarea');ta.value=text;document.body.append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();toast(ok?'Code copied':'Select the code to copy it manually.');}});
 $$('[data-check]').forEach(c=>c.onchange=()=>{prefs.sections[l.id]??={};prefs.sections[l.id][c.dataset.check]=c.checked;save();updateProgress();});
 $('#notes').oninput=()=>{prefs.notes[l.id]=$('#notes').value;$('#notes-status').textContent=save()?'Saved in this browser.':'Not saved—browser storage is unavailable.';};
 $('#prev').onclick=()=>selectLesson(current-1);$('#next').onclick=()=>selectLesson(current+1);
 $('#mark').onclick=()=>{stopPlayer();const now=prefs.done.includes(l.id);prefs.done=now?prefs.done.filter(id=>id!==l.id):[...prefs.done,l.id];save();renderLesson();renderModules();updateProgress();toast(now?'Lesson marked as unfinished':'Lesson complete. Your progress is saved.');};
 $('#speed').value=String(prefs.speed);if(!$('#speed').value){prefs.speed=.85;$('#speed').value='.85';$('#speed').value='0.85';}
 $('#speed').onchange=()=>{prefs.speed=Number($('#speed').value);save();if(playing){stopPlayer();startPlayer();}};
 $('#audio').onchange=()=>{prefs.audio=$('#audio').checked;save();if(playing){stopPlayer();startPlayer();}};
 $('#voice').onchange=()=>{prefs.voice=$('#voice').value;save();if(playing){stopPlayer();startPlayer();}};
 $('#play').onclick=()=>playing?stopPlayer(true):startPlayer();
 $('#slide-prev').onclick=()=>moveSlide(-1);$('#slide-next').onclick=()=>moveSlide(1);
 $('#restart').onclick=()=>{stopPlayer();slideIndex=0;renderSlide();};
 $('#seek').oninput=()=>{const was=playing;stopPlayer();slideIndex=Number($('#seek').value);renderSlide();if(was)startPlayer();};
 populateVoices();renderSlide();
}
function populateVoices(){
 if(!$('#voice'))return;
 const synth=window.speechSynthesis;
 if(!synth){$('#audio').checked=false;$('#audio').disabled=true;$('#audio-note').textContent='Speech is unavailable here. Play still advances captioned slides; all transcript text remains available.';return;}
 const voices=synth.getVoices();
 const suitable=voices.filter(v=>/^(en|hi)/i.test(v.lang));
 $('#voice').innerHTML='<option value="">Device default</option>'+suitable.map(v=>`<option value="${esc(v.voiceURI)}">${esc(v.name)} (${esc(v.lang)})</option>`).join('');
 $('#voice').value=prefs.voice;
 if(!$('#voice').value)$('#voice').value='';
}
function renderSlide(){
 const l=lesson(),s=l.slides[slideIndex];
 $('#slide-count').textContent=`${String(slideIndex+1).padStart(2,'0')} / ${l.slides.length}`;
 $('#slide').innerHTML=`<h4>${esc(s.title)}</h4><p>${rich(s.text)}</p>${s.code?`<pre><code>${esc(s.code)}</code></pre>`:''}`;
 $('#seek').value=slideIndex;$('#slide-prev').disabled=slideIndex===0;$('#slide-next').disabled=slideIndex===l.slides.length-1;
}
function stopPlayer(paused=false){
 playToken++;playing=false;clearTimeout(timer);if(window.speechSynthesis)window.speechSynthesis.cancel();
 if($('#play'))$('#play').textContent='▶ Play';if($('#play-state'))$('#play-state').textContent=paused?'Paused · play repeats this scene':'Ready';
}
function moveSlide(delta){const was=playing;stopPlayer();slideIndex=Math.min(lesson().slides.length-1,Math.max(0,slideIndex+delta));renderSlide();if(was)startPlayer();}
function nextAuto(token){if(token!==playToken||!playing)return;if(slideIndex<lesson().slides.length-1){slideIndex++;renderSlide();runSlide(token);}else{stopPlayer();$('#play-state').textContent='Walkthrough finished';toast('Walkthrough finished. Try the practice task.');}}
function startPlayer(){playing=true;const token=++playToken;$('#play').textContent='Ⅱ Pause';$('#play-state').textContent='Playing';runSlide(token);}
function runSlide(token){
 const text=lesson().slides[slideIndex].text.replace(/`/g,'');
 const useAudio=prefs.audio&&window.speechSynthesis;
 if(!useAudio){$('#play-state').textContent='Playing captions';const ms=Math.max(5000,text.split(/\s+/).length*450/prefs.speed);timer=setTimeout(()=>nextAuto(token),ms);return;}
 const voices=window.speechSynthesis.getVoices();const voice=voices.find(v=>v.voiceURI===prefs.voice)||voices.find(v=>/^en[-_]IN$/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang));
 const chunks=text.match(/.{1,170}(?:\s|$)|\S{1,170}/g)||[text];let ci=0;
 function speak(){
  if(token!==playToken||!playing)return;
  if(ci>=chunks.length){timer=setTimeout(()=>nextAuto(token),800);return;}
  const u=new SpeechSynthesisUtterance(chunks[ci++]);u.lang=voice?.lang||'en-IN';if(voice)u.voice=voice;u.rate=prefs.speed;
  u.onend=()=>{if(token===playToken&&playing)speak();};
  u.onerror=e=>{if(token!==playToken||!playing||e.error==='canceled'||e.error==='interrupted')return;stopPlayer();$('#play-state').textContent='Audio unavailable';$('#audio-note').textContent='The device could not play speech. Turn off Narration to play captioned slides, or use the transcript.';};
  window.speechSynthesis.speak(u);
 }speak();
}
async function init(){
 try{const r=await fetch('./course.json?v=20260930-depth1');if(!r.ok)throw Error('Course request failed');course=await r.json();
  const hash=location.hash.match(/^#\/lesson\/([^?]+)(?:\?topic=(.*))?/);
  const requested=hash?hash[1]:prefs.last;const wanted=course.legacy?.[requested]||requested;const found=course.lessons.findIndex(l=>l.id===wanted);current=found<0?0:found;
  try{const old=JSON.parse(localStorage.getItem('javaZeroDone')||'[]');if(Array.isArray(old))for(const l of course.lessons)if(old.includes(l.module+'::'+l.topic)&&!prefs.done.includes(l.id))prefs.done.push(l.id);}catch{}
  if(!prefs.depthMigration){for(const [oldId,newId] of Object.entries(course.legacy||{})){if(prefs.done.includes(oldId)&&!prefs.done.includes(newId))prefs.done.push(newId);if(prefs.sections[oldId]&&!prefs.sections[newId])prefs.sections[newId]=prefs.sections[oldId];if(prefs.notes[oldId]&&!prefs.notes[newId])prefs.notes[newId]=prefs.notes[oldId];}prefs.depthMigration=true;save();}
  renderLesson();renderModules();updateProgress();
  $('#resume').onclick=()=>selectLesson(current);
  $('#search').oninput=renderModules;
  $('#expand').onclick=()=>{const ds=$$('.module');const shouldOpen=ds.some(d=>!d.open);ds.forEach(d=>d.open=shouldOpen);$('#expand').textContent=shouldOpen?'Collapse all':'Expand all';};
  $('#syllabus-return').onclick=goHome;
  $$('header a').forEach(a=>a.onclick=e=>{e.preventDefault();if(a.getAttribute('href')==='#lesson')selectLesson(current);else goHome();});
  $$('.lesson-outline nav a').forEach(a=>a.onclick=e=>{e.preventDefault();$(a.getAttribute('href')).scrollIntoView({behavior:'smooth'});});
  $('.skip').onclick=e=>{e.preventDefault();selectLesson(current);};
  if(window.speechSynthesis)window.speechSynthesis.onvoiceschanged=populateVoices;
  if(hash){selectLesson(current,true,hash[2]?decodeURIComponent(hash[2]):'');}
  window.addEventListener('hashchange',()=>{const h=location.hash.match(/^#\/lesson\/([^?]+)(?:\?topic=(.*))?/);if(h){const id=course.legacy?.[h[1]]||h[1];const n=course.lessons.findIndex(l=>l.id===id);if(n>=0)selectLesson(n,true,h[2]?decodeURIComponent(h[2]):'');}else if(['','#','#syllabus'].includes(location.hash)){stopPlayer();document.body.classList.remove('lesson-route');document.title='Java with Harsh – Java, Spring Boot & QA Automation Course';}});
  window.addEventListener('pagehide',()=>stopPlayer());
 }catch(e){$('#modules').innerHTML='<div class="empty">The course could not load. Refresh the page to try again.</div>';$('#lesson-content').textContent='Please refresh to load your lessons.';console.error(e);}
}
init();
