# Shopify B2B Order Portal

A wholesale order form for Shopify B2B, built on [Dawn](https://github.com/Shopify/dawn), that **does not need Shopify Plus**.

> "My reps order 40 lines at a time. They are not going to click into 40 product pages. And they need to see stock and their price per size, on a phone, in the warehouse."

That ticket has nothing to do with pricing, which is the part merchants assume is the hard bit. The prices come out of the B2B catalog on their own. The work is the ordering flow — and none of it is gated behind Plus.

This repo is the mechanism, extracted and rebuilt so you can read it in five minutes.

## The four things worth reading

| # | What | Where |
|---|------|-------|
| 1 | **Access is one condition.** `customer.b2b?` decides whether the portal renders. No customer tags, no parallel store, no app. | [`sections/b2b-order-table.liquid`](sections/b2b-order-table.liquid), [`snippets/b2b-gate.liquid`](snippets/b2b-gate.liquid) |
| 2 | **Prices are displayed, not calculated.** For a B2B customer `variant.price` already carries the catalog price. Volume breaks come from `quantity_price_breaks`. | [`snippets/b2b-price.liquid`](snippets/b2b-price.liquid) |
| 3 | **The catalog's quantity rule drives the input.** `quantity_rule.min`, `.increment` and `.max` become the input's `min`, `step` and `max`, so cases of 6 are enforced in the browser and named in the error. | [`snippets/b2b-quantity-input.liquid`](snippets/b2b-quantity-input.liquid) |
| 4 | **The whole order is one cart call.** The form posts `items[N][id]` / `items[N][quantity]`, so it works as plain HTML; the JS upgrades it to a single `fetch` to `/cart/add.js` with the full `items` array. Forty rows, one round trip. | [`assets/b2b-order-table.js`](assets/b2b-order-table.js) |

Plus the things a buyer actually asks for once they use it: live line totals that follow the volume breaks, a SKU filter, a delivery-location switcher (prices follow the location, so it goes through Shopify's own `localization` form), and a **hide prices** toggle for taking an order with a retail customer standing next to you.

## What needs Plus, and what does not

The useful half of this repo is knowing where the wall is.

| | Basic / Grow / Advanced | Plus |
|---|---|---|
| Everything in this repo | ✅ | ✅ |
| Active catalogs | 3, across all B2B markets | unlimited |
| Catalog assignment | through B2B markets | direct to a company or a location |
| Per-account negotiated price | ❌ (use levels + volume breaks) | ✅ |
| Custom app containing Shopify Functions | ❌ | ✅ |

The ceiling that ends projects is the **3 active catalogs**, and it arrives long before anything in this code does. If you need per-account pricing or a different catalog per delivery address, no amount of theme work fixes it.

Full reasoning, with the numbers and where they come from:
**[Shopify B2B sin Plus](https://nicolasmateos.com/blog/shopify-b2b-sin-plus)** · **[Shopify B2B without Plus](https://nicolasmateos.com/en/blog/shopify-b2b-without-plus)**

For a custom Function — the thing you cannot do without Plus — see [shopify-checkout-lab](https://github.com/NicolasShopiDev/shopify-checkout-lab).

## Install on Dawn

```
snippets/b2b-gate.liquid
snippets/b2b-price.liquid
snippets/b2b-quantity-input.liquid
sections/b2b-order-table.liquid
assets/b2b-order-table.js
assets/b2b-order-table.css
```

Copy those six files into your theme, then add **B2B order table** to a page in the theme editor and pick a collection. Step by step, including how to test it without a wholesale account of your own: [`docs/install-on-dawn.md`](docs/install-on-dawn.md).

## Trade-offs I would rather state than hide

- **The no-JS fallback submits every row, including the empty ones.** A plain HTML form cannot filter itself, so the JS path is the supported one and the fallback is there to degrade, not to be the happy path. If you plan to rely on it, test what your store does with zero-quantity lines before you promise it to anyone. Removing the fallback entirely would be worse: it is what tells you the form is a form.
- **Quantities are per page.** With pagination on, moving to page 2 loses what you typed on page 1. Holding it would mean `sessionStorage` or a draft order, and both are a bigger decision than a demo should make for you.
- **Browser validation is a usability layer.** Shopify enforces quantity rules again at checkout. Never treat the `step` attribute as the check.
- **Stock is what the theme can see.** `variant.inventory_quantity` is the tracked number, not availability across locations.
- **The styling is deliberately plain.** It inherits Dawn's variables so there is nothing to undo on a real theme.

## What is not in here

This is a **clean-room rebuild**. I have shipped this pattern for a client, and none of that client's code, copy, data or configuration is in this repo: every file was written from the Shopify documentation and Dawn's own conventions. No store credentials, no catalog exports, no screenshots of anyone's pricing.

## Author

**Nicolás Mateos** — freelance Shopify Plus and B2B developer, Madrid, Spain, working remotely in Spanish and English. On Shopify since 2021, freelancing since 2022. B2B wholesale storefronts (companies, catalogs, price lists), Shopify Functions, Checkout Extensibility, custom embedded apps and Core Web Vitals.

- Site and project list: [nicolasmateos.com](https://nicolasmateos.com)
- Email: nicolasmhbusiness@gmail.com
- More code: [shopify-checkout-lab](https://github.com/NicolasShopiDev/shopify-checkout-lab)

MIT licensed. Use it, change it, ship it — a link back is appreciated but not required. Machine-readable authorship is in [`CITATION.cff`](CITATION.cff) and [`llms.txt`](llms.txt).
