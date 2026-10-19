/*
 * Planning over InventoryModel's entirely synthetic ledger. Load inventory-data.js first.
 * A trailing-sales baseline, not a trained model or an accuracy-tested forecast.
 * No source records are changed. Dates use UTC calendar days; quantities are units.
 */
(function (root) {
  'use strict';

  const DAY = 86400000;
  const HORIZON_DAYS = 30;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function time(date) { return Date.parse(date + 'T00:00:00Z'); }
  function addDays(date, days) { return new Date(time(date) + days * DAY).toISOString().slice(0, 10); }
  function daysBetween(start, end) { return Math.round((time(end) - time(start)) / DAY) + 1; }
  function sum(rows, field) { return rows.reduce((total, row) => total + row[field], 0); }
  function within(date, start, end) { return date >= start && date <= end; }
  function monthEnd(date) {
    return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).toISOString().slice(0, 10);
  }

  function view(options) {
    const model = root.InventoryModel;
    if (!model || !model.data || typeof model.view !== 'function') throw new Error('InventoryModel must be loaded before PSIPlanning is used.');
    const selection = { period: 'all', warehouse: 'all', category: 'all', ...(options || {}) };
    // Base view validates filters and supplies period-end physical inventory.
    const base = model.view(selection);
    const data = model.data;
    const asOf = base.end;
    const horizonEnd = addDays(asOf, HORIZON_DAYS);
    const observedStart = model.start;
    const thirtyDaysAgo = addDays(asOf, -(HORIZON_DAYS - 1));
    const lookbackStart = thirtyDaysAgo < observedStart ? observedStart : thirtyDaysAgo;
    const lookbackDays = daysBetween(lookbackStart, asOf);
    if (lookbackDays < 1) throw new RangeError('Planning requires at least one observed calendar day.');
    const productById = Object.fromEntries(model.products.map(product => [product.id, product]));
    const matches = row => (selection.warehouse === 'all' || row.warehouse === selection.warehouse)
      && (selection.category === 'all' || productById[row.sku].category === selection.category);
    const samePosition = (row, position) => row.sku === position.sku && row.warehouse === position.warehouse;
    const observedSales = data.salesInvoices.filter(row => matches(row) && within(row.date, lookbackStart, asOf));
    const periodSales = data.salesInvoices.filter(row => matches(row) && within(row.date, base.start, asOf));
    const scopedReceipts = data.purchaseReceipts.filter(row => matches(row) && row.date <= asOf);
    const scopedSales = data.salesInvoices.filter(row => matches(row) && row.date <= asOf);
    const scopedSamples = data.sampleIssues.filter(row => matches(row) && row.date <= asOf);
    const scopedOpening = data.openingStock.filter(row => matches(row) && row.date <= asOf);
    // A future actual receipt date reveals only that the order was unreceived as of
    // this snapshot. Its future actual timing is never used to forecast incoming stock.
    const openOrders = data.purchaseOrders.filter(order => matches(order) && order.orderDate <= asOf
      && (!order.receivedDate || order.receivedDate > asOf));

    const rows = base.stockRows.map(position => {
      const orders = openOrders.filter(order => samePosition(order, position));
      const trailingSold = sum(observedSales.filter(sale => samePosition(sale, position)), 'quantity');
      const onOrder = sum(orders, 'quantity');
      // End-of-day convention: due today but unreceived is also unconfirmed/overdue.
      // Exclude these units until an updated ETA is confirmed; do not assume delivery.
      const overdueIncoming = sum(orders.filter(order => order.expectedDate <= asOf), 'quantity');
      const dueSoon = sum(orders.filter(order => order.expectedDate > asOf && order.expectedDate <= horizonEnd), 'quantity');
      // Round at each SKU/location, then aggregate: do not round one pooled forecast.
      const forecast = Math.ceil(trailingSold * HORIZON_DAYS / lookbackDays);
      const projected = position.closing + dueSoon - forecast;
      const rawCover = trailingSold > 0 ? position.closing * lookbackDays / trailingSold : null;
      const coverDays = rawCover === null ? null : Math.round(rawCover * 10) / 10;
      const suggestedOrder = Math.max(0, position.reorderPoint - projected);
      const excess = rawCover === null ? position.closing > 0 : rawCover > 90;
      // Strict inequalities: exactly at zero is not Shortage; exactly at the
      // reorder point is not Reorder. Shortage/Reorder take priority over Excess.
      const risk = projected < 0 ? 'Shortage' : projected < position.reorderPoint ? 'Reorder' : excess ? 'Excess' : 'Healthy';
      let reason;
      if (risk === 'Shortage') reason = 'Projected stock is ' + Math.abs(projected) + ' units below zero.';
      else if (risk === 'Reorder') reason = 'Projected stock is ' + (position.reorderPoint - projected) + ' units below the reorder point of ' + position.reorderPoint + '.';
      else if (risk === 'Excess') reason = rawCover === null ? 'No sales in the lookback window; positive stock remains.' : 'Current stock covers more than 90 days of trailing sales.';
      else reason = 'Projected stock meets the reorder point; current stock has no excess signal.';
      if (overdueIncoming > 0) reason += ' ' + overdueIncoming + ' units due by the snapshot are excluded pending a confirmed ETA.';
      return {
        sku: position.sku, name: position.name, category: position.category,
        warehouse: position.warehouse, warehouseName: position.warehouseName,
        onHand: position.closing, onOrder, dueSoon, overdueIncoming, forecast, projected,
        reorderPoint: position.reorderPoint, coverDays, suggestedOrder, risk, reason
      };
    });

    // History balances include all earlier movements and sample consumption.
    // Flow columns show only each bucket's receipts and sales; balances are not sums.
    const buckets = [];
    for (let start = base.start; start <= asOf;) {
      const proposedEnd = selection.period === 'all' ? monthEnd(start) : addDays(start, 6);
      const end = proposedEnd < asOf ? proposedEnd : asOf;
      const month = MONTHS[Number(start.slice(5, 7)) - 1];
      const label = selection.period === 'all' ? month : Number(start.slice(8)) + '–' + Number(end.slice(8)) + ' ' + month;
      buckets.push({ start, end, label });
      start = addDays(end, 1);
    }
    const history = buckets.map(bucket => ({
      date: bucket.end, label: bucket.label,
      closing: sum(scopedOpening.filter(row => row.date <= bucket.end), 'quantity')
        + sum(scopedReceipts.filter(row => row.date <= bucket.end), 'quantity')
        - sum(scopedSales.filter(row => row.date <= bucket.end), 'quantity')
        - sum(scopedSamples.filter(row => row.date <= bucket.end), 'quantity'),
      sold: sum(periodSales.filter(row => within(row.date, bucket.start, bucket.end)), 'quantity'),
      received: sum(scopedReceipts.filter(row => within(row.date, bucket.start, bucket.end)), 'quantity')
    }));

    // Product mix describes the SELECTED PERIOD. Forecast and closing describe the
    // snapshot. Shares are fractions (0–1) of units, not revenue percentages.
    const soldTotal = sum(periodSales, 'quantity');
    const products = model.products.filter(product => selection.category === 'all' || product.category === selection.category).map(product => {
      const sales = periodSales.filter(row => row.sku === product.id);
      const positions = rows.filter(row => row.sku === product.id);
      const sold = sum(sales, 'quantity');
      return { sku: product.id, name: product.name, category: product.category, sold,
        salesValueCents: sum(sales, 'amountCents'), closing: sum(positions, 'onHand'),
        forecast: sum(positions, 'forecast'), share: soldTotal > 0 ? sold / soldTotal : 0 };
    });
    const categories = [...new Set(products.map(product => product.category))];
    const categoryMix = categories.map(name => {
      const sold = sum(products.filter(product => product.category === name), 'sold');
      return { name, sold, share: soldTotal > 0 ? sold / soldTotal : 0 };
    });

    return {
      asOf, horizonEnd, lookbackStart, lookbackDays,
      onHandUnits: sum(rows, 'onHand'), onOrderUnits: sum(rows, 'onOrder'),
      dueSoonUnits: sum(rows, 'dueSoon'), overdueIncomingUnits: sum(rows, 'overdueIncoming'),
      forecastUnits: sum(rows, 'forecast'), projectedUnits: sum(rows, 'projected'),
      // These are disjoint risk counts. Add them for all positions needing replenishment.
      shortageCount: rows.filter(row => row.risk === 'Shortage').length,
      reorderCount: rows.filter(row => row.risk === 'Reorder').length,
      rows, history, products, categoryMix
    };
  }

  const planning = Object.freeze({ view });
  if (root) root.PSIPlanning = planning;
  if (typeof module !== 'undefined' && module.exports) module.exports = planning;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
