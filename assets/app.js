'use strict';
const rows = [
  {month:'April', revenue:42000, orders:420, onTime:378, serviceCases:58},
  {month:'May', revenue:46500, orders:465, onTime:428, serviceCases:49},
  {month:'June', revenue:51000, orders:510, onTime:485, serviceCases:43}
];
const currency = new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0});
const period = document.getElementById('period');
function selectedRows(){return period.value === 'all' ? rows : [rows[Number(period.value)]];}
function render(){
  const selected = selectedRows();
  const sum = key => selected.reduce((total,row)=>total+row[key],0);
  const metrics = [['Revenue',currency.format(sum('revenue'))],['Orders',sum('orders').toLocaleString('en-GB')],['On-time fulfilment',(100*sum('onTime')/sum('orders')).toFixed(1)+'%']];
  document.getElementById('metrics').innerHTML=metrics.map(([label,value])=>`<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join('');
  const max = Math.max(...rows.map(row=>row.revenue));
  document.getElementById('chart').innerHTML=selected.map(row=>`<div class="bar-row"><span>${row.month}</span><div class="bar-track"><div class="bar" style="width:${100*row.revenue/max}%"></div></div><span>${currency.format(row.revenue)}</span></div>`).join('');
  document.getElementById('data-table').innerHTML=selected.map(row=>`<tr><th scope="row">${row.month}</th><td>${currency.format(row.revenue)}</td><td>${row.orders}</td><td>${row.onTime}</td><td>${row.serviceCases}</td></tr>`).join('');
  document.getElementById('insight').textContent=period.value==='all' ? 'Illustrative insight: revenue grows 21.4% from April to June while service cases fall from 58 to 43. These trends suggest questions to investigate; they do not establish cause and effect.' : `Illustrative insight: ${selected[0].month} has ${selected[0].serviceCases} service cases across ${selected[0].orders} orders. Review case types and resolution times before recommending action.`;
}
period.addEventListener('change',render);
document.getElementById('download').addEventListener('click',()=>{
  const csv='Dataset: synthetic portfolio demonstration\r\nMonth,Revenue_GBP,Orders,On_time_orders,Service_cases\r\n'+selectedRows().map(r=>[r.month,r.revenue,r.orders,r.onTime,r.serviceCases].join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  const link=document.createElement('a');link.href=url;link.download='wendi-ji-synthetic-operations.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
render();
