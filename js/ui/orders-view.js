'use strict';

/**
 * The My orders page: track one order by number (hash table lookup),
 * or list a student's order history (hash table, then linked list).
 */

const ORDER_STEPS = [
  [ORDER_STATUS.WAITING, 'In the queue'],
  [ORDER_STATUS.COOKING, 'Cooking'],
  [ORDER_STATUS.READY, 'Ready'],
  [ORDER_STATUS.COLLECTED, 'Collected'],
];

const OrdersView = {
  render(app) {
    this.renderTracking(app);
    this.renderHistory(app);
  },

  renderTracking(app) {
    const box = document.getElementById('track-result');
    const typed = app.tracking.orderId;
    if (typed === '') return redraw(box, h('p', { class: 'lookup__hint' }, 'Your order number is on the token you get after ordering.'));

    const foodCourt = app.foodCourt;
    const lookup = foodCourt.findOrder(typed); // HASHING
    const hashing = trace(
      `Hash table lookup: “${typed.replace(/^#/, '')}” hashes to bucket ${lookup.bucket} of ${foodCourt.orders.capacity}. `,
      lookup.found
        ? `Found there after ${plural(lookup.comparisons, 'comparison')}, without scanning the other ${plural(foodCourt.orders.size - 1, 'order')}.`
        : lookup.comparisons === 0
          ? 'That bucket is empty, so the order does not exist.'
          : `That bucket holds ${plural(lookup.comparisons, 'order')}, and none of them match.`);

    if (!lookup.found) {
      return redraw(box,
        h('p', { class: 'lookup__missing' }, `There is no order numbered ${typed}. Check the number on your token.`),
        hashing);
    }

    const order = lookup.value;
    const current = ORDER_STEPS.findIndex(([status]) => status === order.status);
    const finished = order.status === ORDER_STATUS.COLLECTED;

    redraw(box,
      h('article', { class: 'order-card' },
        h('header', { class: 'order-card__head' },
          h('p', { class: 'token token--large' }, h('span', { class: 'visually-hidden' }, 'Order '), String(order.id)),
          h('div', {},
            h('h3', {}, STATUS_LABEL[order.status]),
            orderStatusLine(app, order))),

        h('ol', { class: 'steps' }, ORDER_STEPS.map(([, label], index) =>
          h('li', {
              class: index < current || finished ? 'is-done' : index === current ? 'is-current' : null,
              'aria-current': index === current ? 'step' : null,
            },
            label))),

        h('ul', { class: 'order-lines' },
          order.lines.map((line) =>
            h('li', {},
              h('span', {}, `${line.quantity} × ${line.name}`),
              h('span', {}, rupees(line.price * line.quantity)))),
          h('li', { class: 'order-lines__total' }, h('span', {}, 'Total'), h('span', {}, rupees(order.total)))),

        h('p', { class: 'order-card__meta' },
          `Placed at ${clockTime(order.placedAt)} by ${order.customerName} (${order.customerId}).`),

        order.status === ORDER_STATUS.READY &&
          h('button', { class: 'button button--primary', type: 'button', 'data-action': 'collect', 'data-id': order.id }, 'Collect order')),
      hashing);
  },

  renderHistory(app) {
    const box = document.getElementById('history-result');
    const typed = app.tracking.customerId;
    if (typed === '') return redraw(box, h('p', { class: 'lookup__hint' }, 'Enter the student ID used when ordering.'));

    const history = app.foodCourt.historyFor(typed); // HASHING, then LINKED LIST
    if (!history.found) {
      return redraw(box, h('p', { class: 'lookup__missing' }, `No orders yet for ${typed.toUpperCase()}.`));
    }

    const spent = history.orders.reduce((total, order) => total + order.total, 0);

    redraw(box,
      h('p', { class: 'history-summary' },
        h('strong', {}, history.customer.name),
        ` has placed ${plural(history.orders.length, 'order')}, ${rupees(spent)} in total. Newest first:`),
      h('ol', { class: 'history' }, history.orders.map((order) =>
        h('li', {},
          h('span', { class: 'token' }, String(order.id)),
          h('div', { class: 'history__text' },
            h('span', {}, orderSummary(order)),
            h('span', { class: 'history__meta' }, `${clockTime(order.placedAt)}, ${rupees(order.total)}, ${STATUS_LABEL[order.status].toLowerCase()}`)),
          h('button', { class: 'button button--quiet', type: 'button', 'data-action': 'track', 'data-id': order.id },
            'Track', h('span', { class: 'visually-hidden' }, ` order ${order.id}`))))),
      trace(
        `Hash table lookup found ${history.customer.id} in bucket ${history.bucket}. Their history is a linked list: ` +
        `${plural(history.orders.length, 'node')} read from the head, and each new order is added at the head, so no sorting is needed.`));
  },
};
