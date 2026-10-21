/* Presentation for the PSI planning model. All data remains browser-local. */
(function (root) {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = n => new Intl.NumberFormat('en-GB', {maximumFractionDigits:1}).format(n);
  const gbp = n => new Intl.NumberFormat('en-GB', {style:'currency',currency:'GBP'}).format(n/100);
  const day = d => new Date(d+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  const nextDay = d => new Date(Date.parse(d+'T00:00:00Z')+86400000).toISOString().slice(0,10);
  const colours = ['#2563EB','#0F766E','#14263D'];
  const categories = root.InventoryModel.categories;
  const colour = name => colours[categories.indexOf(name)%colours.length];
  let plan, actual, measure='units', risk='attention', selectedPoint=0, planningRows=[];
  const riskClass = r => r==='Shortage'?'warn':r==='Reorder'?'caution':r==='Excess'?'excess':'good';
  const riskLabel = r => r==='Shortage'?'Projected shortage':r==='Reorder'?'Below reorder point':r==='Excess'?'Excess cover':'Healthy';
  function updateChartDetail(index) {
    const point=plan.history[index];if(!point)return;
    selectedPoint=index;
    $('psi-chart-detail').textContent=`${point.label} · Closing stock ${num(point.closing)} units · Sales ${num(point.sold)} units · Receipts ${num(point.received)} units`;
    $('psi-history-chart').querySelectorAll('[data-point]').forEach(e=>e.classList.toggle('is-active',+e.dataset.point===index));
  }
  function drawHistory() {
    const el=$('psi-history-chart');if(!plan||!el.clientWidth)return;
    const w=Math.max(240,Math.floor(el.clientWidth)),h=310,left=42,right=12;
    const step=(w-left-right)/plan.history.length;
    const xs=plan.history.map((_,i)=>left+step*(i+.5));
    const ceiling=values=>{const m=Math.max(1,...values);const unit=m>200?100:m>50?50:10;return Math.ceil(m/unit)*unit;};
    const stockMax=ceiling(plan.history.map(r=>r.closing));
    const salesMax=ceiling(plan.history.map(r=>r.sold));
    const yStock=n=>140-n/stockMax*104, ySale=n=>278-n/salesMax*80;
    const path=plan.history.map((r,i)=>(i?'L':'M')+xs[i]+','+yStock(r.closing)).join(' ');
    let svg=`<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="group" aria-label="Sales and inventory trends. Each series has its own labelled scale. Focus a time interval for values."><text class="psi-axis-title" x="0" y="17">Closing stock · interval end</text><text class="psi-axis-title" x="0" y="182">Sales · during interval</text>`;
    [[stockMax,yStock],[salesMax,ySale]].forEach(([max,y])=>[0,max/2,max].forEach(n=>{svg+=`<line class="psi-gridline" x1="${left}" x2="${w-right}" y1="${y(n)}" y2="${y(n)}"/><text class="psi-axis-label" x="${left-8}" y="${y(n)+4}" text-anchor="end">${num(n)}</text>`;}));
    svg+=`<path d="${path} L${xs.at(-1)},140 L${xs[0]},140 Z" fill="#2563EB" fill-opacity=".08"/><path d="${path}" fill="none" stroke="#2563EB" stroke-width="2.5"/>`;
    plan.history.forEach((r,i)=>{
      const title=`${r.label}: closing stock ${r.closing}, sales ${r.sold}, receipts ${r.received} units`;
      const short=r.label.replace(/ 2026/g,'').replace(/ (Jul|Aug|Sep)$/,'');
      const barWidth=Math.min(38,step*.5);
      svg+=`<g class="psi-chart-point${i===selectedPoint?' is-active':''}" role="button" tabindex="0" data-point="${i}" aria-label="${esc(title)}"><title>${esc(title)}</title><rect class="psi-hit" x="${xs[i]-step/2}" y="26" width="${step}" height="258" fill="transparent"/><circle class="psi-focus-ring" cx="${xs[i]}" cy="${yStock(r.closing)}" r="8" fill="none" stroke="#14263D" stroke-width="2"/><circle cx="${xs[i]}" cy="${yStock(r.closing)}" r="4" fill="#2563EB"/><rect x="${xs[i]-barWidth/2}" y="${ySale(r.sold)}" width="${barWidth}" height="${278-ySale(r.sold)}" rx="3" fill="#0F766E"/><text class="psi-axis-label" x="${xs[i]}" y="302" text-anchor="middle">${esc(short)}</text></g>`;
    });
    el.innerHTML=svg+'</svg>';
    updateChartDetail(selectedPoint);
  }
  function renderProducts() {
    if(!plan)return;
    const key=measure==='units'?'sold':'salesValueCents';
    const rows=[...plan.products].sort((a,b)=>b[key]-a[key]);
    const max=Math.max(1,...rows.map(r=>r[key]));
    $('psi-product-bars').innerHTML=rows.map(r=>`<button type="button" class="psi-product-row" data-product="${esc(r.name)}" aria-label="${esc(r.name)}: ${measure==='units'?num(r.sold)+' units sold':gbp(r.salesValueCents)+' revenue'}. View stock ledger."><span class="psi-product-name">${esc(r.name)}</span><span class="psi-product-track" aria-hidden="true"><span style="width:${r[key]/max*100}%"></span></span><strong>${measure==='units'?num(r.sold):gbp(r.salesValueCents)}</strong></button>`).join('');
    document.querySelectorAll('[data-measure]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.measure===measure)));
  }
  function renderPlanning() {
    if(!plan)return;
    const rank={Shortage:0,Reorder:1,Excess:2,Healthy:3};
    planningRows=plan.rows.filter(r=>risk==='all'||(risk==='attention'?r.risk!=='Healthy':r.risk===risk)).sort((a,b)=>rank[a.risk]-rank[b.risk]||a.projected-b.projected);
    $('psi-plan-count').textContent=`${planningRows.length} of ${plan.rows.length} positions shown. This filter affects the planning table and its CSV only.`;
    $('psi-plan-scope').textContent=`As at ${day(plan.asOf)} · Planning horizon ${day(nextDay(plan.asOf))}–${day(plan.horizonEnd)}`;
    $('psi-planning-table').innerHTML=planningRows.map(r=>{
      const action=r.suggestedOrder>0?`Review ${num(r.suggestedOrder)}-unit top-up`:r.risk==='Excess'?'Review stock allocation':'Monitor stock';
      return `<tr><td><button type="button" class="inv-product-link" data-plan-sku="${esc(r.sku)}" data-plan-warehouse="${esc(r.warehouse)}">${esc(r.name)}<small>${esc(r.warehouseName)} · ${esc(r.sku)}</small></button></td><td class="num">${num(r.onHand)}</td><td class="num">${num(r.dueSoon)}</td><td class="num">${num(r.forecast)}</td><td class="num ${r.projected<0?'psi-negative':''}">${num(r.projected)}</td><td class="num">${r.coverDays==null?'No sales':num(r.coverDays)+'d'}</td><td><span class="inv-status ${riskClass(r.risk)}">${riskLabel(r.risk)}</span></td><td class="psi-next-step"><strong>${action}</strong><small>${esc(r.reason)}</small></td></tr>`;
    }).join('')||'<tr><td class="inv-empty" colspan="8">No positions match this planning status. Choose another status to explore the stock.</td></tr>';
  }
  function render(p,v) {
    plan=p;actual=v;selectedPoint=Math.min(selectedPoint,plan.history.length-1);
    $('inv-kpis').innerHTML=[
      ['On-hand stock',num(p.onHandUnits),'units',`${gbp(v.stockValueCents)} at fixed cost`,'stock'],
      ['Open purchase orders',num(p.onOrderUnits),'units',`${num(p.dueSoonUnits)} expected in next 30 days`,'orders'],
      ['30-day sales forecast',num(p.forecastUnits),'units','Baseline from recent daily sales','forecast'],
      ['Projected shortages',num(p.shortageCount),'positions',`${num(p.reorderCount)} more below reorder point`,'risk']
    ].map(([label,value,unit,note,kind])=>`<div class="psi-kpi-${kind}"><dt>${label}</dt><dd><span>${value}</span><em>${unit}</em><small>${esc(note)}</small></dd></div>`).join('');
    $('psi-business-summary').innerHTML=[['Sales in period',gbp(v.salesValueCents)],['Purchases received',gbp(v.receivedValueCents)],['Outstanding receivables',gbp(v.outstandingCents)],['Overdue receivables',gbp(v.overdueCents)]].map(([name,value])=>`<div><dt>${name}</dt><dd>${value}</dd></div>`).join('');
    $('psi-horizon').textContent=`${day(nextDay(p.asOf))}–${day(p.horizonEnd)} · All values in units`;
    $('psi-outlook').innerHTML=[['On hand',p.onHandUnits,''],['Expected receipts',p.dueSoonUnits,'+'],['Baseline sales',p.forecastUnits,'−'],['Projected net stock',p.projectedUnits,'=']].map(([label,value,op])=>`<div><dt>${op?`<span aria-hidden="true">${op}</span> `:''}${label}</dt><dd>${num(value)}</dd></div>`).join('');
    $('psi-estimate-note').textContent=`Demand baseline: ${num(p.lookbackDays)} calendar days ending ${day(p.asOf)}. Zero-sale days included; no seasonality adjustment. A positive total can still contain individual SKU shortages.`;
    $('psi-incoming-note').textContent=`${num(p.overdueIncomingUnits)} units due on or before the snapshot are still unreceived and excluded from expected receipts. Confirm their arrival dates.`;
    $('psi-mix-total').textContent=num(v.soldUnits);
    let start=0;const slices=plan.categoryMix.filter(r=>r.share>0);
    const stops=slices.map(r=>{
      const end=start+r.share*100,gap=slices.length>1?Math.min(.5,(end-start)/2):0;
      const stop=`${colour(r.name)} ${start}% ${end-gap}%${gap?`, #FFFFFF ${end-gap}% ${end}%`:''}`;
      start=end;return stop;
    });
    $('psi-donut').style.background=v.soldUnits?`conic-gradient(${stops.join(',')})`:'var(--line)';
    $('psi-mix-legend').innerHTML=plan.categoryMix.map(r=>`<li><span><i style="background:${colour(r.name)}" aria-hidden="true"></i>${esc(r.name)}</span><strong>${num(r.share*100)}%<small>${num(r.sold)} units</small></strong></li>`).join('');
    $('psi-history-table').innerHTML=plan.history.map(r=>`<tr><th scope="row">${esc(r.label)}</th><td class="num">${num(r.closing)}</td><td class="num">${num(r.sold)}</td><td class="num">${num(r.received)}</td></tr>`).join('');
    renderProducts();renderPlanning();drawHistory();
  }
  $('psi-history-chart').addEventListener('pointerover',e=>{const point=e.target.closest('[data-point]');if(point)updateChartDetail(+point.dataset.point);});
  $('psi-history-chart').addEventListener('focusin',e=>{const point=e.target.closest('[data-point]');if(point)updateChartDetail(+point.dataset.point);});
  $('psi-history-chart').addEventListener('keydown',e=>{
    const point=e.target.closest('[data-point]');if(!point)return;
    if(['Enter',' '].includes(e.key)){e.preventDefault();updateChartDetail(+point.dataset.point);}
    if(['ArrowLeft','ArrowRight'].includes(e.key)){
      e.preventDefault();const n=(+point.dataset.point+(e.key==='ArrowRight'?1:plan.history.length-1))%plan.history.length;
      $('psi-history-chart').querySelector(`[data-point="${n}"]`).focus();
    }
  });
  $('psi-risk').addEventListener('change',e=>{risk=e.target.value;renderPlanning();});
  document.querySelectorAll('[data-measure]').forEach(b=>b.addEventListener('click',()=>{measure=b.dataset.measure;renderProducts();}));
  let resizeFrame;
  window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(drawHistory);});
  root.PSIReport={render,resize:drawHistory,getPlanningRows:()=>planningRows,reset:()=>{risk='attention';measure='units';selectedPoint=0;$('psi-risk').value=risk;},openMethod:()=>{$('psi-method').open=true;}};
  document.querySelector('.psi-method-link').addEventListener('click',()=>{$('psi-method').open=true;});
})(window);
