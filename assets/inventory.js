/* UI for the synthetic inventory model. No external services or employer data. */
(() => {
  'use strict';
  const model = window.InventoryModel;
  if (!model) return;
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => new Intl.NumberFormat('en-GB').format(value);
  const money = value => new Intl.NumberFormat('en-GB', {style:'currency',currency:'GBP',maximumFractionDigits:0}).format(value / 100);
  const exactMoney = value => new Intl.NumberFormat('en-GB', {style:'currency',currency:'GBP'}).format(value / 100);
  const date = value => new Date(value + 'T00:00:00Z').toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  const categories = [...new Set(model.products.map(p => p.category))];
  const tabs = ['overview','stock','purchases','receivables'];
  const initial = new URLSearchParams(location.search);
  const allowed = (value, values, fallback) => values.includes(value) ? value : fallback;
  const state = {
    period: allowed(initial.get('period'), model.periods.map(p => p.id), '2026-09'),
    warehouse: allowed(initial.get('warehouse'), ['all', ...model.warehouses.map(w => w.id)], 'all'),
    category: allowed(initial.get('category'), ['all', ...categories], 'all'),
    tab: allowed(initial.get('tab'), tabs, 'overview'),
    search: '', status: 'all', selected: null
  };
  let view;
  let stockRows = [];
  let selectedMovements = [];
  const options = (items, selected) => items.map(i => `<option value="${escape(i.id)}"${i.id === selected ? ' selected' : ''}>${escape(i.label || i.name)}</option>`).join('');
  $('inv-period').innerHTML = options(model.periods, state.period);
  $('inv-warehouse').innerHTML = options([{id:'all',name:'All warehouses'}, ...model.warehouses], state.warehouse);
  $('inv-category').innerHTML = options([{id:'all',name:'All categories'}, ...categories.map(c=>({id:c,name:c}))], state.category);
  const warehouseName = id => model.warehouses.find(w=>w.id===id)?.name || id;
  const badge = status => {
    const kind = ['Low stock','Overdue'].includes(status) ? 'warn' : ['Healthy','Paid'].includes(status) ? 'good' : status === 'Excess' ? 'excess' : '';
    return `<span class="inv-status ${kind}">${escape(status)}</span>`;
  };
  const cover = value => value == null ? 'No sales' : `${number(value)} days`;
  const empty = (columns, text) => `<tr><td colspan="${columns}" class="inv-empty">${escape(text)}</td></tr>`;
  const sum = (rows, key) => rows.reduce((n,r)=>n+r[key],0);
  function updateURL() {
    try {
      const url = new URL(location.href);
      ['period','warehouse','category','tab'].forEach(k=>url.searchParams.set(k,state[k]));
      history.replaceState(null,'',url);
    } catch (_) { /* The dashboard also works when opened directly as a local file. */ }
  }
  function chooseTab(tab, focus = false) {
    state.tab = tab;
    tabs.forEach(name => {
      const active = name === tab;
      const button = $('tab-' + name);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      $('panel-' + name).hidden = !active;
    });
    if (focus) $('tab-' + tab).focus();
    updateURL();
  }
  const smallMetric = (title,value,note) => `<div><dt>${escape(title)}</dt><dd>${escape(value)}<small>${escape(note)}</small></dd></div>`;
  function renderOverview() {
    const low = view.stockRows.filter(r=>r.status==='Low stock');
    const excess = view.stockRows.filter(r=>r.status==='Excess');
    const late = view.purchaseOrders.filter(r=>r.status==='Overdue');
    const overdueInvoices = view.invoices.filter(r=>r.status==='Overdue');
    $('inv-flow').innerHTML = [
      ['','Opening stock',view.openingUnits],['+','Purchases received',view.receivedUnits],
      ['−','Sales dispatched',view.soldUnits],['−','Samples issued',view.sampleUnits],['=','Closing stock',view.closingUnits]
    ].map(([symbol,label,value])=>`<div><dt><span aria-hidden="true">${symbol}</span>${label}</dt><dd>${number(value)}</dd></div>`).join('');
    const max = Math.max(1,...view.trend.flatMap(r=>[r.received,r.sold]));
    $('inv-trend').innerHTML = view.trend.map(r=>`<div class="inv-trend-row"><span class="inv-trend-label">${escape(r.label)}</span><div class="inv-trend-bars">${[['received','Received'],['sold','Sold']].map(([key,label])=>`<div class="inv-trend-line" aria-label="${escape(r.label)}: ${label.toLowerCase()} ${r[key]} units"><div class="inv-trend-track" aria-hidden="true"><span class="inv-${key}" style="width:${r[key]/max*100}%"></span></div><b aria-hidden="true">${number(r[key])}</b></div>`).join('')}</div></div>`).join('');
    const alerts = [
      [low.length,'Stock positions needing replenishment','At or below reorder point · review incoming stock','stock','Low stock'],
      [overdueInvoices.length,'Overdue invoices',`${exactMoney(view.overdueCents)} still unpaid at period end`,'receivables','all'],
      [late.length,'Late purchase orders','Expected receipt date has passed','purchases','all'],
      [excess.length,'Stock positions with excess cover','More than 90 days at this period’s sales rate','stock','Excess']
    ];
    $('inv-alerts').innerHTML = alerts.map(([n,title,note,tab,status])=>`<button type="button" class="inv-alert" data-go="${tab}" data-status="${status}"><strong>${n}</strong><span><b>${title}</b><small>${escape(note)}</small></span><span aria-hidden="true">→</span></button>`).join('');
    const rank = {'Low stock':0,'Excess':1,'Healthy':2};
    const preview = [...view.stockRows].sort((a,b)=>rank[a.status]-rank[b.status] || a.closing-b.closing).slice(0,6);
    $('inv-preview-caption').textContent = `On-hand stock as at ${date(view.end)}. Cover uses sales during ${view.label}.`;
    $('inv-stock-preview').innerHTML = preview.map(r=>`<tr><td><strong>${escape(r.name)}</strong><small>${escape(r.sku)}</small></td><td>${escape(r.warehouseName)}</td><td class="num">${number(r.closing)}</td><td class="num">${cover(r.coverDays)}</td><td>${badge(r.status)}</td></tr>`).join('') || empty(5,'No products in this scope.');
  }
  function renderStock() {
    const query = state.search.trim().toLowerCase();
    stockRows = view.stockRows.filter(r=>(state.status==='all'||r.status===state.status) && `${r.name} ${r.sku}`.toLowerCase().includes(query));
    $('inv-stock-count').textContent = `${stockRows.length} of ${view.stockRows.length} product–warehouse positions shown. Closing balances as at ${date(view.end)}.`;
    $('inv-stock-table').innerHTML = stockRows.map(r=>`<tr><td><button type="button" class="inv-product-link" data-sku="${escape(r.sku)}" data-warehouse="${escape(r.warehouse)}" aria-label="View movements for ${escape(r.name)} at ${escape(r.warehouseName)}">${escape(r.name)}<small>${escape(r.sku)}</small></button></td><td>${escape(r.warehouseName)}</td>${[r.opening,r.received,r.sold,r.samples,r.closing].map(v=>`<td class="num">${number(v)}</td>`).join('')}<td class="num">${exactMoney(r.valueCents)}</td><td class="num">${cover(r.coverDays)}</td><td>${badge(r.status)}</td></tr>`).join('') || empty(10,'No products match. Clear the search or choose another stock status.');
    if (state.selected && !stockRows.some(r=>r.sku===state.selected.sku&&r.warehouse===state.selected.warehouse)) state.selected=null;
    renderMovements();
  }
  function renderMovements(focus = false) {
    const r = state.selected;
    $('inv-movement-detail').hidden = !r;
    selectedMovements = [];
    if (!r) return;
    selectedMovements = view.movements.filter(m=>m.product===r.name && m.warehouse===r.warehouse);
    $('inv-detail-title').textContent = `${r.name} · ${r.warehouseName}`;
    $('inv-detail-note').textContent = `Reorder point: ${r.reorderPoint} units. Suggested top-up: ${r.suggestedOrder} units before allowing for incoming orders.`;
    $('inv-movement-table').innerHTML = selectedMovements.map(m=>`<tr><td>${date(m.date)}</td><td>${escape(m.id)}</td><td>${escape(m.type)}</td><td class="num">${m.quantity>0?'+':''}${number(m.quantity)}</td><td class="num">${exactMoney(m.valueCents)}</td></tr>`).join('') || empty(5,'No stock movements during this period.');
    if (focus) $('inv-detail-title').focus();
  }
  const receiptRows = () => view.movements.filter(m=>m.quantity>0);
  function renderPurchases() {
    const po = view.purchaseOrders;
    const late = po.filter(r=>r.status==='Overdue');
    $('inv-purchase-summary').innerHTML = [
      smallMetric('Received during period',number(view.receivedUnits)+' units',exactMoney(view.receivedValueCents)+' at cost'),
      smallMetric('Still on order',number(sum(po,'quantity'))+' units',`${po.length} open purchase orders`),
      smallMetric('Overdue incoming',number(late.length)+' orders',`As at ${date(view.end)}`)
    ].join('');
    $('inv-po-caption').textContent = `Open as at ${date(view.end)}. A purchase order is overdue when its expected date is before this date and the goods have not been received.`;
    $('inv-po-table').innerHTML = po.map(r=>`<tr><td>${escape(r.id)}</td><td>${escape(r.product)}</td><td>${escape(warehouseName(r.warehouse))}</td><td>${date(r.expectedDate)}</td><td class="num">${number(r.quantity)}</td><td class="num">${exactMoney(r.valueCents)}</td><td>${badge(r.status)}</td></tr>`).join('') || empty(7,'No open purchase orders at this period end.');
    $('inv-receipts-table').innerHTML = receiptRows().map(r=>`<tr><td>${date(r.date)}</td><td>${escape(r.id)}</td><td>${escape(r.product)}</td><td>${escape(warehouseName(r.warehouse))}</td><td class="num">${number(r.quantity)}</td><td class="num">${exactMoney(r.valueCents)}</td></tr>`).join('') || empty(6,'No purchase receipts during this period.');
  }
  function renderReceivables() {
    $('inv-ar-summary').innerHTML = [
      smallMetric('Collected during period',exactMoney(view.cashReceivedCents),'Includes earlier invoices'),
      smallMetric('Outstanding, not yet overdue',exactMoney(view.outstandingCents-view.overdueCents),`As at ${date(view.end)}`),
      smallMetric('Overdue balance',exactMoney(view.overdueCents),`Due before ${date(view.end)}`)
    ].join('');
    $('inv-ar-caption').textContent = `All scoped invoices issued through ${date(view.end)}, including paid invoices. Payments are cumulative through that date. Values are GBP, excluding VAT.`;
    const rank = {'Overdue':0,'Open':1,'Paid':2};
    const invoices = [...view.invoices].sort((a,b)=>rank[a.status]-rank[b.status]||a.dueDate.localeCompare(b.dueDate));
    $('inv-ar-table').innerHTML = invoices.map(r=>`<tr><td><strong>${escape(r.id)}</strong><small>${escape(r.customer)}</small></td><td>${escape(warehouseName(r.warehouse))}</td><td>${date(r.date)}</td><td>${date(r.dueDate)}</td><td class="num">${exactMoney(r.amountCents)}</td><td class="num">${exactMoney(r.paidCents)}</td><td class="num">${exactMoney(r.outstandingCents)}</td><td>${badge(r.status)}</td></tr>`).join('') || empty(8,'No invoices in this scope.');
  }
  function render() {
    view = model.view(state);
    const locationLabel = state.warehouse==='all' ? 'All warehouses' : warehouseName(state.warehouse);
    $('inv-scope').textContent = `${view.label} · ${locationLabel} · ${state.category==='all'?'All categories':state.category} · Balances as at ${date(view.end)} · GBP, excluding VAT`;
    $('inv-kpis').innerHTML = [
      ['Sales dispatched',view.salesValueCents,`${number(view.soldUnits)} units during period`,false],
      ['Purchases received',view.receivedValueCents,`${number(view.receivedUnits)} units at cost`,false],
      ['Closing inventory',view.stockValueCents,`${number(view.closingUnits)} units on hand`,true],
      ['Outstanding receivables',view.outstandingCents,`${money(view.overdueCents)} overdue at period end`,false]
    ].map(([label,value,note,emphasis])=>`<div${emphasis?' class="inv-emphasis"':''}><dt>${label}</dt><dd>${exactMoney(value)}<small>${escape(note)}</small></dd></div>`).join('');
    renderOverview(); renderStock(); renderPurchases(); renderReceivables();
    $('inv-download-status').textContent='';
    updateURL();
  }
  function download(kind) {
    let rows, columns;
    if (kind==='stock') {
      rows=stockRows;
      columns=[['sku','SKU'],['name','Product'],['warehouseName','Warehouse'],['opening','Opening units'],['received','Received units'],['sold','Sold units'],['samples','Sample units'],['closing','Closing units'],['valueCents','Stock value GBP',v=>(v/100).toFixed(2)],['reorderPoint','Reorder point'],['coverDays','Days of cover',v=>v==null?'':v.toFixed(2)],['suggestedOrder','Suggested top-up units before incoming'],['status','Status']];
    } else if (kind==='purchases') {
      rows=view.purchaseOrders;
      columns=[['id','Order'],['product','Product'],['warehouse','Warehouse',warehouseName],['expectedDate','Expected date'],['quantity','Units'],['valueCents','Cost GBP',v=>(v/100).toFixed(2)],['status','Status']];
    } else if (kind==='receivables') {
      rows=view.invoices;
      columns=[['id','Invoice'],['customer','Customer'],['warehouse','Warehouse',warehouseName],['date','Issued'],['dueDate','Due'],['amountCents','Invoice GBP',v=>(v/100).toFixed(2)],['paidCents','Paid to date GBP',v=>(v/100).toFixed(2)],['outstandingCents','Outstanding GBP',v=>(v/100).toFixed(2)],['status','Status']];
    } else {
      rows=kind==='receipts'?receiptRows():selectedMovements;
      columns=[['date','Date'],['id','Reference'],['product','Product'],['warehouse','Warehouse',warehouseName],['type','Movement type'],['quantity','Signed units'],['valueCents','Signed cost GBP',v=>(v/100).toFixed(2)]];
    }
    const csvCell = value => '"'+String(value??'').replace(/"/g,'""')+'"';
    const output=[['Synthetic data','Period start','As of date',...columns.map(c=>c[1])],...rows.map(r=>['true',view.start,view.end,...columns.map(([key,,format])=>format?format(r[key]):r[key])])].map(row=>row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF'+output],{type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`synthetic-${kind}-${state.period}-${state.warehouse}-${state.category.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.csv`;
    document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    $('inv-download-status').textContent=`Downloaded ${rows.length} ${kind==='stock'?'stock positions':'records'} using the current filters. All exported data is synthetic.`;
  }
  $('inv-filters').addEventListener('submit',e=>e.preventDefault());
  ['period','warehouse','category'].forEach(k=>$('inv-'+k).addEventListener('change',e=>{state[k]=e.target.value;state.selected=null;render();}));
  $('inv-reset').addEventListener('click',()=>{
    Object.assign(state,{period:'2026-09',warehouse:'all',category:'all',tab:'overview',search:'',status:'all',selected:null});
    ['period','warehouse','category'].forEach(k=>$('inv-'+k).value=state[k]);
    $('inv-search').value=''; $('inv-stock-status').value='all'; render();chooseTab('overview');
  });
  $('inv-search').addEventListener('input',e=>{state.search=e.target.value;renderStock();});
  $('inv-stock-status').addEventListener('change',e=>{state.status=e.target.value;renderStock();});
  document.querySelector('.inv-tabs').addEventListener('keydown',e=>{
    const current=tabs.indexOf(state.tab); let next;
    if(e.key==='ArrowRight') next=(current+1)%tabs.length;
    if(e.key==='ArrowLeft') next=(current+tabs.length-1)%tabs.length;
    if(e.key==='Home') next=0;
    if(e.key==='End') next=tabs.length-1;
    if(next!==undefined){e.preventDefault();chooseTab(tabs[next],true);}
  });
  $('inv-app').addEventListener('click',e=>{
    const b=e.target.closest('button'); if(!b)return;
    if(b.dataset.tab) chooseTab(b.dataset.tab);
    if(b.dataset.go){
      state.search=''; $('inv-search').value='';
      state.status=b.dataset.status||'all'; $('inv-stock-status').value=state.status;renderStock();chooseTab(b.dataset.go,true);
    }
    if(b.dataset.export) download(b.dataset.export);
    if(b.dataset.sku){state.selected=view.stockRows.find(r=>r.sku===b.dataset.sku&&r.warehouse===b.dataset.warehouse);renderMovements(true);}
  });
  render(); chooseTab(state.tab); $('inv-app').hidden=false;
})();
