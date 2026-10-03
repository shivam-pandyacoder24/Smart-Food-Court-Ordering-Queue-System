'use strict';

/**
 * The Menu page: category tree, search box, sort control and the list of dishes.
 */

const MenuView = {
  /** Runs once: fills the sort menu and connects the search controls. */
  setup(app, onChange) {
    const sortSelect = document.getElementById('sort-select');
    for (const [value, option] of Object.entries(SORT_OPTIONS)) {
      sortSelect.append(h('option', { value }, option.label));
    }
    sortSelect.value = app.filters.sortBy;
    sortSelect.addEventListener('change', () => {
      app.filters.sortBy = sortSelect.value;
      onChange();
    });

    const vegOnly = document.getElementById('veg-only');
    vegOnly.addEventListener('change', () => {
      app.filters.vegOnly = vegOnly.checked;
      onChange();
    });

    document.getElementById('menu-tools').addEventListener('submit', (event) => event.preventDefault());
    this.setupSearch(app, onChange);
  },

  /** The search box. Its suggestions come from the binary search tree of item names. */
  setupSearch(app, onChange) {
    const input = document.getElementById('search-input');
    const list = document.getElementById('search-suggestions');
    let active = -1;

    const close = () => {
      list.hidden = true;
      active = -1;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    };

    const highlight = () => {
      [...list.children].forEach((option, index) => option.setAttribute('aria-selected', String(index === active)));
      if (active === -1) input.removeAttribute('aria-activedescendant');
      else input.setAttribute('aria-activedescendant', list.children[active].id);
    };

    const choose = (name) => {
      input.value = name;
      app.filters.query = name;
      close();
      onChange();
    };

    const showSuggestions = () => {
      const typed = input.value.trim().toLowerCase();
      const items = app.foodCourt.suggest(typed).filter((item) => item.name.toLowerCase() !== typed);
      if (items.length === 0) return close();

      list.replaceChildren(
        ...items.map((item, index) =>
          h('li', { role: 'option', id: `suggestion-${index}`, 'data-name': item.name, 'aria-selected': 'false' },
            h('span', {}, item.name),
            h('span', { class: 'suggestions__price' }, rupees(item.price)))
        )
      );
      list.hidden = false;
      active = -1;
      input.setAttribute('aria-expanded', 'true');
    };

    input.addEventListener('input', () => {
      app.filters.query = input.value;
      onChange();
      showSuggestions();
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') return close();
      if (list.hidden) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        // -1 means nothing is highlighted; the arrow keys cycle through it
        const last = list.children.length - 1;
        if (event.key === 'ArrowDown') active = active === last ? -1 : active + 1;
        else active = active === -1 ? last : active - 1;
        highlight();
      } else if (event.key === 'Enter' && active !== -1) {
        event.preventDefault();
        choose(list.children[active].dataset.name);
      }
    });

    // mousedown, not click, so the choice registers before the input loses focus
    list.addEventListener('mousedown', (event) => {
      const option = event.target.closest('[role="option"]');
      if (!option) return;
      event.preventDefault();
      choose(option.dataset.name);
    });

    input.addEventListener('blur', close);
  },

  render(app) {
    const result = app.foodCourt.browse(app.filters);
    app.lastBrowse = result;

    this.renderTree(app);
    this.renderHeading(app, result);
    this.renderList(app, result);
    this.renderTrace(app, result);
  },

  /** TREE 1: the category tree, drawn by walking it recursively. */
  renderTree(app) {
    const { foodCourt, filters } = app;
    const countIn = (categoryId) => foodCourt.browse({ ...filters, categoryId }).items.length;

    const branch = (node) =>
      h('li', {},
        h('button', {
            class: 'tree__item',
            type: 'button',
            'data-action': 'choose-category',
            'data-id': node.id,
            'aria-current': node.id === filters.categoryId ? 'true' : null,
          },
          h('span', {}, node.name),
          h('span', { class: 'tree__count' }, String(countIn(node.id)))),
        node.children.length > 0 && h('ul', {}, node.children.map(branch)));

    redraw(document.getElementById('category-tree'), branch(foodCourt.categories.root));

    const path = foodCourt.categories.pathTo(filters.categoryId);
    setText(document.getElementById('category-current'), path[path.length - 1].name);
  },

  renderHeading(app, result) {
    const crumbs = result.path.flatMap((node, index) => {
      const last = index === result.path.length - 1;
      const crumb = last
        ? h('span', { 'aria-current': 'true' }, node.name)
        : h('button', { type: 'button', class: 'breadcrumb__link', 'data-action': 'choose-category', 'data-id': node.id }, node.name);
      return last ? [crumb] : [crumb, h('span', { class: 'breadcrumb__divider', 'aria-hidden': 'true' }, '/')];
    });

    redraw(document.getElementById('breadcrumb'), crumbs);
    setText(document.getElementById('result-count'), plural(result.items.length, 'item'));
  },

  renderList(app, result) {
    const list = document.getElementById('menu-list');

    if (result.items.length === 0) {
      const query = app.filters.query.trim();
      redraw(list,
        h('li', { class: 'empty' },
          h('p', {}, query
            ? `Nothing matches “${query}” with these filters. Check the spelling, or show the full menu.`
            : 'Nothing in this category matches your filters.'),
          h('button', { class: 'button', type: 'button', 'data-action': 'clear-filters' }, 'Show the full menu')));
      return;
    }

    redraw(list, result.items.map((item) => this.dish(app, item)));
  },

  dish(app, item) {
    return h('li', { class: 'dish' },
      h('span', {
        class: `diet diet--${item.veg ? 'veg' : 'nonveg'}`,
        role: 'img',
        'aria-label': item.veg ? 'Vegetarian' : 'Non-vegetarian',
      }),
      h('div', { class: 'dish__text' },
        h('h2', { class: 'dish__name' }, item.name),
        h('p', { class: 'dish__about' }, item.about),
        h('p', { class: 'dish__meta' },
          h('span', {}, `${item.prep} min`),
          h('span', {}, `${item.orders} ordered this week`))),
      h('div', { class: 'dish__buy' },
        h('span', { class: 'price' }, rupees(item.price)),
        quantityControl(app, item)));
  },

  /** Says in plain words which structures produced the list on screen. */
  renderTrace(app, result) {
    const { foodCourt, filters } = app;
    const categories = foodCourt.categories.subtreeIds(filters.categoryId).length;
    const here = result.path[result.path.length - 1].name;

    setText(document.getElementById('menu-trace'),
      `How this list was made: the category tree gave ${plural(categories, 'category', 'categories')} under ` +
      `“${here}”, linear search checked all ${plural(result.searchComparisons, 'item')} and kept ` +
      `${result.items.length}, then ${result.sortAlgorithm} ordered them in ` +
      `${plural(result.sortComparisons, 'comparison')}.`);
  },
};

/** "Add" when the item is not in the tray, otherwise a minus / count / plus control. */
function quantityControl(app, item) {
  const quantity = app.foodCourt.quantityInTray(item.id);

  if (quantity === 0) {
    return h('button', { class: 'button button--add', type: 'button', 'data-action': 'add', 'data-id': item.id },
      'Add', h('span', { class: 'visually-hidden' }, ` ${item.name}`));
  }

  return h('div', { class: 'stepper' },
    h('button', { type: 'button', 'data-action': 'remove', 'data-id': item.id, 'aria-label': `Remove one ${item.name}` }, '−'),
    h('span', { class: 'stepper__count', 'aria-label': `${quantity} in tray` }, String(quantity)),
    h('button', { type: 'button', 'data-action': 'add', 'data-id': item.id, 'aria-label': `Add one more ${item.name}` }, '+'));
}
