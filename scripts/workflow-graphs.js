// Common zero-based scale for comparisons (Cleveland & McGill); no assumed dates.
window.workflowGraphHtml = (rows, effort) => {
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=v=>v.toLocaleString('ko-KR',{maximumFractionDigits:2});
 const paired=rows.filter(r=>effort(r,'tr')!==null&&effort(r,'bim')!==null);
 const groups=new Map();for(const r of rows){const key=r.category.trim()||'공종 미지정';if(!groups.has(key))groups.set(key,{tr:0,bim:0,n:0,total:0});const g=groups.get(key);g.total++;if(effort(r,'tr')!==null&&effort(r,'bim')!==null){g.tr+=effort(r,'tr');g.bim+=effort(r,'bim');g.n++;}}
 const tr=paired.reduce((s,r)=>s+effort(r,'tr'),0),bim=paired.reduce((s,r)=>s+effort(r,'bim'),0);
 const max=Math.max(1,...Array.from(groups.values()).flatMap(g=>[g.tr,g.bim]));
 const raw=max/4,pow=10**Math.floor(Math.log10(raw)),step=[1,2,2.5,5,10].find(v=>v*pow>=raw)*pow,axisMax=step*4;
 const bar=(value,label,kind,n)=>'<div class="mr-bar-line"><span>'+label+'</span><div class="mr-bar-track"><div class="mr-bar '+kind+'" style="width:'+(n?value/axisMax*100:0)+'%"></div></div><strong>'+(n?fmt(value):'미입력')+'</strong></div>';
 const comparison=Array.from(groups,([key,g])=>'<div class="mr-chart-group"><h3>'+esc(key)+' <small>비교 '+g.n+' / '+g.total+'개</small></h3>'+bar(g.tr,'기존','mr-bar-tr',g.n)+bar(g.bim,'BIM','mr-bar-bim',g.n)+'</div>').join('');
 const axis='<div class="mr-chart-axis"><span></span><div>'+Array.from({length:5},(_,i)=>'<span>'+fmt(i*step)+'</span>').join('')+'</div><span>인·일</span></div>';
 const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const scheduled=rows.filter(r=>validDate(r.startDate)&&validDate(r.endDate)&&r.endDate>=r.startDate);
 const day=v=>Date.parse(v+'T00:00:00Z')/86400000;
 let timeline='<p class="mr-empty">업무 목록에서 시작일과 종료일을 입력하면 일정이 표시됩니다.</p>';
 if(scheduled.length){const start=Math.min(...scheduled.map(r=>day(r.startDate))),end=Math.max(...scheduled.map(r=>day(r.endDate))),span=end-start+1;
  const date=n=>new Date(n*86400000).toISOString().slice(0,10);
  const tickCount=Math.min(6,span),ticks=Array.from({length:tickCount},(_,i)=>Math.round(i*(span-1)/Math.max(1,tickCount-1)));
  const byGroup=new Map();for(const r of scheduled){const k=r.category.trim()||'공종 미지정';if(!byGroup.has(k))byGroup.set(k,[]);byGroup.get(k).push(r);}
  timeline='<p class="mr-hint">'+date(start)+' ~ '+date(end)+' · 날짜 기준 '+span+'일. 막대는 시작일과 종료일을 모두 포함하며, 입력한 소요공기(작업일)와 별개입니다.</p><div class="mr-timeline-scroll"><div class="mr-timeline"><div class="mr-time-head"><span>공종 / 세부 업무</span><div>'+ticks.map((t,i)=>'<span style="left:'+(t/span*100)+'%;transform:translateX('+(i===0?0:i===ticks.length-1?-100:-50)+'%)">'+date(start+t)+'</span>').join('')+'</div><span>시작 / 종료</span></div>'+Array.from(byGroup,([key,items])=>'<h3 class="mr-time-group">'+esc(key)+'</h3>'+items.map(r=>'<div class="mr-time-row"><span>'+esc(r.name)+'</span><div class="mr-time-track"><div class="mr-time-bar" title="'+esc(r.name)+' · '+r.startDate+' ~ '+r.endDate+'" style="left:'+((day(r.startDate)-start)/span*100)+'%;width:'+((day(r.endDate)-day(r.startDate)+1)/span*100)+'%"></div></div><small>'+r.startDate+'<br>'+r.endDate+'</small></div>').join('')).join('')+'</div></div>';
 }
 return '<div class="mr-graph-intro"><h2>공량과 업무 일정</h2><p class="mr-hint">현재 검색·설계단계·수행방식 필터에 해당하는 '+rows.length+'개 업무를 표시합니다.</p></div><div class="mr-graph-summary"><div>기존 방식 공량<strong>'+(paired.length?fmt(tr):'—')+' <small>인·일</small></strong></div><div>BIM 방식 공량<strong>'+(paired.length?fmt(bim):'—')+' <small>인·일</small></strong></div><div>비교 입력 완료<strong>'+paired.length+' / '+rows.length+' <small>개 업무</small></strong></div></div><section class="mr-chart-panel"><h2>공종별 공량 비교</h2><p class="mr-hint">두 방식의 투입인원·소요공기가 모두 입력된 동일 업무만 비교합니다. 미입력 '+(rows.length-paired.length)+'개는 합계에서 제외하며, 0은 입력된 값으로 계산합니다. 두 방식의 공량은 각각의 계획값이며 확정 절감량을 의미하지 않습니다.</p>'+(groups.size?axis+comparison:'<p class="mr-empty">등록된 업무가 없습니다. 업무 목록에서 항목을 추가하세요.</p>')+'</section><section class="mr-chart-panel"><h2>업무 일정표</h2><p class="mr-hint">일정 입력 완료 '+scheduled.length+' / '+rows.length+'개. 날짜가 없거나 종료일이 시작일보다 이른 '+(rows.length-scheduled.length)+'개는 표시하지 않습니다.</p>'+timeline+'</section>';
};
