# Wendi Ji — portfolio

Wendi Ji's professional portfolio, published at [wendyj92.github.io](https://wendyj92.github.io/).

## Pages

- **[Overview](https://wendyj92.github.io/)** — capabilities, a professional Python/AI validation case, career timeline, and links to demonstrations and academic projects.
- **[Interactive dashboards](https://wendyj92.github.io/dashboards.html)** — project delivery risks and operations reporting, with filters and CSV downloads.
- **[Academic projects](https://wendyj92.github.io/academic.html)** — University of Exeter MSc coursework, methods, reported results, reflections and education.

The homepage separates professional practice, synthetic demonstrations and university coursework. Its existing `#work`, `#feobawave`, `#project-demo`, `#demo`, `#academic-project` and `#exeter` links remain valid; the project anchors now lead to previews with links to the detailed pages.

## Content and data

Professional experience is based on the supplied CVs. The FEOBAWAVE case describes using Python and LLM tools, identifying faulty store-exclusion logic, preserving historical sales relationships and assigning the latest representative. It makes no claim of training an AI model or measured time/cost savings. Employer datasets and code are not included.

Both interactive dashboards use synthetic data and are separate from professional experience. The project dashboard uses a fixed 30 September 2026 snapshot and calendar-day delays. Metrics follow the selected project; the status filter controls the chart, task table and CSV export.

The MSc project summarises MTHM017: Advanced Topics in Statistics. Figures come from the coursework report's printed R outputs and confusion matrices on pages 45–53 where prose differs (RBF SVM: 85.6%). These are results from one 750/250 train/test split, not a new benchmark or rerun. Methodological limitations and further development ideas are included. The original report and datasets are not bundled with the site.

## Visual design

A shared dark navy and teal palette, one system sans-serif font stack, and consistent heading, body and caption sizes across all three pages. Responsive layouts retain readable text instead of shrinking labels on mobile. No external font downloads are required.

## Preview and publishing

No build step or package installation is required. Serve the directory with a static web server or open `index.html` locally. Dashboard scripts are loaded only on `dashboards.html`; the overview and academic page work without JavaScript.

GitHub Pages publishes the `main` branch, folder `/ (root)`, with HTTPS enabled. Updates to that branch trigger deployment.
