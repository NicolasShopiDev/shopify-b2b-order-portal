/**
 * b2b-order-table.js
 *
 * Upgrades the wholesale order form from a plain HTML POST to a single fetch.
 *
 * The form in b2b-order-table.liquid already works without this file: it posts
 * `items[N][id]` and `items[N][quantity]` to /cart/add and the browser follows the
 * redirect to the cart. What this adds is what a buyer filling in forty rows
 * actually needs: live line totals that respect the catalog's volume breaks, the
 * quantity rule checked before anything is sent, per-row errors instead of one
 * generic failure, and staying on the page.
 *
 * No dependencies. Safe to load twice.
 *
 * Author: Nicolás Mateos · https://nicolasmateos.com · MIT licensed, credit appreciated.
 */
(function () {
  'use strict';

  var MONEY_FALLBACK = 'EUR';

  function parseIntOr(value, fallback) {
    var parsed = parseInt(value, 10);
    return isNaN(parsed) ? fallback : parsed;
  }

  /**
   * Reads the volume breaks a row renders, highest minimum first, so the first
   * match for a quantity is the right price.
   */
  function readBreaks(row) {
    var nodes = row.querySelectorAll('[data-b2b-break-min]');
    var breaks = [];

    for (var i = 0; i < nodes.length; i += 1) {
      breaks.push({
        min: parseIntOr(nodes[i].getAttribute('data-b2b-break-min'), 0),
        price: parseIntOr(nodes[i].getAttribute('data-b2b-break-price'), 0)
      });
    }

    return breaks.sort(function (a, b) {
      return b.min - a.min;
    });
  }

  function OrderTable(form) {
    this.form = form;
    this.rows = Array.prototype.slice.call(form.querySelectorAll('[data-b2b-row]'));
    this.status = form.querySelector('[data-b2b-status]');
    this.submit = form.querySelector('[data-b2b-submit]');
    this.totalUnits = form.querySelector('[data-b2b-total-units]');
    this.totalPrice = form.querySelector('[data-b2b-total-price]');

    this.money = this.buildFormatter(form.getAttribute('data-b2b-currency'));
    this.rowData = this.rows.map(this.describeRow, this);

    this.bind();
    this.recalculate();
  }

  OrderTable.prototype.buildFormatter = function (currency) {
    var code = currency || MONEY_FALLBACK;

    try {
      return new Intl.NumberFormat(document.documentElement.lang || undefined, {
        style: 'currency',
        currency: code
      });
    } catch (error) {
      // An unexpected currency code should not take the whole table down.
      return { format: function (amount) { return amount.toFixed(2) + ' ' + code; } };
    }
  };

  OrderTable.prototype.describeRow = function (row) {
    var input = row.querySelector('[data-b2b-qty]');
    var unitNode = row.querySelector('[data-b2b-unit-price]');

    return {
      row: row,
      input: input,
      lineTotal: row.querySelector('[data-b2b-line-total]'),
      unitPrice: unitNode ? parseIntOr(unitNode.getAttribute('data-b2b-unit-price'), 0) : 0,
      breaks: readBreaks(row),
      min: input ? parseIntOr(input.getAttribute('data-b2b-rule-min'), 1) : 1,
      increment: input ? parseIntOr(input.getAttribute('data-b2b-rule-increment'), 1) : 1,
      max: input && input.hasAttribute('data-b2b-rule-max')
        ? parseIntOr(input.getAttribute('data-b2b-rule-max'), null)
        : null,
      variantId: input ? input.getAttribute('data-b2b-variant-id') : null
    };
  };

  /** The unit price for a quantity, after the catalog's volume breaks. */
  OrderTable.prototype.priceFor = function (data, quantity) {
    for (var i = 0; i < data.breaks.length; i += 1) {
      if (quantity >= data.breaks[i].min) return data.breaks[i].price;
    }
    return data.unitPrice;
  };

  /** Returns null when the quantity is valid, or the reason it is not. */
  OrderTable.prototype.validate = function (data, quantity) {
    if (quantity === 0) return null;
    if (quantity < data.min) return 'minimum ' + data.min;
    if (data.max !== null && quantity > data.max) return 'maximum ' + data.max;
    if (data.increment > 1 && quantity % data.increment !== 0) {
      return 'multiples of ' + data.increment;
    }
    return null;
  };

  OrderTable.prototype.bind = function () {
    var self = this;

    this.form.addEventListener('input', function (event) {
      if (event.target.hasAttribute && event.target.hasAttribute('data-b2b-qty')) {
        self.recalculate();
      }
    });

    this.form.addEventListener('submit', function (event) {
      event.preventDefault();
      self.send();
    });

    var search = document.querySelector('[data-b2b-search]');
    if (search) {
      search.addEventListener('input', function () {
        self.filter(search.value);
      });
    }

    var toggle = document.querySelector('[data-b2b-toggle-prices]');
    if (toggle) {
      this.restorePriceVisibility(toggle);
      toggle.addEventListener('click', function () {
        self.togglePrices(toggle);
      });
    }

    // Changing the delivery location reloads with a different catalog, so it has
    // to go through Shopify's own localization form rather than fetch.
    var location = document.querySelector('[data-b2b-location]');
    if (location) {
      location.addEventListener('change', function () {
        location.form.submit();
      });
    }
  };

  OrderTable.prototype.recalculate = function () {
    var units = 0;
    var total = 0;

    for (var i = 0; i < this.rowData.length; i += 1) {
      var data = this.rowData[i];
      if (!data.input) continue;

      var quantity = parseIntOr(data.input.value, 0);
      if (quantity < 0) quantity = 0;

      var problem = this.validate(data, quantity);
      var lineTotal = quantity * this.priceFor(data, quantity);

      data.row.classList.toggle('b2b-row--invalid', problem !== null);
      data.input.setAttribute('aria-invalid', problem !== null ? 'true' : 'false');

      if (data.lineTotal) {
        data.lineTotal.textContent = this.money.format(lineTotal / 100);
      }

      if (problem === null) {
        units += quantity;
        total += lineTotal;
      }
    }

    if (this.totalUnits) this.totalUnits.textContent = String(units);
    if (this.totalPrice) this.totalPrice.textContent = this.money.format(total / 100);
    if (this.submit) this.submit.disabled = units === 0;
  };

  OrderTable.prototype.collect = function () {
    var items = [];
    var problems = [];

    for (var i = 0; i < this.rowData.length; i += 1) {
      var data = this.rowData[i];
      if (!data.input) continue;

      var quantity = parseIntOr(data.input.value, 0);
      if (quantity <= 0) continue;

      var problem = this.validate(data, quantity);
      if (problem) {
        problems.push(this.rowLabel(data) + ': ' + problem);
        continue;
      }

      items.push({ id: Number(data.variantId), quantity: quantity });
    }

    return { items: items, problems: problems };
  };

  OrderTable.prototype.rowLabel = function (data) {
    var sku = data.row.querySelector('.b2b-row__sku');
    var variant = data.row.querySelector('.b2b-row__variant');
    if (sku && sku.textContent.trim() !== '' && sku.textContent.trim() !== '—') {
      return sku.textContent.trim();
    }
    return variant ? variant.textContent.trim() : 'Row';
  };

  OrderTable.prototype.send = function () {
    var self = this;
    var collected = this.collect();

    if (collected.problems.length > 0) {
      this.say('Check these rows: ' + collected.problems.join('; '), true);
      return;
    }

    if (collected.items.length === 0) {
      this.say('Enter a quantity first.', true);
      return;
    }

    this.setBusy(true);
    this.say('Adding ' + collected.items.length + ' lines…', false);

    // One request for the whole order. /cart/add.js takes the full items array,
    // so forty rows cost one round trip and either all land or none do.
    fetch(window.Shopify && window.Shopify.routes
      ? window.Shopify.routes.root + 'cart/add.js'
      : '/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ items: collected.items })
    })
      .then(function (response) {
        return response.json().then(function (body) {
          if (!response.ok) throw new Error(body.description || body.message || 'Cart error');
          return body;
        });
      })
      .then(function () {
        self.say('Added. Your cart is ready.', false);
        self.reset();
        document.dispatchEvent(new CustomEvent('b2b:order-added', {
          detail: { items: collected.items }
        }));
      })
      .catch(function (error) {
        // Shopify's own message is more useful than anything invented here:
        // it names the variant and the rule that rejected it.
        self.say(error.message, true);
      })
      .finally(function () {
        self.setBusy(false);
      });
  };

  OrderTable.prototype.reset = function () {
    for (var i = 0; i < this.rowData.length; i += 1) {
      if (this.rowData[i].input) this.rowData[i].input.value = '0';
    }
    this.recalculate();
  };

  OrderTable.prototype.setBusy = function (busy) {
    if (!this.submit) return;
    this.submit.disabled = busy;
    this.submit.setAttribute('aria-busy', busy ? 'true' : 'false');
  };

  OrderTable.prototype.say = function (message, isError) {
    if (!this.status) return;
    this.status.textContent = message;
    this.status.classList.toggle('b2b-order-table__status--error', Boolean(isError));
  };

  OrderTable.prototype.filter = function (term) {
    var needle = term.trim().toLowerCase();

    for (var i = 0; i < this.rows.length; i += 1) {
      var haystack = this.rows[i].getAttribute('data-b2b-haystack') || '';
      var hit = needle === '' || haystack.indexOf(needle) !== -1;
      this.rows[i].hidden = !hit;
    }

    // A product whose every row is filtered out should not leave a stray heading.
    var groups = this.form.querySelectorAll('[data-b2b-group]');
    for (var g = 0; g < groups.length; g += 1) {
      var visible = groups[g].querySelectorAll('[data-b2b-row]:not([hidden])');
      groups[g].hidden = visible.length === 0;
    }
  };

  // The class goes on the document element, not the form, because the inline
  // script in the section sets it before the form has been parsed. The button's
  // label is handled in CSS, so there is no text to swap here.
  OrderTable.prototype.togglePrices = function (toggle) {
    var hidden = document.documentElement.classList.toggle('b2b-prices-hidden');
    toggle.setAttribute('aria-pressed', hidden ? 'true' : 'false');

    try {
      window.localStorage.setItem('b2b-prices-hidden', hidden ? '1' : '0');
    } catch (error) {
      // Private browsing or blocked storage. The toggle still works for this visit.
    }
  };

  // Nothing to restore: the inline script already applied the stored state before
  // first paint. This only makes the button's accessible state match the screen.
  OrderTable.prototype.restorePriceVisibility = function (toggle) {
    var hidden = document.documentElement.classList.contains('b2b-prices-hidden');
    toggle.setAttribute('aria-pressed', hidden ? 'true' : 'false');
  };

  function init() {
    var forms = document.querySelectorAll('[data-b2b-order-form]');

    for (var i = 0; i < forms.length; i += 1) {
      if (forms[i].dataset.b2bReady === '1') continue;
      forms[i].dataset.b2bReady = '1';
      new OrderTable(forms[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // The theme editor re-renders sections without reloading the page.
  document.addEventListener('shopify:section:load', init);
})();
