(() => {
 'use strict';
 const $=id=>document.getElementById('pc-'+id), catalog=PIPE_CATALOG;
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let selected=null, rows=[], catalogRendered=false;
 let page=0, filterKey='';const pageSize=60;
 const pager=document.createElement('div');pager.className='pc-result-head';
 const prev=document.createElement('button'),next=document.createElement('button'),info=document.createElement('span');prev.type=next.type='button';prev.textContent='이전';next.textContent='다음';info.setAttribute('aria-live','polite');pager.append(prev,info,next);$('rows').closest('.pc-list-panel').append(pager);
 prev.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};
 const controls=['query','material','part','dn','status'];
 function options(id,values){values.forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=id==='dn'?'DN '+value:value;$(id).appendChild(option);});}
 options('material',[...new Set(catalog.records.map(r=>r.material))]);
 options('part',[...new Set(catalog.records.map(r=>r.part))]);
 options('dn',[...new Set(catalog.records.map(r=>r.keys.nominalDiameter))].sort((a,b)=>a-b));
 $('coverage-title').textContent=`${catalog.coverage.stage} · ${catalog.records.length}개 규격 · 수록 범위와 자료 기준`;
 $('coverage-body').innerHTML='<p>'+escape(catalog.disclaimer)+'</p><b>정리한 범위</b><ul>'+catalog.coverage.included.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul><b>아직 정리하지 않은 범위</b><ul>'+catalog.coverage.pending.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul><p>호칭경은 조회 조건이며 실제 외경과 다릅니다. 숫자의 단위와 원문 치수 기호를 함께 확인하세요. 원문 공란은 0으로 채우지 않습니다.</p>';
 function detail(){
  const r=rows.find(x=>x.id===selected);
  if(!r){$('detail').innerHTML='<p class="pc-detail-sub">검색 결과에서 규격을 선택하면 치수와 원문 근거를 확인할 수 있습니다.</p>';return;}
  const s=catalog.sources[r.source.documentId],k=r.keys;
  const issue=r.validation.issues.map(x=>'<p class="pc-issue">'+escape(x)+'</p>').join('');
  const dims=Object.entries(r.dimensions).map(([key,value])=>{const f=catalog.fields[key];return '<div><dt>'+escape(f.label)+' · '+escape(f.sourceSymbol)+'</dt><dd>'+escape(value)+'<small>'+escape(f.unit)+'</small></dd></div>';}).join('');
  let sourceUrl='';try{sourceUrl=new URL('file:///'+s.path.replace(/\\/g,'/')).href+'#page='+r.source.pdfPage;}catch{}
  $('detail').innerHTML='<p class="pc-detail-tag">'+escape(r.material)+' · '+(r.validation.status==='needs-review'?'확인 필요':'원문 대조')+'</p><h2 tabindex="-1">'+escape(r.part)+' · DN '+k.nominalDiameter+(k.angle==null?'':' · '+k.angle+'°')+'</h2><p class="pc-detail-sub">'+escape(k.variant)+(k.joint?' · '+escape(k.joint):'')+'</p>'+issue+'<dl class="pc-dimensions">'+dims+'</dl><ul class="pc-notes">'+r.notes.map(x=>'<li>'+escape(x)+'</li>').join('')+'</ul><div class="pc-source"><b>'+escape(s.title)+'</b><br>책 '+escape(r.source.printedPage)+'쪽 · PDF '+r.source.pdfPage+'페이지<br>'+escape(r.source.table)+'<details id="pc-source-details"><summary>원문 도식·표 보기</summary><img loading="lazy" src="'+PIPE_SOURCE_IMAGES[r.source.image]+'" alt="'+escape(r.source.table)+' 원문 페이지"><p>표와 도식의 기호를 함께 확인하세요. 원문 공란과 주석을 보존한 페이지입니다.</p></details>'+(sourceUrl?'<a href="'+escape(sourceUrl)+'" target="_blank" rel="noopener">전체 PDF 열기 (원본 드라이브 필요)</a>':'')+'</div><p class="pc-detail-sub">핸드북 수록값입니다. 최신 표준 적합성은 확인하지 않았습니다.</p>';
 }
 function render(){
  catalogRendered=true;
  rows=PipeCatalogCore.filter(catalog,Object.fromEntries(controls.map(id=>[id,$(id).value])));
  const key=JSON.stringify(controls.map(id=>$(id).value));if(key!==filterKey){page=0;filterKey=key;}
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));page=Math.max(0,Math.min(page,pages-1));const pageRows=rows.slice(page*pageSize,(page+1)*pageSize);
  prev.disabled=page===0;next.disabled=page===pages-1;info.textContent=(page+1)+' / '+pages+'페이지';pager.hidden=!rows.length;
  if(!pageRows.some(r=>r.id===selected))selected=pageRows[0]?.id??null;
  const flagged=rows.filter(r=>r.validation.status==='needs-review').length;
  $('count').textContent=`${rows.length}개 결과 / 전체 ${catalog.records.length}개`+(flagged?` · 확인 필요 ${flagged}개`:'');
  $('empty').hidden=!!rows.length;
  $('rows').innerHTML=pageRows.map(r=>'<tr class="'+(r.id===selected?'pc-selected':'')+'"><td>'+escape(r.part)+(r.keys.angle==null?'':' '+r.keys.angle+'°')+'<small>'+escape(r.material)+'</small></td><td>DN '+r.keys.nominalDiameter+'</td><td>'+escape(r.keys.variant)+'<small>'+escape(r.keys.joint)+'</small>'+(r.validation.status==='needs-review'?'<span class="pc-status-note">확인 필요</span>':'')+'</td><td><button type="button" data-pipe-id="'+escape(r.id)+'" aria-pressed="'+(r.id===selected)+'" aria-label="'+escape(r.material+' '+r.part+' DN '+r.keys.nominalDiameter+' '+r.keys.variant+' '+r.keys.joint+(r.keys.angle==null?'':' '+r.keys.angle+'도'))+' 상세">보기</button></td></tr>').join('');
  detail();
 }
 controls.forEach(id=>$(id).addEventListener(id==='query'?'input':'change',render));
 $('reset').onclick=()=>{controls.forEach(id=>$(id).value='');render();};
 $('rows').onclick=event=>{const button=event.target.closest('[data-pipe-id]');if(!button)return;selected=button.dataset.pipeId;render();$('detail').querySelector('h2').focus({preventScroll:true});if(window.innerWidth<=1000)$('detail').scrollIntoView({block:'start',behavior:'auto'});};
 document.addEventListener('tool-tab-change',event=>{if(event.detail==='pipes'&&!catalogRendered)render();});
 if(document.querySelector('.tab-panel[data-tab="pipes"]').style.display!=='none')render();
})();
