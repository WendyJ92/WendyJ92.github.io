(() => {
  'use strict';

  const root = document.getElementById('project-demo');
  if (!root) return;

  // Fictional tasks at a fixed snapshot. No employer or client information.
  const snapshot = '2026-09-30';
  const projects = [
    { id: 'reporting', name: 'Reporting rollout' },
    { id: 'crm', name: 'CRM onboarding' },
    { id: 'stock', name: 'Stock visibility' }
  ];
  const tasks = [
    { id: 'REP-01', project: 'reporting', name: 'Agree metric definitions', owner: 'Business analyst', planned: '2026-09-08', actual: '2026-09-08', forecast: null, progress: 100, blocker: 'None — completed as planned.', action: 'Definitions signed off for the prototype.' },
    { id: 'REP-02', project: 'reporting', name: 'Build dashboard prototype', owner: 'Data analyst', planned: '2026-09-18', actual: '2026-09-21', forecast: null, progress: 100, blocker: 'Late sample file delayed the prototype.', action: 'Prototype accepted; sample-file checklist updated.' },
    { id: 'REP-03', project: 'reporting', name: 'Validate financial totals', owner: 'Finance lead', planned: '2026-09-28', actual: null, forecast: '2026-10-05', progress: 75, blocker: 'Two reconciliation differences remain open.', action: 'Review exceptions with the finance lead on 1 Oct.' },
    { id: 'REP-04', project: 'reporting', name: 'Handover reporting guide', owner: 'Project coordinator', planned: '2026-10-08', actual: null, forecast: '2026-10-08', progress: 20, blocker: 'No current blocker; validation is a dependency.', action: 'Prepare the guide while validation is completed.' },
    { id: 'CRM-01', project: 'crm', name: 'Review access roles', owner: 'CRM administrator', planned: '2026-09-12', actual: '2026-09-11', forecast: null, progress: 100, blocker: 'None — completed before the planned finish.', action: 'Approved access matrix shared with the team.' },
    { id: 'CRM-02', project: 'crm', name: 'Import contact records', owner: 'Data analyst', planned: '2026-09-24', actual: null, forecast: '2026-10-02', progress: 80, blocker: 'Duplicate records need owner confirmation.', action: 'Resolve the exception list before the next import.' },
    { id: 'CRM-03', project: 'crm', name: 'Prepare onboarding guides', owner: 'Training coordinator', planned: '2026-10-02', actual: null, forecast: '2026-10-06', progress: 60, blocker: 'Final screenshots depend on the contact import.', action: 'Complete draft instructions while import is resolved.' },
    { id: 'CRM-04', project: 'crm', name: 'Run team training', owner: 'Training coordinator', planned: '2026-10-09', actual: null, forecast: '2026-10-12', progress: 25, blocker: 'Training follows approval of the onboarding guide.', action: 'Reserve a revised session and confirm attendance.' },
    { id: 'STK-01', project: 'stock', name: 'Map warehouse fields', owner: 'Operations analyst', planned: '2026-09-10', actual: '2026-09-10', forecast: null, progress: 100, blocker: 'None — completed as planned.', action: 'Field mapping approved for reconciliation.' },
    { id: 'STK-02', project: 'stock', name: 'Reconcile stock balances', owner: 'Inventory lead', planned: '2026-09-23', actual: null, forecast: '2026-10-03', progress: 70, blocker: 'An export omitted recent stock adjustments.', action: 'Obtain a corrected export and rerun reconciliation.' },
    { id: 'STK-03', project: 'stock', name: 'Configure exception alerts', owner: 'Systems analyst', planned: '2026-09-29', actual: null, forecast: '2026-10-04', progress: 50, blocker: 'Thresholds depend on reconciled stock balances.', action: 'Test alert rules with a sample while totals are checked.' },
    { id: 'STK-04', project: 'stock', name: 'Complete launch check', owner: 'Project coordinator', planned: '2026-10-07', actual: null, forecast: '2026-10-07', progress: 10, blocker: 'No current blocker; alert testing is a dependency.', action: 'Keep the launch checklist ready for the final review.' }
  ];

  const projectSelect = document.getElementById('pm-project');
  const statusSelect = document.getElementById('pm-status');
  const metrics = document.getElementById('pm-metrics');
  const chart = document.getElementById('pm-chart');
  const tableBody = document.getElementById('pm-table-body');
  const empty = document.getElementById('pm-empty');
  const tableRegion = document.getElementById('pm-table-region');
  const resultSummary = document.getElementById('pm-result-summary');
  const downloadButton = document.getElementById('pm-download');
  const downloadMessage = document.getElementById('pm-download-message');
  const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const day = 24 * 60 * 60 * 1000;

  // UTC date-only arithmetic avoids local timezone and daylight-saving changes.
  const difference = (end, start) => Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / day);
  const formatDate = value => dateFormat.format(new Date(`${value}T00:00:00Z`));
  const projectName = id => projects.find(project => project.id === id).name;
  const pluralDays = count => `${count} ${count === 1 ? 'day' : 'days'}`;

  function assess(task) {
    const completed = Boolean(task.actual);
    const variance = difference(task.actual || task.forecast, task.planned);
    const overdueDays = completed ? 0 : Math.max(0, difference(snapshot, task.planned));
    const delayed = !completed && (overdueDays > 0 || variance > 0);
    const status = completed ? 'completed' : delayed ? 'delayed' : 'on-track';
    const label = completed ? (variance > 0 ? 'Completed late' : 'Completed') : overdueDays > 0 ? 'Overdue · open' : variance > 0 ? 'Forecast late · open' : 'On track · open';
    return { ...task, completed, variance, overdueDays, status, label };
  }

  function selectedTasks() {
    return tasks.filter(task => projectSelect.value === 'all' || task.project === projectSelect.value).map(assess);
  }

  function shownTasks(scope = selectedTasks()) {
    return scope.filter(task => statusSelect.value === 'all' || task.status === statusSelect.value)
      .sort((a, b) => b.variance - a.variance || a.planned.localeCompare(b.planned));
  }

  function calculateMetrics(scope) {
    const completed = scope.filter(task => task.completed).length;
    return {
      total: scope.length,
      completed,
      completedPercent: scope.length ? Math.round(completed / scope.length * 100) : 0,
      overdue: scope.filter(task => task.overdueDays > 0).length,
      maxForecastDelay: Math.max(0, ...scope.filter(task => !task.completed).map(task => task.variance))
    };
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function dateElement(value) {
    const time = element('time', '', formatDate(value));
    time.dateTime = value;
    return time;
  }

  function varianceText(task) {
    if (task.variance > 0) return `${pluralDays(task.variance)} late${task.completed ? ' · actual' : ' · forecast'}`;
    if (task.variance < 0) return `${pluralDays(-task.variance)} early${task.completed ? ' · actual' : ' · forecast'}`;
    return task.completed ? 'Finished on time' : 'Forecast on time';
  }

  function renderMetrics(scope) {
    const values = calculateMetrics(scope);
    const cards = [
      { title: 'Tasks completed', value: `${values.completed} / ${values.total}`, detail: `${values.completedPercent}% of tasks in the selected scope` },
      { title: 'Open overdue tasks', value: String(values.overdue), detail: 'Unfinished with a planned finish before 30 Sep' },
      { title: 'Largest forecast delay', value: `${values.maxForecastDelay} days`, detail: 'Open tasks only · forecast minus planned finish' }
    ];
    metrics.replaceChildren(...cards.map(card => {
      const item = element('div', 'pm-metric');
      item.append(element('dt', '', card.title), element('dd', 'pm-metric-value', card.value), element('dd', 'pm-metric-detail', card.detail));
      return item;
    }));
  }

  function renderChart(visible, scope) {
    // Keep the scale fixed while filtering status, so bars remain comparable.
    const maxDelay = Math.max(1, ...scope.map(task => Math.max(0, task.variance)));
    chart.replaceChildren(...visible.map(task => {
      const row = element('li', 'pm-bar-row');
      const label = element('div', 'pm-bar-label');
      label.append(element('strong', '', task.name), element('span', '', `${projectName(task.project)} · ${task.label}`));
      const track = element('div', 'pm-bar-track');
      track.setAttribute('aria-hidden', 'true');
      const bar = element('span', task.completed ? 'pm-bar pm-bar-completed' : 'pm-bar');
      bar.style.width = `${Math.max(0, task.variance) / maxDelay * 100}%`;
      track.append(bar);
      const value = element('div', 'pm-bar-value');
      value.append(element('strong', '', varianceText(task)));
      if (task.overdueDays) value.append(element('span', '', `${pluralDays(task.overdueDays)} overdue at snapshot`));
      row.append(label, track, value);
      return row;
    }));
  }

  function renderTable(visible) {
    tableBody.replaceChildren(...visible.map(task => {
      const row = element('tr');
      const name = element('th', 'pm-task-cell');
      name.scope = 'row';
      name.append(element('strong', '', task.name), element('span', 'pm-cell-detail', `${task.id} · ${projectName(task.project)}`));
      const owner = element('td', 'pm-owner-cell', task.owner);
      const planned = element('td');
      planned.append(dateElement(task.planned));
      const finish = element('td');
      finish.append(dateElement(task.actual || task.forecast), element('span', 'pm-cell-detail', task.completed ? 'Actual' : 'Forecast'));
      const progress = element('td');
      const progressBar = element('progress', 'pm-progress');
      progressBar.max = 100;
      progressBar.value = task.progress;
      progressBar.setAttribute('aria-label', `${task.name}: ${task.progress}% complete`);
      progress.append(element('span', 'pm-progress-text', `${task.progress}%`), progressBar);
      const status = element('td', 'pm-status-cell');
      status.append(element('span', `pm-status-badge pm-status-${task.status}`, task.label), element('span', 'pm-cell-detail', varianceText(task)));
      if (task.overdueDays) status.append(element('span', 'pm-cell-detail', `${pluralDays(task.overdueDays)} overdue at snapshot`));
      const next = element('td', 'pm-action-cell');
      const blocker = element('p');
      blocker.append(element('strong', '', 'Reason: '), document.createTextNode(task.blocker));
      const action = element('p');
      action.append(element('strong', '', 'Next step: '), document.createTextNode(task.action));
      next.append(blocker, action);
      row.append(name, owner, planned, finish, progress, status, next);
      return row;
    }));
  }

  function render() {
    const scope = selectedTasks();
    const visible = shownTasks(scope);
    const scopeName = projectSelect.value === 'all' ? 'All three projects' : projectName(projectSelect.value);
    const filterName = statusSelect.options[statusSelect.selectedIndex].text;
    renderMetrics(scope);
    renderChart(visible, scope);
    renderTable(visible);
    resultSummary.textContent = `${visible.length} of ${scope.length} tasks shown · ${scopeName} · ${filterName}. Metrics cover all ${scope.length} tasks in this project scope.`;
    empty.hidden = visible.length !== 0;
    tableRegion.hidden = visible.length === 0;
    chart.hidden = visible.length === 0;
    downloadButton.disabled = visible.length === 0;
    downloadMessage.textContent = '';
  }

  function createCsv(visible) {
    const header = ['Dataset', 'Snapshot', 'Project', 'Task ID', 'Task', 'Owner role', 'Planned finish', 'Forecast finish', 'Actual finish', 'Progress percent', 'Status', 'Finish variance calendar days', 'Open overdue calendar days', 'Blocker or reason', 'Next action'];
    const rows = visible.map(task => ['Synthetic portfolio demonstration', snapshot, projectName(task.project), task.id, task.name, task.owner, task.planned, task.forecast || '', task.actual || '', task.progress, task.label, task.variance, task.overdueDays, task.blocker, task.action]);
    const quote = value => `"${String(value).replace(/"/g, '""')}"`;
    return '\uFEFF' + [header, ...rows].map(row => row.map(quote).join(',')).join('\r\n') + '\r\n';
  }

  projectSelect.addEventListener('change', render);
  statusSelect.addEventListener('change', render);
  downloadButton.addEventListener('click', () => {
    const visible = shownTasks();
    if (!visible.length) return;
    const url = URL.createObjectURL(new Blob([createCsv(visible)], { type: 'text/csv;charset=utf-8;' }));
    const link = element('a');
    link.href = url;
    link.download = `synthetic-project-tasks-${projectSelect.value}-${statusSelect.value}-${snapshot}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    downloadMessage.textContent = `CSV prepared with ${visible.length} shown tasks.`;
  });

  // Read-only copies support browser QA without changing the demonstration data.
  window.projectDashboard = Object.freeze({
    getState: () => ({ snapshot, project: projectSelect.value, status: statusSelect.value, metrics: calculateMetrics(selectedTasks()), tasks: shownTasks().map(task => ({ ...task })) })
  });
  render();
})();
