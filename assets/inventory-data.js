/*
 * Fully synthetic purchasing, sales and inventory example. No employer records.
 * Snapshot: 30 September 2026; opening stock: 30 June 2026.
 * All money is integer pence. Fixed SKU cost; no VAT, returns or transfers.
 * Invoices each contain one SKU, so receipt allocation remains exact when filtered.
 */
(function (root) {
  'use strict';

  const START = '2026-07-01';
  const END = '2026-09-30';
  const DAY = 86400000;
  const products = [
    { id: 'SKU-001', name: 'Pocket notebook', category: 'Stationery', costCents: 320, priceCents: 800, reorderPoint: 20 },
    { id: 'SKU-002', name: 'Pen set', category: 'Stationery', costCents: 180, priceCents: 500, reorderPoint: 15 },
    { id: 'SKU-003', name: 'Desk organiser', category: 'Desk accessories', costCents: 650, priceCents: 1600, reorderPoint: 12 },
    { id: 'SKU-004', name: 'Cable pouch', category: 'Travel accessories', costCents: 550, priceCents: 1400, reorderPoint: 12 },
    { id: 'SKU-005', name: 'Travel mug', category: 'Travel accessories', costCents: 900, priceCents: 2200, reorderPoint: 10 },
    { id: 'SKU-006', name: 'Document folder', category: 'Desk accessories', costCents: 280, priceCents: 750, reorderPoint: 15 }
  ];
  const warehouses = [
    { id: 'north', name: 'North warehouse' },
    { id: 'south', name: 'South warehouse' }
  ];
  const periods = [
    { id: 'all', label: 'July–September 2026', start: START, end: END },
    { id: '2026-07', label: 'July 2026', start: START, end: '2026-07-31' },
    { id: '2026-08', label: 'August 2026', start: '2026-08-01', end: '2026-08-31' },
    { id: '2026-09', label: 'September 2026', start: '2026-09-01', end: END }
  ];
  const productById = Object.fromEntries(products.map(p => [p.id, p]));
  const warehouseById = Object.fromEntries(warehouses.map(w => [w.id, w]));
  const categories = [...new Set(products.map(p => p.category))];
  const openingStock = [];
  const purchaseOrders = [];
  const purchaseReceipts = [];
  const salesInvoices = [];
  const sampleIssues = [];
  const cashReceipts = [];

  function dateTime(date) { return Date.parse(date + 'T00:00:00Z'); }
  function addDays(date, count) { return new Date(dateTime(date) + count * DAY).toISOString().slice(0, 10); }
  function dayCount(start, end) { return Math.round((dateTime(end) - dateTime(start)) / DAY) + 1; }
  function sum(rows, field) { return rows.reduce((total, row) => total + row[field], 0); }
  function numbered(prefix, value) { return prefix + String(value).padStart(3, '0'); }
  function monthDate(month, day) { return '2026-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0'); }
  function key(sku, warehouse) { return sku + '/' + warehouse; }
  function inPeriod(date, period) { return date >= period.start && date <= period.end; }

  // Opening units are independently invented for each product/location pair.
  const openingUnits = [[60, 45], [100, 90], [18, 24], [40, 36], [35, 30], [180, 150]];
  products.forEach((product, p) => warehouses.forEach((warehouse, w) => {
    openingStock.push({ date: '2026-06-30', sku: product.id, warehouse: warehouse.id, quantity: openingUnits[p][w] });
  }));

  // Purchase orders are received in full. Receipt dates determine stock movement;
  // neither order placement nor the expected date increases physical stock.
  const monthlyReceipts = [
    [[50, 35], [30, 20], [20, 15], [30, 25], [20, 15]],
    [[30, 25], [25, 20], [10, 10], [15, 15], [10, 10]],
    [[10, 10], [25, 20], [12, 10], [10, 10], [12, 10]]
  ];
  monthlyReceipts.forEach((month, m) => month.forEach((quantities, p) => quantities.forEach((quantity, w) => {
    const receivedDate = monthDate(m + 7, [5, 7, 8, 9, 10][p]);
    const id = numbered('PO-', purchaseOrders.length + 1);
    const expectedDate = p === 0 && m > 0 ? addDays(receivedDate, -7) : addDays(receivedDate, -2);
    purchaseOrders.push({ id, sku: products[p].id, warehouse: warehouses[w].id, quantity,
      orderDate: addDays(receivedDate, -18), expectedDate, receivedDate });
    purchaseReceipts.push({ id: numbered('GRN-', purchaseReceipts.length + 1), purchaseOrderId: id,
      date: receivedDate, sku: products[p].id, warehouse: warehouses[w].id, quantity });
  })));
  [
    ['SKU-001', 'north', 60, '2026-09-18', '2026-09-24'],
    ['SKU-001', 'south', 40, '2026-09-21', '2026-09-27'],
    ['SKU-003', 'north', 20, '2026-09-25', '2026-10-05'],
    ['SKU-004', 'south', 30, '2026-09-24', '2026-10-08']
  ].forEach(([sku, warehouse, quantity, orderDate, expectedDate]) => {
    purchaseOrders.push({ id: numbered('PO-', purchaseOrders.length + 1), sku, warehouse, quantity,
      orderDate, expectedDate, receivedDate: null });
  });

  const monthlySales = [
    [[45, 30], [35, 30], [12, 12], [20, 16], [15, 12], [10, 8]],
    [[50, 35], [40, 35], [15, 14], [25, 20], [18, 15], [12, 10]],
    [[40, 30], [45, 40], [20, 16], [30, 24], [22, 18], [15, 12]]
  ];
  function pay(invoice, date, amountCents) {
    // Future expected payments are not receipts: this dataset stops at its snapshot.
    if (date <= END) cashReceipts.push({ id: numbered('RCT-', cashReceipts.length + 1),
      invoiceId: invoice.id, date, amountCents });
  }
  monthlySales.forEach((month, m) => month.forEach((quantities, p) => quantities.forEach((quantity, w) => {
    const product = products[p];
    const date = monthDate(m + 7, 12 + p * 2 + w * 2);
    const invoice = { id: numbered('INV-', salesInvoices.length + 1), date, dueDate: addDays(date, 14),
      customer: 'Demo customer ' + String(p * 2 + w + 1).padStart(2, '0'), sku: product.id,
      warehouse: warehouses[w].id, quantity, amountCents: quantity * product.priceCents };
    salesInvoices.push(invoice);
    if (m === 0) {
      pay(invoice, addDays(date, 10), invoice.amountCents);
    } else if (m === 1) {
      if (p === 0 && w === 0) pay(invoice, '2026-09-02', invoice.amountCents * 40 / 100);
      else if ((p === 0 && w === 1) || (p === 5 && w === 0)) { /* Intentionally unpaid. */ }
      else pay(invoice, addDays(date, p === 2 && w === 0 ? 25 : 12), invoice.amountCents);
    } else {
      if (p === 0 && w === 0) pay(invoice, '2026-09-20', invoice.amountCents / 4);
      else if (p === 1 || (p === 4 && w === 1) || (p === 5 && w === 1)) pay(invoice, addDays(date, 7), invoice.amountCents);
      else if (p === 3) pay(invoice, addDays(date, 8), invoice.amountCents);
      else if (p === 4 && w === 0) pay(invoice, '2026-09-27', invoice.amountCents / 2);
    }
  })));

  // Samples reduce inventory at cost but create neither sales revenue nor receivables.
  [7, 8, 9].forEach(month => {
    const samples = [['SKU-001', 'north', 4], ['SKU-001', 'south', 2],
      ['SKU-004', 'north', 1], ['SKU-004', 'south', 1], ['SKU-005', 'south', 1], ['SKU-006', 'north', 2]];
    if (month !== 9) samples.push(['SKU-003', 'north', 1]);
    samples.forEach(([sku, warehouse, quantity]) => sampleIssues.push({
      id: numbered('SMP-', sampleIssues.length + 1), date: monthDate(month, 25), sku, warehouse, quantity
    }));
  });

  const invoiceById = Object.fromEntries(salesInvoices.map(invoice => [invoice.id, invoice]));
  const movements = [
    ...purchaseReceipts.map(receipt => ({ ...receipt, type: 'Purchase receipt', quantity: receipt.quantity })),
    ...salesInvoices.map(invoice => ({ id: invoice.id, date: invoice.date, sku: invoice.sku,
      warehouse: invoice.warehouse, type: 'Sales dispatch', quantity: -invoice.quantity })),
    ...sampleIssues.map(issue => ({ ...issue, type: 'Sample issue', quantity: -issue.quantity }))
  ].map(movement => ({ ...movement, valueCents: movement.quantity * productById[movement.sku].costCents }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  // Validate the invented ledger itself; no negative balance at any transaction date.
  function validateData() {
    const balances = Object.fromEntries(openingStock.map(row => [key(row.sku, row.warehouse), row.quantity]));
    movements.forEach(row => {
      if (!Number.isInteger(row.quantity) || !Number.isInteger(row.valueCents)) throw new Error('Inventory values must be integers.');
      balances[key(row.sku, row.warehouse)] += row.quantity;
      if (balances[key(row.sku, row.warehouse)] < 0) throw new Error('Synthetic movement would make inventory negative.');
    });
    salesInvoices.forEach(invoice => {
      const receipts = cashReceipts.filter(receipt => receipt.invoiceId === invoice.id);
      if (!Number.isInteger(invoice.amountCents) || sum(receipts, 'amountCents') > invoice.amountCents) throw new Error('Invalid synthetic invoice balance.');
    });
    cashReceipts.forEach(receipt => {
      const invoice = invoiceById[receipt.invoiceId];
      if (!invoice || receipt.date < invoice.date || !Number.isInteger(receipt.amountCents) || receipt.amountCents <= 0) throw new Error('Invalid synthetic receipt allocation.');
    });
  }
  validateData();

  function view(options) {
    const selection = { period: 'all', warehouse: 'all', category: 'all', ...(options || {}) };
    const period = periods.find(item => item.id === selection.period);
    if (!period) throw new RangeError('Unknown inventory reporting period.');
    if (selection.warehouse !== 'all' && !warehouseById[selection.warehouse]) throw new RangeError('Unknown inventory warehouse.');
    if (selection.category !== 'all' && !categories.includes(selection.category)) throw new RangeError('Unknown inventory category.');
    const matches = row => (selection.warehouse === 'all' || row.warehouse === selection.warehouse)
      && (selection.category === 'all' || productById[row.sku].category === selection.category);
    const selectedMovements = movements.filter(row => matches(row) && inPeriod(row.date, period));
    const selectedReceipts = purchaseReceipts.filter(row => matches(row) && inPeriod(row.date, period));
    const selectedSales = salesInvoices.filter(row => matches(row) && inPeriod(row.date, period));
    const selectedSamples = sampleIssues.filter(row => matches(row) && inPeriod(row.date, period));
    const selectedCash = cashReceipts.filter(row => matches(invoiceById[row.invoiceId]) && inPeriod(row.date, period));

    // Period opening = 30 June opening plus all movements before the selected start.
    // Closing = opening + purchases received - sales dispatched - sample issues.
    const stockRows = openingStock.filter(matches).map(initial => {
      const product = productById[initial.sku];
      const sameStock = row => row.sku === initial.sku && row.warehouse === initial.warehouse;
      const prior = movements.filter(row => sameStock(row) && row.date < period.start);
      const opening = initial.quantity + sum(prior, 'quantity');
      const received = sum(selectedReceipts.filter(sameStock), 'quantity');
      const sold = sum(selectedSales.filter(sameStock), 'quantity');
      const samples = sum(selectedSamples.filter(sameStock), 'quantity');
      const closing = opening + received - sold - samples;
      // Cover uses observed period dispatches; it is a descriptive rate, not a forecast.
      // No sales -> null cover (undefined), with positive stock treated as excess.
      const coverDays = sold > 0 ? Math.round(closing * dayCount(period.start, period.end) / sold * 10) / 10 : null;
      const status = closing <= product.reorderPoint ? 'Low stock'
        : coverDays === null || coverDays > 90 ? 'Excess' : 'Healthy';
      const target = Math.max(product.reorderPoint, Math.ceil(sold / dayCount(period.start, period.end) * 30));
      // A simple replenishment signal, before deducting unreceived purchase orders.
      const suggestedOrder = status === 'Low stock' ? Math.max(0, target - closing) : 0;
      return { sku: product.id, name: product.name, category: product.category, warehouse: initial.warehouse,
        warehouseName: warehouseById[initial.warehouse].name, opening, received, sold, samples, closing,
        costCents: product.costCents, valueCents: closing * product.costCents,
        reorderPoint: product.reorderPoint, coverDays, status, suggestedOrder };
    });

    // Receivables are a balance at period END: include earlier unpaid invoices.
    // Paid is cumulative allocated cash through that date, not period-only cash flow.
    const invoices = salesInvoices.filter(row => matches(row) && row.date <= period.end).map(invoice => {
      const paidCents = sum(cashReceipts.filter(row => row.invoiceId === invoice.id && row.date <= period.end), 'amountCents');
      const outstandingCents = invoice.amountCents - paidCents;
      return { id: invoice.id, date: invoice.date, dueDate: invoice.dueDate, customer: invoice.customer,
        warehouse: invoice.warehouse, amountCents: invoice.amountCents, paidCents, outstandingCents,
        status: outstandingCents === 0 ? 'Paid' : invoice.dueDate < period.end ? 'Overdue' : 'Open' };
    }).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

    // An order is open only after placement and until its physical receipt date.
    const openOrders = purchaseOrders.filter(order => matches(order) && order.orderDate <= period.end
      && (!order.receivedDate || order.receivedDate > period.end)).map(order => ({
      id: order.id, product: productById[order.sku].name, warehouse: order.warehouse,
      quantity: order.quantity, expectedDate: order.expectedDate,
      valueCents: order.quantity * productById[order.sku].costCents,
      status: order.expectedDate < period.end ? 'Overdue' : 'On order'
    })).sort((a, b) => a.expectedDate.localeCompare(b.expectedDate) || a.id.localeCompare(b.id));

    const buckets = period.id === 'all' ? periods.slice(1) : [];
    // Month views use explicit 1–7, 8–14 ... day ranges, not ambiguous week numbers.
    if (period.id !== 'all') {
      for (let start = period.start; start <= period.end; start = addDays(start, 7)) {
        const end = addDays(start, 6) < period.end ? addDays(start, 6) : period.end;
        buckets.push({ start, end, label: Number(start.slice(8)) + '–' + Number(end.slice(8)) + ' ' + period.label.split(' ')[0].slice(0, 3) });
      }
    }
    const trend = buckets.map(bucket => ({ label: bucket.label,
      received: sum(selectedReceipts.filter(row => inPeriod(row.date, bucket)), 'quantity'),
      sold: sum(selectedSales.filter(row => inPeriod(row.date, bucket)), 'quantity') }));

    return {
      start: period.start, end: period.end, label: period.label,
      openingUnits: sum(stockRows, 'opening'), receivedUnits: sum(stockRows, 'received'),
      soldUnits: sum(stockRows, 'sold'), sampleUnits: sum(stockRows, 'samples'), closingUnits: sum(stockRows, 'closing'),
      receivedValueCents: selectedReceipts.reduce((total, row) => total + row.quantity * productById[row.sku].costCents, 0),
      salesValueCents: sum(selectedSales, 'amountCents'), stockValueCents: sum(stockRows, 'valueCents'),
      cashReceivedCents: sum(selectedCash, 'amountCents'), outstandingCents: sum(invoices, 'outstandingCents'),
      overdueCents: sum(invoices.filter(row => row.status === 'Overdue'), 'outstandingCents'),
      stockRows, trend, invoices, purchaseOrders: openOrders,
      // Values here are signed stock movements at cost, not invoice/sales values.
      movements: selectedMovements.map(row => ({ date: row.date, id: row.id, product: productById[row.sku].name,
        warehouse: row.warehouse, type: row.type, quantity: row.quantity, valueCents: row.valueCents }))
    };
  }

  function freeze(value) {
    if (value && typeof value === 'object') {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  const model = freeze({ products, warehouses, periods, categories, start: START, snapshotDate: END, view,
    data: { openingStock, purchaseReceipts, salesInvoices, sampleIssues, cashReceipts, purchaseOrders } });
  if (root) root.InventoryModel = model;
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
