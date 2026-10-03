'use strict';

/**
 * The tray beside the menu: what you have picked, the Undo button,
 * "goes well with" suggestions, and the confirmation after ordering.
 */

const TrayView = {
  render(app) {
    const foodCourt = app.foodCourt;
    const empty = foodCourt.tray.length === 0;

    setText(document.getElementById('tray-button-count'), String(foodCourt.trayCount()));
    document.getElementById('order-form').hidden = empty;
    this.renderConfirmation(app);

    const contents = document.getElementById('tray-contents');
    if (empty) {
      redraw(contents,
        h('p', { class: 'tray__empty' },
          app.confirmation ? 'Want something else? Add it from the menu.' : 'Your tray is empty. Add something from the menu.'),
        this.undoButton(app));
      return;
    }

    redraw(contents,
      h('ul', { class: 'tray-lines' }, foodCourt.tray.map((line) => this.line(app, line))),
      this.undoButton(app),
      this.pairings(app),
      h('p', { class: 'tray-total' },
        h('span', {}, `Total for ${plural(foodCourt.trayCount(), 'item')}`),
        h('strong', {}, rupees(foodCourt.trayTotal()))));
  },

  line(app, { item, quantity }) {
    return h('li', { class: 'tray-line' },
      h('div', { class: 'tray-line__text' },
        h('span', { class: 'tray-line__name' }, item.name),
        h('span', { class: 'tray-line__price' }, `${rupees(item.price)} each`)),
      quantityControl(app, item),
      h('span', { class: 'tray-line__total' }, rupees(item.price * quantity)));
  },

  /** STACK: the button names the change on top of the undo stack. */
  undoButton(app) {
    const change = app.foodCourt.undoStack.peek();
    if (change === null) return null;

    return h('button', { class: 'button button--undo', type: 'button', 'data-action': 'undo' },
      h('strong', {}, 'Undo'),
      ` ${change.type === 'add' ? 'adding' : 'removing'} ${change.name}`);
  },

  /** GRAPH: neighbours of the items in the tray. */
  pairings(app) {
    const suggestions = app.foodCourt.suggestions(3, { vegOnly: app.filters.vegOnly });
    if (suggestions.length === 0) return null;

    return h('section', { class: 'pairings', 'aria-label': 'Goes well with your order' },
      h('h3', {}, 'Goes well with your order'),
      h('ul', {}, suggestions.map(({ item, goesWith }) =>
        h('li', {},
          h('div', {},
            h('span', { class: 'pairings__name' }, `${item.name} `, h('span', { class: 'pairings__price' }, rupees(item.price))),
            h('span', { class: 'pairings__why' }, `Often ordered with ${goesWith}`)),
          h('button', { class: 'button button--add', type: 'button', 'data-action': 'add', 'data-id': item.id },
            'Add', h('span', { class: 'visually-hidden' }, ` ${item.name}`))))));
  },

  /** Shown after an order is placed, until it is dismissed. */
  renderConfirmation(app) {
    const box = document.getElementById('tray-confirmation');
    const order = app.confirmation ? app.foodCourt.orders.get(app.confirmation) : undefined;
    if (!order) return redraw(box);

    redraw(box,
      h('div', { class: 'confirmation' },
        h('p', { class: 'confirmation__title' }, 'Order placed. Your order number is'),
        h('p', { class: 'token token--large' }, String(order.id)),
        orderStatusLine(app, order),
        h('div', { class: 'confirmation__actions' },
          h('button', { class: 'button button--primary', type: 'button', 'data-action': 'track', 'data-id': order.id }, 'Track order'),
          h('button', { class: 'button button--quiet', type: 'button', 'data-action': 'dismiss-confirmation' }, 'Done'))));
  },
};
