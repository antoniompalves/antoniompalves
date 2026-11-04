# Forge Labs — demo storefront

Static store (HTML/CSS/JS, no build step). Layout follows the "Prime Peptide" orange design reference;
catalog structure (categories, best sellers, new arrivals, EUR prices, promos, 5/10-unit bulk discounts)
was taken from a Firecrawl scrape of the reference store.

Open `index.html` in a browser, or serve it: `npx serve store`.

- `products.js` — catalog data (edit to add products)
- `app.js` — rendering, filters/search, product detail, cart drawer (localStorage)
- `styles.css` — design tokens and responsive layout

Checkout is a demo only; no payments are processed.
