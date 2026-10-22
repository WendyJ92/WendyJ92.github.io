# Wendi Ji — portfolio

Wendi Ji's professional portfolio, published at [wendyj92.github.io](https://wendyj92.github.io/).

## Pages

- **[Overview](https://wendyj92.github.io/)** — a personalised profile, project-folder cards, technical skills, a career timeline and education.
- **[Interactive dashboards](https://wendyj92.github.io/dashboards.html)** — project delivery risks and operations reporting, with filters and CSV downloads.
- **[PSI performance dashboard](https://wendyj92.github.io/inventory.html)** — a dedicated purchase, sales and inventory demonstration, extended from the structure of an Excel reporting workbook. Includes sales and stock trends, product mix, a 30-day demand baseline, replenishment priorities, stock movements, incoming orders, receivables and scoped CSV exports.
- **[Academic projects](https://wendyj92.github.io/academic.html)** — University of Exeter MSc coursework, methods, reported results, reflections and education.

The homepage separates professional case studies, synthetic demonstrations and university coursework. Each project has a directory under `projects/`, with its own `index.html` overview and `README.md`; overview pages link to the existing interactive reports or academic write-up. Its existing `#work`, `#feobawave`, `#project-demo`, `#demo`, `#academic-project` and `#exeter` links remain valid; the project anchors now lead to previews with links to the detailed pages.

## Content and data

Professional experience is based on the supplied CVs. The FEOBAWAVE case describes using Python and LLM tools, identifying faulty store-exclusion logic, preserving historical sales relationships and assigning the latest representative. It makes no claim of training an AI model or measured time/cost savings. Employer datasets and code are not included.

All interactive dashboards use synthetic data and are separate from professional experience. The project dashboard uses a fixed 30 September 2026 snapshot and calendar-day delays. Metrics follow the selected project; the status filter controls the chart, task table and CSV export.

The MSc project summarises MTHM017: Advanced Topics in Statistics. Figures come from the coursework report's printed R outputs and confusion matrices on pages 45–53 where prose differs (RBF SVM: 85.6%). These are results from one 750/250 train/test split, not a new benchmark or rerun. Methodological limitations and further development ideas are included. The original report and datasets are not bundled with the site.

## Visual design

A light professional palette uses Deep Navy (`#14263D`) for headings, Professional Blue (`#2563EB`) for links and primary buttons, and Muted Teal (`#0F766E`) for analysis highlights and charts. The main background is White (`#FFFFFF`); content panels use Light Grey (`#F1F5F9`). Warning states retain distinct, readable colours.

The homepage uses a navy profile banner, a WJ monogram and a small Newcastle-inspired bridge illustration. Two-column project cards have individual outline icons and link to their existing project folders; academic work remains separate. The layout becomes a single column on narrow screens. Contact currently links to the verified GitHub profile. All pages share the same palette and system sans-serif font stack, with no external font download. Page-specific CSS handles layout, while shared colour tokens live in `assets/style.css`. The PSI project preview is a screenshot of the working light-theme dashboard.

## Preview and publishing

No build step or package installation is required. Serve the directory with a static web server or open `index.html` locally. Dashboard scripts are loaded only on `dashboards.html` and `inventory.html`; the overview and academic page work without JavaScript.

GitHub Pages publishes the `main` branch, folder `/ (root)`, with HTTPS enabled. Updates to that branch trigger deployment.

## PSI performance demonstration

All inventory products, customers, orders and figures are newly invented. The original Excel file, its records and embedded assets are not included. The web demonstration extends the workbook concept; linked receivables, calculated closing balances, demand estimates and replenishment planning are portfolio additions, not claims about the original workbook. This is an HTML/JavaScript demonstration, not a Power BI report or PBIX deliverable.

The fixed dataset covers July–September 2026 with opening stock on 30 June. Warehouse and category filters apply to every view; period filters control transaction flows and the closing snapshot. Stock equals opening plus purchase receipts minus sales dispatches and samples. Prices exclude VAT and inventory uses fixed SKU costs. Open purchase orders do not increase stock before receipt. Outstanding invoices include earlier balances and deduct only payments received by the selected end date. Collections are a separate period cash flow. Returns, transfers, reservations and supplier payments are outside the model.

The historical stock ledger labels on-hand stock at or below its reorder point as Low stock; otherwise cover above 90 days or stock without period sales is Excess. Historical cover uses the selected period's sales rate. Stock-table search and status filters affect that table and its CSV only.

The planning layer uses trailing 30 observed calendar days at the selected period end, including zero-sale days. Each SKU–warehouse forecast is rounded up before totals are aggregated. It is a simple daily-sales baseline projected over the next 30 days, not a trained or accuracy-tested forecast. No future sales or actual receipt timing informs it. Expected receipts include only orders placed and unreceived at the snapshot with an expected date strictly after the snapshot and no later than 30 days after it. Unreceived orders due on or before the snapshot remain excluded until an ETA is confirmed. Open orders do not imply goods are in transit.

Projected net stock equals on-hand stock plus eligible expected receipts minus baseline demand. Negative values indicate unmet demand. Shortage means projected units < 0; Reorder means 0 ≤ projected units < reorder point. Suggested order units = max(0, reorder point − projected units). Otherwise, >90 days of trailing demand coverage or positive stock with no recent sales is Excess. This is an end-of-horizon signal: intra-period availability, sample demand, returns, reservations, supplier lead times and minimum order quantities are not modelled. The planning-table status filter affects that table and its CSV only; global metrics continue to cover the selected warehouse/category scope.

The dashboard separates stock balances and sales flows into aligned charts with independent labelled scales, accessible data tables and keyboard-focusable intervals. Product analysis switches between units and revenue and links to the stock ledger. Six CSV exports identify synthetic origin and dates; planning exports also include the forecast horizon, lookback and calculation inputs.

The implementation is buildless and dependency-free: `inventory-data.js` contains the unchanged synthetic ledger; `psi-planning.js` adds time-scoped planning calculations; `psi-report.js` renders the report overview; `inventory.js` handles detail views and exports. The default September snapshot closes at 486 units and £1,716 inventory value, with £2,110.50 outstanding receivables (£1,090 overdue). Planning uses 50 expected receipt units and 312 baseline demand units to reach 224 projected net units; four individual positions have projected shortages and four more fall below their reorder points. A positive aggregate does not remove SKU-level shortages.

## Project folders

- [`projects/inventory-sales/`](projects/inventory-sales/) — inventory and sales forecasting demonstration.
- [`projects/data-quality/`](projects/data-quality/) — professional Python data-quality case.
- [`projects/payment-reconciliation/`](projects/payment-reconciliation/) — professional payment reconciliation case.
- [`projects/project-delivery/`](projects/project-delivery/) — synthetic project delivery dashboard.
- [`projects/operations-reporting/`](projects/operations-reporting/) — synthetic monthly operations reporting.
- [`projects/academic-statistics/`](projects/academic-statistics/) — MSc Bayesian inference and classification coursework.

The existing `inventory.html`, `dashboards.html` and `academic.html` addresses remain available. Work case studies describe the supplied CV experience; employer data and code are not included. The homepage and folder overviews do not require JavaScript.
