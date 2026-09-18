/* 관종 비교 · 선정 도우미.
   점수 규칙은 사내 비교자료의 문장을 근거로만 만들었고, 각 근거는 원문 위치를 그대로 인용한다. */
(() => {
 'use strict';
 const data=PIPE_MATERIALS, $=id=>document.getElementById('mc-'+id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const byId=Object.fromEntries(data.materials.map(m=>[m.id,m]));
 const num=v=>Number(String(v).replace(/[^\d.]/g,''));

 const CONDITIONS=[
  {key:'use',label:'용도',options:[['supply','상수도'],['sewer','하수도']]},
  {key:'flow',label:'송수 방식',options:[['gravity','자연유하'],['pump','펌프 가압송수'],['head','고낙차']]},
  {key:'ground',label:'지반 조건',options:[['normal','일반'],['soft','연약지반 · 부등침하'],['water','용수지반 (지하수 많음)']]},
  {key:'env',label:'부식 환경',options:[['normal','일반'],['coastal','해안 · 염해']]},
  {key:'site',label:'시공 여건',options:[['normal','일반'],['curved','굴곡 · 하천횡단 많음']]},
 ];
 const state={use:'supply',dn:300,flow:'gravity',ground:'normal',env:'normal',site:'normal'};

 /* cite: 자료 안의 실제 문장 위치. 점수는 그 문장이 유리/불리하게 읽히는 정도만 표현한다. */
 const RULES=[
  {on:['flow','pump','head'],id:'hdpe',score:3,cite:['cells','pumping',0]},
  {on:['flow','pump','head'],id:'cts',score:1,cite:['cells','pumping',0]},
  {on:['flow','pump','head'],id:'pep',score:1,cite:['cells','pumping',0]},
  {on:['flow','pump','head'],id:'grp',score:-4,cite:['cells','pumping',0]},
  {on:['flow','pump','head'],id:'pvc',score:-2,cite:['cells','pumping',0]},
  {on:['flow','pump','head'],id:'dcip',score:-2,cite:['cells','pumping',0]},

  {on:['ground','soft'],id:'hdpe',score:3,cite:['pros',3]},
  {on:['ground','soft'],id:'cts',score:2,cite:['pros',1]},
  {on:['ground','soft'],id:'pep',score:2,cite:['pros',2]},
  {on:['ground','soft'],id:'dcip',score:-3,cite:['cons',6]},

  {on:['ground','water'],id:'hdpe',score:-3,cite:['cons',1]},
  {on:['ground','water'],id:'cts',score:-3,cite:['cons',4]},
  {on:['ground','water'],id:'pep',score:-3,cite:['cons',4]},
  {on:['ground','water'],id:'grp',score:-2,cite:['cons',0]},

  {on:['env','coastal'],id:'hdpe',score:2,cite:['pros',4]},
  {on:['env','coastal'],id:'grp',score:2,cite:['pros',3]},
  {on:['env','coastal'],id:'pvc',score:2,cite:['pros',3]},
  {on:['env','coastal'],id:'pep',score:2,cite:['cells','corrosion',0]},
  {on:['env','coastal'],id:'pep',score:-1,cite:['cells','corrosion',1]},
  {on:['env','coastal'],id:'cts',score:-3,cite:['cells','corrosion',1]},
  {on:['env','coastal'],id:'dcip',score:-2,cite:['cells','corrosion',1]},

  {on:['site','curved'],id:'hdpe',score:3,cite:['pros',1]},
  {on:['site','curved'],id:'hdpe',score:1,cite:['pros',2]},
  {on:['site','curved'],id:'cts',score:-1,cite:['cons',3]},
  {on:['site','curved'],id:'grp',score:-1,cite:['cons',4]},
  {on:['site','curved'],id:'pvc',score:-1,cite:['cons',3]},
  {on:['site','curved'],id:'dcip',score:-2,cite:['cons',1]},
 ];
 const DN_RULES=[
  {min:1000,id:'cts',score:2,cite:['pros',4]},
  {min:1000,id:'pep',score:2,cite:['pros',4]},
  {min:1000,id:'dcip',score:1,cite:['pros',4]},
  {min:400,id:'hdpe',score:-2,cite:['cons',3]},
 ];

 function citeText(m,path){return path.reduce((o,k)=>o?.[k],m);}
 function evaluate(){
  const dn=Number(state.dn)||0;
  return data.materials.map(m=>{
   const reasons=[];let score=0,blocked=null;
   const inRange=dn>=m.sizeRange.min&&dn<=m.sizeRange.max;
   if(dn&&!inRange){
    blocked=dn>m.sizeRange.max?'over':'under';
    reasons.push({kind:'block',text:`생산 규격 D${m.sizeRange.min} ~ ${m.sizeRange.max} 범위 밖 (DN ${dn})`,src:'khe',
      extra:blocked==='over'?'국내 표준 생산 범위를 넘어서므로 해외발주 · 특별주문 여부와 납기를 확인해야 합니다.':'표준 생산 하한보다 작은 관경입니다.'});
   }
   for(const r of RULES){
    if(r.id!==m.id)continue;
    if(!r.on.slice(1).includes(state[r.on[0]]))continue;
    const text=citeText(m,r.cite);if(!text)continue;
    score+=r.score;reasons.push({kind:r.score>0?'pro':'con',text,src:'khe'});
   }
   for(const r of DN_RULES){
    if(r.id!==m.id||!dn||dn<r.min)continue;
    const text=citeText(m,r.cite);if(!text)continue;
    score+=r.score;reasons.push({kind:r.score>0?'pro':'con',text,src:'khe'});
   }
   if(m.useScope!=='both'&&m.useScope!==state.use){
    blocked='scope';
    reasons.unshift({kind:'block',text:(state.use==='supply'?'상수도 관로용 관종이 아닙니다':'하수도 관거용 관종이 아닙니다'),src:'ref',
      extra:state.use==='supply'?m.use.supply:m.use.sewer});
   }else if(m.useScope==='both'){
    reasons.push({kind:'note',text:(state.use==='supply'?m.use.supply:m.use.sewer),src:'ref'});
   }
   return {m,score,reasons,blocked};
  }).sort((a,b)=>(a.blocked?1:0)-(b.blocked?1:0)||b.score-a.score||a.m.name.localeCompare(b.m.name,'ko'));
 }
 function verdict(r){
  if(r.blocked==='scope')return{cls:'out',label:'용도 다름'};
  if(r.blocked)return{cls:'out',label:'생산 범위 밖'};
  if(r.score>=5)return{cls:'best',label:'적합'};
  if(r.score>=1)return{cls:'good',label:'검토 가능'};
  if(r.score>=-1)return{cls:'mid',label:'조건부'};
  return{cls:'bad',label:'주의 필요'};
 }

 function renderConditions(){
  $('conditions').innerHTML=
   '<div class="mc-cond"><label class="mc-cond-label" for="mc-dn">호칭경 (mm)</label><div class="mc-opts"><input id="mc-dn" type="number" min="10" max="3000" step="10" value="'+state.dn+'" inputmode="numeric"></div></div>'+
   CONDITIONS.map(c=>'<div class="mc-cond" role="group" aria-label="'+esc(c.label)+'"><span class="mc-cond-label">'+esc(c.label)+'</span><div class="mc-opts">'+
    c.options.map(([v,t])=>'<button type="button" class="mc-opt'+(state[c.key]===v?' active':'')+'" data-cond="'+c.key+'" data-value="'+v+'" aria-pressed="'+(state[c.key]===v)+'">'+esc(t)+'</button>').join('')+
   '</div></div>').join('');
  $('conditions').querySelectorAll('[data-cond]').forEach(b=>b.onclick=()=>{state[b.dataset.cond]=b.dataset.value;renderConditions();renderResults();});
  document.getElementById('mc-dn').oninput=e=>{state.dn=e.target.value;renderResults();};
 }

 function renderResults(){
  const list=evaluate(),dn=Number(state.dn)||0;
  const usable=list.filter(r=>!r.blocked);
  $('result-meta').textContent=`${usable.length}개 관종 검토 가능 / 전체 ${list.length}개`;
  $('result-hint').innerHTML=state.use==='sewer'
   ? '하수도 관종(흄관 · PE 이중벽관 · 하수도용 PVC관 · 파형강관)은 사내 비교자료에 없어 KS 표준 등 공개 자료로 정리한 것이라 <b>공개 표준 조사</b> 뱃지가 붙습니다. 사내 자료 6종만큼 상세하지 않으니 제조사 자료로 보완하세요.'
   : '근거 문장은 사내 비교자료의 표현을 그대로 옮긴 것입니다. 점수는 조건에 따른 상대적 유불리를 보여주기 위한 것이며, 설계 기준을 대신하지 않습니다.';
  $('results').innerHTML=list.map((r,i)=>{
   const v=verdict(r),m=r.m;
   return '<li class="mc-result mc-'+v.cls+'">'+
    '<div class="mc-result-head"><span class="mc-rank">'+(r.blocked?'—':i+1)+'</span>'+
     '<div class="mc-result-title"><b>'+esc(m.name)+'</b>'+(m.alias?'<small>'+esc(m.alias)+'</small>':'')+
      '<span class="mc-std">'+esc(m.standard)+'</span>'+(m.source==='ref'?'<span class="mc-src mc-src-ref">공개 표준 조사</span>':'')+'</div>'+
     '<span class="mc-verdict">'+v.label+'</span></div>'+
    '<div class="mc-range">D'+m.sizeRange.min+' ~ '+m.sizeRange.max+' mm'+(dn&&!r.blocked?' · DN '+dn+' 생산 범위 내':'')+'</div>'+
    '<ul class="mc-reasons">'+r.reasons.map(x=>'<li class="mc-'+x.kind+'"><span class="mc-mark" aria-hidden="true">'+
      (x.kind==='pro'?'+':x.kind==='con'?'−':x.kind==='block'?'×':'·')+'</span><span>'+esc(x.text)+
      (x.extra?'<em class="mc-extra">'+esc(x.extra)+'</em>':'')+
      '<span class="mc-src mc-src-'+x.src+'">'+(x.src==='khe'?'사내 자료':'참고')+'</span></span></li>').join('')+'</ul>'+
   '</li>';
  }).join('');
  const pick=byId[data.recommendation.materialId];
  $('doc-pick').innerHTML='<b>원문 추천안 · '+esc(pick.name)+'</b> — '+esc(data.recommendation.reason)+' <span class="mc-src mc-src-khe">사내 자료</span>';
 }

 let shown=new Set(data.materials.map(m=>m.id));
 const PRESETS=[['all','전체',()=>data.materials],['supply','상수도',()=>data.materials.filter(m=>m.useScope!=='sewer')],
  ['sewer','하수도',()=>data.materials.filter(m=>m.useScope!=='supply')],['khe','사내 자료',()=>data.materials.filter(m=>m.source==='khe')]];
 function renderChips(){
  $('chips').innerHTML='<div class="mc-presets">'+PRESETS.map(([k,t])=>'<button type="button" class="mc-preset" data-preset="'+k+'">'+esc(t)+'</button>').join('')+'</div>'+
   data.materials.map(m=>'<button type="button" class="mc-chip'+(shown.has(m.id)?' active':'')+'" data-mat="'+m.id+'" aria-pressed="'+shown.has(m.id)+'">'+esc(m.name)+(m.alias?' <small>'+esc(m.alias)+'</small>':'')+'</button>').join('');
  $('chips').querySelectorAll('[data-mat]').forEach(b=>b.onclick=()=>{
   const id=b.dataset.mat;
   if(shown.has(id)){if(shown.size>1)shown.delete(id);}else shown.add(id);
   renderChips();renderTable();
  });
  $('chips').querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{
   const list=PRESETS.find(x=>x[0]===b.dataset.preset)[2]();
   shown=new Set(list.map(m=>m.id));renderChips();renderTable();
  });
 }
 function cellHtml(m,row){
  if(row.key==='cost'){
   const labels=m.cells.costLabels||[];
   return '<ul class="mc-cost">'+labels.map(l=>'<li>'+esc(l)+' <span class="mc-blank">미기재</span></li>').join('')+'</ul>';
  }
  const values=m.cells[row.key]||[];
  if(!values.length)return '<span class="mc-blank">미기재</span>';
  return values.length===1?esc(values[0]):'<ul>'+values.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>';
 }
 function renderTable(){
  const mats=data.materials.filter(m=>shown.has(m.id));
  const groups=[...new Set(data.rows.map(r=>r.group))];
  let html='<thead><tr><th scope="col" class="mc-row-head">구분</th>'+mats.map(m=>'<th scope="col"'+(m.recommended?' class="mc-th-pick"':'')+'>'+esc(m.name)+(m.alias?'<small>'+esc(m.alias)+'</small>':'')+'<span class="mc-std">'+esc(m.standard)+'</span>'+(m.recommended?'<span class="mc-pick-badge">원문 추천</span>':'')+(m.source==='ref'?'<span class="mc-src mc-src-ref">공개 표준</span>':'')+'</th>').join('')+'</tr></thead>';
  for(const g of groups){
   const rows=data.rows.filter(r=>r.group===g);
   html+='<tbody><tr class="mc-group-row"><th colspan="'+(mats.length+1)+'" scope="colgroup"><span>'+esc(g)+'</span></th></tr>'+
    rows.map(r=>'<tr><th scope="row" class="mc-row-head">'+esc(r.label)+(r.source==='ref'?'<span class="mc-src mc-src-ref">참고</span>':'')+'</th>'+
     mats.map(m=>'<td'+(r.short?' class="mc-short"':'')+'>'+cellHtml(m,r)+'</td>').join('')+'</tr>').join('')+'</tbody>';
  }
  html+='<tbody><tr class="mc-group-row"><th colspan="'+(mats.length+1)+'" scope="colgroup"><span>장점 / 단점</span></th></tr>'+
   '<tr><th scope="row" class="mc-row-head">장점</th>'+mats.map(m=>'<td><ul class="mc-pro">'+m.pros.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></td>').join('')+'</tr>'+
   '<tr><th scope="row" class="mc-row-head">단점</th>'+mats.map(m=>'<td><ul class="mc-con">'+m.cons.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></td>').join('')+'</tr></tbody>';
  $('table').innerHTML=html;
 }

 /* 표 위에서 휠을 굴리면 가로로 스크롤한다. 양 끝에 닿으면 페이지 스크롤로 넘겨
    사용자가 표 안에 갇히지 않게 한다. */
 function wheelToHorizontal(el){
  el.addEventListener('wheel',e=>{
   if(e.deltaX||e.shiftKey||e.ctrlKey)return;
   const max=el.scrollWidth-el.clientWidth;
   if(max<=1)return;
   const next=el.scrollLeft+e.deltaY;
   if(next<0||next>max)return;
   el.scrollLeft=next;e.preventDefault();
  },{passive:false});
 }
 $('reset').onclick=()=>{Object.assign(state,{use:'supply',dn:300,flow:'gravity',ground:'normal',env:'normal',site:'normal'});renderConditions();renderResults();};
 $('notes').innerHTML=data.notes.map(n=>'<li>'+esc(n)+'</li>').join('')+
  '<li>'+esc(data.sources.khe.note)+'</li><li>'+esc(data.sources.ref.note)+'</li>';
 renderConditions();renderResults();renderChips();renderTable();
 document.querySelectorAll('#mc-app .mc-table-scroll').forEach(wheelToHorizontal);
})();
