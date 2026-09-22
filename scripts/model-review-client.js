(() => {
 'use strict';
 const KEY='kwater-model-review-v1', statuses=['미결정','BIM 수행','기존 설계방식','병행'];
 const $=id=>document.getElementById('mr-'+id);
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 // Sandboxed hosting contexts (e.g. Claude Artifact) silently no-op window.confirm/alert, so
 // this in-page replacement never depends on those blocked native dialogs.
 function modal(message,{cancel}={}){
  return new Promise(resolve=>{
   const active=document.activeElement;
   const backdrop=document.createElement('div');backdrop.className='mr-modal-backdrop';
   const box=document.createElement('div');box.className='mr-modal';box.setAttribute('role','alertdialog');box.setAttribute('aria-modal','true');
   const text=document.createElement('p');text.className='mr-modal-message';text.textContent=message;
   const actions=document.createElement('div');actions.className='mr-modal-actions';
   const ok=document.createElement('button');ok.type='button';ok.className='mr-primary';ok.textContent='확인';
   let cancelBtn=null;
   if(cancel){cancelBtn=document.createElement('button');cancelBtn.type='button';cancelBtn.textContent='취소';actions.append(cancelBtn);}
   actions.append(ok);box.append(text,actions);backdrop.append(box);document.body.append(backdrop);
   function close(result){backdrop.remove();document.removeEventListener('keydown',onKey,true);if(active&&active.focus)active.focus();resolve(result);}
   function onKey(e){if(e.key==='Escape'){e.preventDefault();close(false);return;}if(e.key!=='Tab')return;e.preventDefault();const items=cancelBtn?[cancelBtn,ok]:[ok];const i=items.indexOf(document.activeElement);items[(i+(e.shiftKey?-1:1)+items.length)%items.length].focus();}
   document.addEventListener('keydown',onKey,true);
   ok.addEventListener('click',()=>close(true));
   cancelBtn?.addEventListener('click',()=>close(false));
   backdrop.addEventListener('mousedown',e=>{if(e.target===backdrop)close(false);});
   ok.focus();
  });
 }
 const effortFields=['trDifficulty','trDirect','trPeople','trDays','trRemarks','bimDifficulty','bimDirect','bimPeople','bimDays','bimRemarks','startDate','endDate'];
 const effortDefaults=()=>Object.fromEntries(effortFields.map(k=>[k,'']));
 const isNumericField=f=>/^(tr|bim)(People|Days)$/.test(f);
 function effort(r,p){return r[p+'People']===''||r[p+'Days']===''?null:Number(r[p+'People'])*Number(r[p+'Days']);}
 const numberText=v=>v===null?'—':v.toLocaleString('ko-KR',{maximumFractionDigits:2,minimumFractionDigits:1});
 function effortEditor(r,p,title){
  const select=(suffix,label,values)=>'<div class="mr-cell-label">'+label+'<div class="mr-check-options" role="group" aria-label="'+title+' '+label+'">'+values.map(v=>'<label><input type="checkbox" data-field="'+p+suffix+'" value="'+escape(v)+'"'+(r[p+suffix]===v?' checked':'')+'><span>'+escape(v==='○'?'예':v==='X'?'아니요':v)+'</span></label>').join('')+'</div></div>';
  const num=(suffix,label)=>'<label class="mr-cell-label">'+label+'<input type="number" min="0" max="1000000" step="any" data-field="'+p+suffix+'" aria-label="'+title+' '+label+'" value="'+escape(r[p+suffix])+'" placeholder="미입력"></label>';
  return '<fieldset class="mr-effort"><legend>'+title+' 소요인력</legend><div class="mr-effort-grid">'+select('Difficulty','업무 난이도',['상','중','하'])+select('Direct','직접 수행 여부',['○','X','부분'])+num('People','투입인원 (인)')+num('Days','소요공기 (일)')+'<label class="mr-cell-label">공량 (인·일)<output data-effort="'+p+'">'+numberText(effort(r,p))+'</output></label></div></fieldset>';
 }

 const fields=['id','category','name','spec','traditional','bim','status','note','owner','source'];
 let state={version:2,title:'',date:'',items:[]},filter='',graphView=false;
 function validate(data){
  if(!data||![1,2].includes(data.version)||typeof data.title!=='string'||typeof data.date!=='string'||data.title.length>2000||data.date.length>100||!Array.isArray(data.items)||data.items.length>10000)throw Error('지원하지 않는 프로젝트 파일입니다.');
  const ids=new Set();const items=data.items.map(r=>{
   if(!r||fields.filter(f=>data.version===2||!['traditional','bim'].includes(f)).some(f=>typeof r[f]!=='string'||r[f].length>20000)||!r.id||ids.has(r.id)||!r.name.trim())throw Error('업무 항목 형식을 확인해주세요.');
   ids.add(r.id);
   if(data.version===1){if(!['미검토','가능','불가능','보류'].includes(r.status))throw Error('이전 판단 값을 확인해주세요.');r={...r,traditional:'',bim:'',status:'미결정',note:('[이전 모델링 판단: '+r.status+']\n'+r.note).slice(0,20000)};}
   if(!statuses.includes(r.status))throw Error('수행방식 값을 확인해주세요.');
   const extra=effortDefaults();for(const f of effortFields){const v=r[f]??'';if(typeof v!=='string'||v.length>20000||(isNumericField(f)&&v!==''&&(!Number.isFinite(Number(v))||Number(v)<0||Number(v)>1000000)))throw Error('소요인력 입력값을 확인해주세요.');if(f.endsWith('Difficulty')&&!['','상','중','하'].includes(v))throw Error('난이도를 확인해주세요.');if(f.endsWith('Direct')&&!['','○','X','부분'].includes(v))throw Error('직접 수행 여부를 확인해주세요.');if(['startDate','endDate'].includes(f)&&v!==''&&(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v))throw Error('일정 날짜를 확인해주세요.');extra[f]=v;}return {...Object.fromEntries(fields.map(f=>[f,r[f]])),...extra};
  });return {version:2,title:data.title,date:data.date,items};
 }
 // 업무는 현재 문서에서만 유지하고, 새로 열 때는 빈 프로젝트로 시작합니다.
 try{localStorage.removeItem(KEY);}catch(e){}
 let revision=0,printCacheKey="";
 function save(){revision++;$('save').textContent='작성 중 · 보관하려면 프로젝트 파일로 저장해주세요.';}
 function counts(){ $('counts').innerHTML=['전체',...statuses].map(s=>'<button type="button" class="chip'+((filter||'전체')===s?' active':'')+'" data-filter="'+(s==='전체'?'':s)+'" aria-pressed="'+((filter||'전체')===s)+'">'+s+'<strong>'+(s==='전체'?state.items.length:state.items.filter(r=>r.status===s).length)+'</strong></button>').join('');}
 function stages(){const selected=$('stage-filter').value;const values=[...new Set(state.items.map(r=>r.category).filter(Boolean))];$('stage-filter').innerHTML='<option value="">전체 단계</option>'+values.map(v=>'<option>'+escape(v)+'</option>').join('');$('stage-filter').value=values.includes(selected)?selected:'';$('stages').innerHTML=values.map(v=>'<option value="'+escape(v)+'"></option>').join('');}
 function visible(){const stage=$('stage-filter').value;return state.items.filter(r=>(!filter||r.status===filter)&&(!stage||r.category===stage));}
 const input=(r,f,label)=>'<input data-field="'+f+'" aria-label="'+label+'" maxlength="20000" value="'+escape(r[f])+'">';
 const area=(r,f,label)=>'<label class="mr-cell-label">'+label+'<textarea data-field="'+f+'" aria-label="'+label+'" maxlength="20000">'+escape(r[f])+'</textarea></label>';
 const standardStages=['기초자료 조사','현장 조사','기본설계','실시설계','각종 행정절차 이행','준공'];
 function choiceShell(control,label){
  if(control.parentElement.tagName==='LABEL'){
   const old=control.parentElement,field=document.createElement('div');field.className=old.className+' mr-field';
   const caption=document.createElement('span');caption.className='mr-label';caption.textContent=label;
   old.replaceWith(field);field.append(caption,control);
  }
  let wrap=control.closest('.mr-choice');
  if(!wrap){wrap=document.createElement('div');wrap.className='mr-choice';control.before(wrap);wrap.append(control);}
  wrap.querySelector('.mr-choice-panel')?.remove();
  const panel=document.createElement('details');panel.className='mr-choice-panel';
  const summary=document.createElement('summary');summary.setAttribute('aria-label',label);summary.setAttribute('aria-expanded','false');
  const value=document.createElement('span');summary.append(value);
  const arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');arrow.setAttribute('viewBox','0 0 24 24');arrow.setAttribute('aria-hidden','true');arrow.innerHTML='<path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"/>';summary.append(arrow);
  const options=document.createElement('div');options.className='mr-choice-options';options.setAttribute('role','group');options.setAttribute('aria-label',label+' 선택지');
  panel.append(summary,options);wrap.append(panel);
  panel.addEventListener('toggle',()=>summary.setAttribute('aria-expanded',String(panel.open)));
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.open=false;summary.setAttribute('aria-expanded','false');summary.focus();}if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();panel.open=true;const bs=Array.from(options.querySelectorAll('button'));const i=bs.indexOf(document.activeElement);bs[(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length]?.focus();}});
  return {panel,summary,value,options};
 }
 const choiceVersions=new WeakMap();
 function enhanceChoices(){
  document.querySelectorAll('#mr-app select').forEach(select=>{
   const version=select.innerHTML+'|'+select.value;if(choiceVersions.get(select)===version&&select.closest('.mr-choice')?.querySelector('summary'))return;choiceVersions.set(select,version);
   const label=select.getAttribute('aria-label')||select.parentElement.querySelector('.mr-label')?.textContent||select.parentElement.firstChild?.textContent?.trim()||'선택';
   select.setAttribute('aria-label',label);const {panel,summary,value,options}=choiceShell(select,label);select.hidden=true;value.textContent=select.selectedOptions[0]?.textContent||'선택';
   for(const option of select.options){const b=document.createElement('button');b.type='button';b.textContent=option.textContent;b.className='mr-choice-option';b.setAttribute('aria-pressed',String(option.selected));
    b.addEventListener('click',()=>{select.value=option.value;value.textContent=option.textContent;panel.open=false;options.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));const id=select.closest('[data-id]')?.dataset.id;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));if(summary.isConnected)summary.focus();else if(id)Array.from($('rows').children).find(c=>c.dataset.id===id)?.querySelector('.mr-decision summary')?.focus();});options.append(b);
   }
  });
  const choices=[...new Set([...standardStages,...WORKFLOW_TEMPLATES.flatMap(t=>t.items.map(r=>r.category)).filter(Boolean)])];
  document.querySelectorAll('#mr-add [name=category],#mr-rows [data-field=category]').forEach(control=>{
   const ready=control.closest('.mr-choice')?.querySelector('summary');if(ready){ready.querySelector('span').textContent=control.value||'설계단계 선택';return;}
   control.removeAttribute('list');control.setAttribute('aria-label','설계단계 / 분야 직접 입력');
   // Keep the editable field alive when rebuilding the expanding selector.
   const previous=control.closest('.mr-choice');if(previous)previous.prepend(control);
   const {panel,summary,value,options}=choiceShell(control,'설계단계 / 분야');value.textContent=control.value||'설계단계 선택';control.placeholder='직접 입력도 가능합니다';options.prepend(control);
   for(const v of choices){const b=document.createElement('button');b.type='button';b.className='mr-choice-option';b.textContent=v;b.setAttribute('aria-pressed',String(control.value===v));b.addEventListener('click',()=>{control.value=v;value.textContent=v;panel.open=false;control.dispatchEvent(new Event('input',{bubbles:true}));control.dispatchEvent(new Event('change',{bubbles:true}));if(summary.isConnected)summary.focus();});options.append(b);}
   control.oninput=()=>{value.textContent=control.value||'설계단계 선택';options.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===control.value)));};
  });
 }
 function renderGraphs(){ $('graphs').innerHTML=window.workflowGraphHtml(visible(),effort); }
 function setView(graph){graphView=graph;pager.hidden=graph||!visible().length;$('app').classList.toggle('mr-graph-mode',graph);$('rows').hidden=graph;$('graphs').hidden=!graph;for(const k of ['list','graph']){const selected=(k==='graph')===graph;$(k+'-tab').setAttribute('aria-selected',String(selected));$(k+'-tab').tabIndex=selected?0:-1;}if(graph)renderGraphs();}
 $('list-tab').addEventListener('click',()=>setView(false));$('graph-tab').addEventListener('click',()=>setView(true));
 document.querySelector('.mr-view-tabs').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();setView(e.key==='Home'?false:e.key==='End'?true:!graphView);$(graphView?'graph-tab':'list-tab').focus();}});
 function taskCard(r){
  const dateField=(field,label)=>'<label class="mr-cell-label">'+label+'<input type="date" data-field="'+field+'" aria-label="업무 '+label+'" value="'+escape(r[field])+'"></label>';
  const invalid=r.startDate&&r.endDate&&r.endDate<r.startDate;
  const methodColumn=(prefix,field,title)=>{const locked=(prefix==='tr'&&r.status==='BIM 수행')||(prefix==='bim'&&r.status==='기존 설계방식');return '<fieldset class="mr-method-column" aria-label="'+title+'"'+(locked?' disabled':'')+'><h3>'+title+(locked?' <span class="mr-lock-label">편집 잠김</span>':'')+'</h3>'+area(r,field,'업무방식')+effortEditor(r,prefix,title)+'</fieldset>';};
  return '<article class="mr-work-card" data-id="'+escape(r.id)+'">'+
   '<div class="mr-task-titles"><label class="mr-cell-label">설계단계 / 분야'+input(r,'category','설계단계 또는 분야')+'</label><label class="mr-cell-label">세부 업무'+input(r,'name','세부 업무')+'</label></div>'+
   '<div class="mr-task-meta-fields"><div class="mr-decision"><span class="mr-label">수행방식</span><select aria-label="수행방식" data-field="status" data-status="'+r.status+'">'+statuses.map(s=>'<option'+(s===r.status?' selected':'')+'>'+s+'</option>').join('')+'</select></div><label class="mr-cell-label">담당자'+input(r,'owner','담당자')+'</label>'+dateField('startDate','시작일')+dateField('endDate','종료일')+'</div>'+
   '<p class="mr-date-error" data-schedule-note role="status"'+(invalid?'':' hidden')+'>'+(invalid?'종료일이 시작일보다 빠릅니다.':'')+'</p>'+
   '<div class="mr-task-description">'+area(r,'spec','업무내용 / 성과품')+'</div>'+
   '<div class="mr-method-comparison">'+methodColumn('tr','traditional','기존 방식')+methodColumn('bim','bim','BIM 방식')+'</div>'+
   '<div class="mr-review-fields">'+area(r,'note','적용 범위 / 판단 근거')+'</div><div class="mr-card-foot"><button type="button" data-delete>업무 삭제</button></div></article>';
 }
 const cardCache=new Map();
 let reviewRendered=false, reviewPage=0, reviewFilterKey='';
 const reviewPageSize=8;
 const pager=document.createElement('div');pager.className='mr-pagination';pager.setAttribute('aria-label','업무 목록 페이지');
 const prev=document.createElement('button'),next=document.createElement('button'),pageInfo=document.createElement('span');
 prev.type=next.type='button';prev.textContent='이전';next.textContent='다음';pageInfo.setAttribute('aria-live','polite');pager.append(prev,pageInfo,next);$('rows').before(pager);
 prev.onclick=()=>{reviewPage--;render();};next.onclick=()=>{reviewPage++;render();};
 function render(){
  reviewRendered=true;counts();stages();const rows=visible();const filterKey=JSON.stringify([filter,$('stage-filter').value]);if(filterKey!==reviewFilterKey){reviewPage=0;reviewFilterKey=filterKey;}const pages=Math.max(1,Math.ceil(rows.length/reviewPageSize));reviewPage=Math.max(0,Math.min(reviewPage,pages-1));prev.disabled=reviewPage===0;next.disabled=reviewPage>=pages-1;pageInfo.textContent=(reviewPage+1)+' / '+pages+'페이지 · 페이지당 '+reviewPageSize+'개';pager.hidden=graphView||!rows.length;$('visible').textContent=rows.length+' / '+state.items.length+'개 업무 표시';
  const ids=new Set(state.items.map(r=>r.id));for(const id of cardCache.keys())if(!ids.has(id))cardCache.delete(id);
  const fragment=document.createDocumentFragment();for(const r of rows.slice(reviewPage*reviewPageSize,(reviewPage+1)*reviewPageSize)){let cached=cardCache.get(r.id);if(!cached||cached.record!==r){const t=document.createElement('template');t.innerHTML=taskCard(r);cached={record:r,node:t.content.firstElementChild};cardCache.set(r.id,cached);}fragment.append(cached.node);}
  $('rows').replaceChildren(fragment);if(!rows.length)$('rows').innerHTML='<div class="mr-empty">'+(state.items.length?'필터 조건에 맞는 업무가 없습니다.':'설계 업무 목록으로 시작하거나 프로젝트 업무를 직접 추가하세요.')+'</div>';
  enhanceChoices();if(graphView)renderGraphs();
 }
 function add(rows){if(state.items.length+rows.length>10000)throw Error('업무 목록은 최대 10,000개까지 가능합니다.');state.items.push(...rows.map(r=>({...effortDefaults(),id:crypto.randomUUID(),category:'',name:'',spec:'',traditional:'',bim:'',status:'미결정',note:'',owner:'',source:'직접 입력',...r})));filter='';$('stage-filter').value='';save();render();}
 $('title').value=state.title;$('date').value=state.date;$('title').maxLength=2000;
 for(const k of ['title','date'])$(k).addEventListener('input',()=>{state[k]=$(k).value;save();});
 $('counts').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(b){filter=b.dataset.filter;render();}});
 for(const k of ['stage-filter'])$(k).addEventListener('input',render);
 $('add').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.target),name=f.get('name').trim();if(!name)return;try{add([{category:f.get('category').trim(),name,spec:f.get('spec').trim()}]);e.target.reset();enhanceChoices();e.target.elements.name.focus();}catch(err){await modal(err.message);}});
 $('rows').addEventListener('input',e=>{const field=e.target.dataset.field;if(![...fields,...effortFields].includes(field))return;const r=state.items.find(r=>r.id===e.target.closest('[data-id]').dataset.id);if(!r)return;if(field==='name'&&!e.target.value.trim()){e.target.setCustomValidity('업무명을 입력해주세요.');return;}if(isNumericField(field)&&!e.target.validity.valid){e.target.reportValidity();return;}e.target.setCustomValidity('');r[field]=e.target.type==='checkbox'?(e.target.checked?e.target.value:''):e.target.value;if(e.target.type==='checkbox'){e.target.closest('.mr-check-options').querySelectorAll('input').forEach(box=>{box.checked=box.value===r[field];});}if(['startDate','endDate'].includes(field)){const warning=e.target.closest('[data-id]').querySelector('[data-schedule-note]');const invalid=r.startDate&&r.endDate&&r.endDate<r.startDate;warning.hidden=!invalid;warning.textContent=invalid?'종료일이 시작일보다 빠릅니다.':'';}if(isNumericField(field)){const card=e.target.closest('[data-id]');for(const p of ['tr','bim'])card.querySelector('[data-effort='+p+']').textContent=numberText(effort(r,p));}if(field==='status')e.target.dataset.status=r.status;save();if(field==='status')counts();});
 $('rows').addEventListener('change',e=>{if(e.target.dataset.field==='status'){const card=e.target.closest('[data-id]'),r=state.items.find(r=>r.id===card.dataset.id);card.querySelectorAll('.mr-method-column').forEach((column,i)=>{column.disabled=i===0?r.status==='BIM 수행':r.status==='기존 설계방식';const heading=column.querySelector('h3');heading.querySelector('.mr-lock-label')?.remove();if(column.disabled)heading.insertAdjacentHTML('beforeend',' <span class="mr-lock-label">편집 잠김</span>');});if(filter&&r.status!==filter)render();}else if(e.target.dataset.field==='category'){stages();enhanceChoices();}});
 $('rows').addEventListener('focusout',e=>{if(e.target.dataset.field==='name'&&!e.target.value.trim()){const r=state.items.find(r=>r.id===e.target.closest('[data-id]').dataset.id);if(r)e.target.value=r.name;e.target.setCustomValidity('');}});
 $('rows').addEventListener('click',async e=>{if(!e.target.closest('[data-delete]'))return;const id=e.target.closest('[data-id]').dataset.id,r=state.items.find(r=>r.id===id);if(await modal('“'+r.name+'” 업무를 삭제할까요?',{cancel:true})){state.items=state.items.filter(r=>r.id!==id);save();render();}});
 $('template').innerHTML=WORKFLOW_TEMPLATES.map((t,i)=>'<option value="'+i+'">'+escape(t.name)+'</option>').join('');
 $('template-add').addEventListener('click',()=>{const template=WORKFLOW_TEMPLATES[Number($('template').value)];const rows=template.items.filter(r=>!state.items.some(i=>i.source===r.source)).map(r=>({...r,trDifficulty:'',trDirect:'',trPeople:'',trDays:'',trRemarks:'',bimDirect:''}));try{add(rows);$('template-status').textContent=rows.length+'개 업무 추가 · '+(template.items.length-rows.length)+'개 중복 업무 제외';}catch(e){$('template-status').textContent=e.message;}});
 function download(content,type,ext){const u=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=u;a.download=(state.title||'BIM 업무분류').replace(/[\\/:*?"<>|]/g,'_')+'.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 $('export').addEventListener('click',()=>download(JSON.stringify(state,null,2),'application/json','json'));
 function resetProject(){
  const empty={version:2,title:'',date:'',items:[]};
  state=empty;filter='';
  for(const k of ['title','date','stage-filter','file'])$(k).value='';
  $('add').reset();$('template').selectedIndex=0;$('template-status').textContent='';$('print-scope').value='all';$('print').innerHTML='';
  document.body.classList.remove('mr-printing');render();
  revision++;printCacheKey='';setView(false);$('graphs').replaceChildren();
  $('save').textContent='';
 }
 window.addEventListener('pageshow',e=>{if(e.persisted)resetProject();});
 $('reset').addEventListener('click',async ()=>{
  if(!await modal('현재 프로젝트명, 검토일, 업무 '+state.items.length+'개와 작성 내용을 모두 초기화할까요? 필요한 내용은 취소 후 프로젝트 파일로 저장해주세요.',{cancel:true}))return;
  resetProject();
  $('save').textContent='현재 프로젝트를 초기화했습니다.';$('title').focus();
 });
 $('import').addEventListener('click',()=>$('file').click());
 $('file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>20000000)throw Error('20MB 이하의 프로젝트 파일을 선택해주세요.');const next=validate(JSON.parse(await file.text()));if(!await modal('현재 업무 '+state.items.length+'개를 파일의 '+next.items.length+'개로 바꿀까요? 현재 자료가 필요하면 취소 후 프로젝트 파일을 먼저 저장하세요.',{cancel:true}))return;state=next;filter='';$('stage-filter').value='';$('title').value=state.title;$('date').value=state.date;save();render();}catch(err){await modal('불러오기 실패: '+err.message);}finally{e.target.value='';}});
 function paragraphs(value){
  const lines=String(value||'—').replace(/\r/g,'').split('\n');const blocks=[];
  for(const raw of lines){const line=raw.trim();if(!line){blocks.push('');continue;}
   if(!blocks.length||!blocks[blocks.length-1]||/^[ㆍ•·\-]|^\d+[.)]/.test(line)||/[.!?。]$/.test(blocks[blocks.length-1]))blocks.push(line);
   else blocks[blocks.length-1]+=' '+line;
  }
  return blocks.filter(Boolean).map(v=>'<p>'+escape(v)+'</p>').join('');
 }
 function printMethod(r,p,label,method){return '<tr class="mr-method-row"><td><b>'+label+' 업무방식</b>'+paragraphs(method)+'</td><td class="mr-center">'+escape(r[p+'Difficulty']||'—')+'</td><td class="mr-center">'+escape(r[p+'Direct']||'—')+'</td><td class="mr-number">'+(r[p+'People']===''?'—':numberText(Number(r[p+'People'])))+'</td><td class="mr-number">'+(r[p+'Days']===''?'—':numberText(Number(r[p+'Days'])))+'</td><td class="mr-number">'+numberText(effort(r,p))+'</td></tr>';}
 function paginatePrint(){
  const source=$('print'),tasks=Array.from(source.querySelectorAll('.mr-task-block'),block=>{const table=block.closest('table');return {block,table,group:table.querySelector('.mr-group-heading').textContent};});
  if(!tasks.length)return;
  const heading=Array.from(source.querySelector('.mr-print-page').children).filter(e=>e.tagName!=='TABLE').map(e=>e.outerHTML).join('');
  const frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;frame.style.cssText='position:fixed;left:-20000px;top:0;width:297mm;height:210mm;border:0;visibility:hidden';document.body.append(frame);
  try{
   const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html><head></head><body class="mr-printing"><section id="mr-print"></section></body></html>');doc.close();
   for(const style of document.querySelectorAll('style')){const copy=doc.createElement('style');copy.textContent=style.textContent.replace(/@media\s+print\b/g,'@media all');doc.head.append(copy);}
   const sizing=doc.createElement('style');sizing.textContent='html,body{margin:0!important;padding:0!important;width:297mm!important}#mr-print{width:297mm!important}.mr-print-page{box-sizing:border-box!important;width:297mm!important}';doc.head.append(sizing);
   const root=doc.getElementById('mr-print');let page,count=0,currentGroup='',table;
   const newPage=()=>{page=doc.createElement('section');page.className='mr-print-page';page.innerHTML=root.children.length?'<p class="mr-print-meta">'+escape(state.title||'프로젝트')+' · BIM 업무분류표</p>':heading;root.append(page);count=0;currentGroup='';table=null;};
   const appendTask=task=>{if(!table||currentGroup!==task.group){table=task.table.cloneNode(false);table.append(task.table.querySelector('colgroup').cloneNode(true),task.table.querySelector('thead').cloneNode(true));page.append(table);currentGroup=task.group;}const block=task.block.cloneNode(true);table.append(block);return block;};
   newPage();
   for(const task of tasks){if(count===3)newPage();let block=appendTask(task);
    if(page.getBoundingClientRect().height>208*96/25.4&&count){block.remove();if(!table.querySelector('tbody'))table.remove();newPage();block=appendTask(task);}
    if(page.getBoundingClientRect().height>208*96/25.4)block.classList.add('mr-long-block');
    count++;
   }
   source.innerHTML=root.innerHTML;
  }finally{frame.remove();}
 }
 const originalTitle=document.title;
 function preparePrint(){
  document.title='';document.body.classList.add('mr-printing');const key=JSON.stringify([revision,graphView,$('print-scope').value,filter,$('stage-filter').value]);if(printCacheKey===key&&$('print').childElementCount)return;printCacheKey=key;$('print').classList.toggle('mr-print-graphs',graphView);
  if(graphView){document.body.classList.add('mr-printing');const data=$('print-scope').value==='filtered'?visible():state.items;$('print').innerHTML='<h1>'+escape(state.title||'프로젝트')+' 공량 및 일정</h1><p class="mr-print-meta">출력 범위: '+($('print-scope').value==='filtered'?'현재 필터 결과':'전체 업무')+'</p>'+window.workflowGraphHtml(data,effort).replace('현재 설계단계·수행방식 필터에 해당하는','출력 범위에 해당하는');return;}
  document.body.classList.add('mr-printing');const filtered=$('print-scope').value==='filtered',rows=filtered?visible():state.items;
  const groups=new Map();for(const r of rows){const k=r.category.trim()||'공종 미지정';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}
  let n=0;
  const groupedRows=Array.from(groups,([group,items])=>items.map(r=>({group,r}))).flat();
  const pages=[];for(let i=0;i<groupedRows.length;i+=3)pages.push(groupedRows.slice(i,i+3));
  const pageTables=pages.map(page=>{const pageGroups=new Map();for(const {group,r} of page){if(!pageGroups.has(group))pageGroups.set(group,[]);pageGroups.get(group).push(r);}return Array.from(pageGroups,([group,items])=>'<table class="mr-group-table"><colgroup><col style="width:52%"><col style="width:9%"><col style="width:9%"><col style="width:10%"><col style="width:10%"><col style="width:10%"></colgroup><thead><tr class="mr-group-heading"><th colspan="6">'+escape(group)+'</th></tr><tr><th rowspan="2">업무방식</th><th rowspan="2">업무<br>난이도</th><th rowspan="2">직접<br>수행 여부</th><th colspan="3" class="mr-center">소요인력</th></tr><tr><th>투입인원<br>(인)</th><th>소요공기<br>(일)</th><th>공량<br>(인·일)</th></tr></thead>'+items.map(r=>{
   const long=[r.spec,r.traditional,r.bim,r.note].some(v=>v.length>1100);
   return '<tbody class="mr-task-block'+(long?' mr-long-block':'')+'"><tr class="mr-task-title"><td colspan="6"><h2>'+(++n)+'. '+escape(r.name)+'</h2><div class="mr-task-meta">수행방식: '+escape(r.status)+'　 담당자: '+escape(r.owner||'미지정')+'</div>'+paragraphs(r.spec)+'</td></tr>'+printMethod(r,'tr','기존',r.traditional)+printMethod(r,'bim','BIM',r.bim)+(r.note?'<tr class="mr-reason"><td colspan="6"><b>적용 범위 / 판단 근거</b>'+paragraphs(r.note)+'</td></tr>':'')+'</tbody>';
  }).join('')+'</table>').join('');});
  const heading='<h1>프로젝트 BIM 업무분류표</h1><p class="mr-print-meta">프로젝트: '+escape(state.title||'미입력')+'　 검토일: '+escape(state.date||'미입력')+'</p><p class="mr-print-meta">출력 범위: '+(filtered?'현재 필터 결과 · '+escape(filter||'전체 수행방식')+' / '+escape($('stage-filter').value||'전체 단계'):'전체 업무')+'　 '+rows.length+'개 업무</p><p class="mr-print-meta">'+statuses.map(s=>s+' '+rows.filter(r=>r.status===s).length+'개').join('　')+'</p>';
  $('print').innerHTML=pageTables.length?pageTables.map((table,i)=>'<section class="mr-print-page">'+(i===0?heading:'<p class="mr-print-meta">'+escape(state.title||'프로젝트')+' · BIM 업무분류표</p>')+table+'</section>').join(''):'<section class="mr-print-page">'+heading+'<p>출력할 업무가 없습니다.</p></section>';
  paginatePrint();
 }

 $('pdf').addEventListener('click',()=>{preparePrint();window.print();});
 window.addEventListener('beforeprint',()=>{if(document.querySelector('.tab-panel[data-tab="modelreview"]').style.display!=='none')preparePrint();});
 window.addEventListener('afterprint',()=>{document.body.classList.remove('mr-printing');document.title=originalTitle;});
 document.addEventListener('tool-tab-change',e=>{if(e.detail==='modelreview'&&!reviewRendered)render();});
 if(document.querySelector('.tab-panel[data-tab="modelreview"]').style.display!=='none')render();
})();