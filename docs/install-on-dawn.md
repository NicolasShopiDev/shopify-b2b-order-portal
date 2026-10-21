# Install on Dawn

Tested against Dawn 15. Nothing here is Dawn-specific except the CSS variable names, so any Online Store 2.0 theme works; on a non-Dawn theme the portal will inherit your own type and colours once you point `--b2b-border` at something that exists.

## 1. Copy the files

| From | To |
|------|-----|
| `snippets/b2b-gate.liquid` | `snippets/` |
| `snippets/b2b-price.liquid` | `snippets/` |
| `snippets/b2b-quantity-input.liquid` | `snippets/` |
| `sections/b2b-order-table.liquid` | `sections/` |
| `assets/b2b-order-table.js` | `assets/` |
| `assets/b2b-order-table.css` | `assets/` |

No changes to `theme.liquid`, no changes to `settings_schema.json`, nothing to remove. The section loads its own CSS and JS.

## 2. Add the section

1. **Online Store → Pages**, create a page (for example `wholesale`) and give it a template suffix, or just use an existing page template.
2. Open the theme editor on that page and **Add section → B2B order table**.
3. Pick the collection the portal should order from. Without a collection the section renders a one-line reminder instead of an empty table.
4. Turn the columns and tools on or off: SKU, stock, volume prices, SKU filter, hide-prices button.

## 3. Make sure there is something to show

The portal renders only for a customer where `customer.b2b?` is true. The prices and rules it displays come from the catalog, so an empty catalog shows retail prices with no rules and the demo looks broken when it is working correctly.

In a development store:

1. **Settings → Markets**, create a **B2B market**.
2. **Customers → Companies**, create a company, give it a location, and attach a customer to it.
3. **Products → Catalogs**, create a B2B catalog for that market. Set a percentage adjustment or per-variant prices.
4. On the catalog, add **quantity rules** (minimum 6, increment 6) and **volume prices** (a break at 24, another at 48) to at least one product. These are the two features people assume need Plus; they do not.
5. Sign in as the company's customer and open the page.

If you only ever test as yourself, you will see the gate. That is the gate working.

## 4. What to check

| Check | Expected |
|-------|----------|
| Signed out | Gate with a sign-in link |
| Signed in, retail account | Gate saying the account is not a wholesale account |
| Signed in, B2B account | The table, with catalog prices |
| A product with a quantity rule | Input shows `min 6 · in 6s`, and `step` is 6 |
| Type 7 in that input | Row turns red, footer says *multiples of 6*, submit refuses |
| A product with volume prices | Breaks listed under the price; line total drops when you cross one |
| Fill 3 rows, submit | One request in the network tab, three lines in the cart |
| Company with 2+ locations | **Deliver to** selector; changing it reloads with that location's prices |
| Hide prices | Price and total columns go blank, button says *Show prices*, survives a reload |
| JavaScript disabled | Submit still posts to `/cart/add` and lands on the cart |
| Phone width | Rows become cards with the column name in front of each value |

## 5. Where it will need work on a real store

- **More than one collection.** The section takes one. For a catalog with several families, add the section more than once, or swap the collection setting for a list of collections.
- **Keeping quantities across pages.** See the trade-offs in the README.
- **Translations.** Strings are inline English so the files are portable. On a real theme move them into `locales/` and use `t` filters.
- **Order minimums per company.** Not here: that is a cart-level rule, and on Basic, Grow or Advanced a custom Function is not an option. A public App Store app, or a theme-level check that you treat as advisory, are the two honest routes.
