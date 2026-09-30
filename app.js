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
 <section class="lesson-block" id="reading"><div class="block-title"><span class="step">01</span><h3>Read & understand</h3><span class="type">HINGLISH · CONCEPT FIRST</span></div>${l.concept.map(p=>`<p>${rich(p)}</p>`).join('')}${diagramBox(l)}${l.extra?`<h4>Uses ko alag-alag samjho</h4><div class="usage-list">${l.extra.map(n=>`<div><h5><code>${esc(n[0])}</code></h5><p>${rich(n[1])}</p></div>`).join('')}</div>`:''}<div class="mistake-box"><h4>Common mistake · kyun hoti hai?</h4><p>${rich(l.pitfall)}</p></div><details class="chapter-context"><summary>Connect this topic to the chapter</summary>${l.chapterConcept.map(p=>`<p>${rich(p)}</p>`).join('')}</details><div class="lesson-references"><strong>Further reading</strong><a href="${esc(l.reference)}" target="_blank" rel="noopener">Official chapter reference</a><a href="${l.topic==='this Keyword'?'https://www.geeksforgeeks.org/java/java-this-keyword/':'https://www.geeksforgeeks.org/java/java/'}" target="_blank" rel="noopener">GeeksforGeeks ${l.topic==='this Keyword'?'this keyword':'Java topic index'}</a></div>
 ${(l.notes||[]).length?`<div class="topic-notes">${l.notes.map((n,i)=>`<div class="concept-note" id="concept-${i}"><h4>${esc(n[0])}</h4><p>${rich(n[1])}</p></div>`).join('')}</div>`:''}${markCheck('reading')}</section>
 <section class="lesson-block" id="java"><div class="block-title"><span class="step">02</span><h3>${esc(l.topic)} · focused example</h3><span class="type">TRACE THE LOGIC</span></div>${codeBox(l.focusedCode,l.snippetLabel)}<p class="lesson-tip">Focused snippets may need a main method, imports or the stated project dependencies. Commands, configuration and policy outlines are labeled in the example.</p><details class="output"><summary>Predict first · reveal output or behavior</summary><pre>${esc(l.focusedOutput)}</pre></details><h4>Code ka step-by-step meaning</h4><p>${rich(l.focusedWalk)}</p><details class="chapter-workshop"><summary>Complete chapter workshop · ${esc(l.relatedWorkshop)}</summary><p>${rich(l.normal)}</p>${codeBox(l.code,'COMPLETE CHAPTER EXAMPLE')}<div class="run"><strong>Run the workshop · </strong>${esc(l.run)}</div><pre class="workshop-output">${esc(l.output)}</pre><ol class="walk">${l.walk.map(w=>`<li>${rich(w)}</li>`).join('')}</ol></details>${markCheck('java')}</section>
 <section class="lesson-block" id="qa"><div class="block-title"><span class="step">03</span><h3>Apply it in QA</h3><span class="type">CHAPTER APPLICATION</span></div><div class="qa-callout"><p>${rich(l.qa)}</p></div>${codeBox(l.qacode,'QA / SDET EXAMPLE')}${l.qaOutput?`<h4>Expected output</h4><pre class="workshop-output">${esc(l.qaOutput)}</pre><p>${esc(l.qaRun)}</p>`:''}<h4>${esc(l.topic)} · QA checkpoint</h4><p>${rich(l.pitfall)} Is failure ko test mein reproduce karo; corrected behavior ke liye meaningful assertion likho.</p><p class="lesson-tip">Examples run in your local JDK or the stated project. This page does not compile Java. Shared chapter examples connect the focused topic to a complete application.</p>${l.where?.length?`<ul class="walk">${l.where.map(w=>`<li>${rich(w)}</li>`).join('')}</ul>`:''}${markCheck('qa')}</section>
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
