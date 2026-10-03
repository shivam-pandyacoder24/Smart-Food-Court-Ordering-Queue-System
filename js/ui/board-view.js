'use strict';

/**
 * The token board under the header, and the Queue board page with its three lanes:
 *
 *   Waiting (the queue)  ->  In the kitchen  ->  Ready to collect
 */

/** A slot that main.js keeps filled with "about 9 min" while the kitchen clock runs. */
function minutesLeft(order) {
  return h('span', { 'data-minutes': order.id });
}

/** One sentence saying where an order is, used in the tray and on the tracking page. */
function orderStatusLine(app, order) {
  const foodCourt = app.foodCourt;
  const timed = foodCourt.autopilot;
  const line = (...parts) => h('p', { class: 'status-line' }, ...parts);

  if (order.status === ORDER_STATUS.WAITING) {
    const ahead = foodCourt.queuePosition(order.id) - 1;
    const place = ahead === 0 ? 'You are next in line.' : `${plural(ahead, 'order')} ahead of you in the queue.`;
    return timed ? line(place, ' Ready in ', minutesLeft(order), '.') : line(place);
  }
  if (order.status === ORDER_STATUS.COOKING) {
    return timed ? line('Cooking now. Ready in ', minutesLeft(order), '.') : line('Cooking now.');
  }
  if (order.status === ORDER_STATUS.READY) {
    return line(`Ready to collect. Show order number ${order.id} at the counter.`);
  }
  return line(`Collected at ${clockTime(order.collectedAt)}.`);
}

/** An order drawn as a paper token: number on the stub, details on the body. */
function ticket(order, ...details) {
  return h('li', { class: `ticket${order.walkIn ? '' : ' ticket--mine'}` },
    h('div', { class: 'ticket__paper' },
      h('p', { class: 'ticket__stub' }, h('span', { class: 'visually-hidden' }, 'Order '), String(order.id)),
      h('div', { class: 'ticket__body' },
        h('p', { class: 'ticket__who' },
          order.customerName,
          !order.walkIn && h('span', { class: 'tag' }, 'Your order')),
        h('p', { class: 'ticket__items' }, orderSummary(order)),
        ...details)));
}

const BoardView = {
  /** The strip under the header that shows the kitchen at a glance. */
  renderServing(app) {
    const foodCourt = app.foodCourt;
    const next = foodCourt.waiting.peek();

    const group = (label, ...content) =>
      h('span', { class: 'serving__group' }, h('span', { class: 'serving__label' }, label), ...content);
    const tokens = (orders, kind) => orders.map((order) => h('span', { class: `token token--${kind}` }, String(order.id)));

    redraw(document.getElementById('serving'),
      h('span', { class: 'serving__inner' },
        group('Now serving',
          foodCourt.ready.length > 0
            ? tokens(foodCourt.ready, 'lit')
            : h('span', { class: 'serving__none' }, 'No orders ready yet')),
        group('Cooking',
          foodCourt.cooking.length > 0
            ? tokens(foodCourt.cooking, 'dim')
            : h('span', { class: 'serving__none' }, 'Kitchen is free')),
        group('Waiting',
          h('strong', { class: 'serving__number' }, String(foodCourt.waiting.size)),
          next && h('span', { class: 'serving__none' }, `next up ${next.id}`))));
  },

  renderLanes(app) {
    const foodCourt = app.foodCourt;
    const timed = foodCourt.autopilot;
    const waiting = foodCourt.waiting.toArray(); // QUEUE, front first

    document.getElementById('autopilot').checked = foodCourt.autopilot;
    document.getElementById('rush').checked = foodCourt.rush;

    const waitingLane = this.lane({
      title: 'Waiting',
      count: String(waiting.length),
      hint: 'New orders join at the bottom. The kitchen always takes the top one.',
      empty: 'Nobody is waiting. New orders join here.',
      tickets: waiting.map((order, index) =>
        ticket(order,
          h('p', { class: 'ticket__note' },
            index === 0 ? 'Front of the line' : `Position ${index + 1}`,
            timed && [', ready in ', minutesLeft(order)]))),
      footer: !timed && waiting.length > 0 && (
        foodCourt.cooking.length < foodCourt.stations
          ? h('button', { class: 'button button--primary', type: 'button', 'data-action': 'start-next' }, `Start order ${waiting[0].id}`)
          : h('p', { class: 'lane__hint' }, 'Both stations are busy. Mark an order ready to free one.')),
    });

    const kitchenLane = this.lane({
      title: 'In the kitchen',
      count: `${foodCourt.cooking.length} of ${foodCourt.stations}`,
      hint: 'Two orders are cooked at a time.',
      empty: 'Both stations are free.',
      tickets: foodCourt.cooking.map((order) =>
        ticket(order,
          timed
            ? [
                h('div', { class: 'progress', role: 'presentation' }, h('span', { class: 'progress__bar', 'data-progress': order.id })),
                h('p', { class: 'ticket__note' }, 'Ready in ', minutesLeft(order)),
              ]
            : h('button', { class: 'button', type: 'button', 'data-action': 'mark-ready', 'data-id': order.id }, 'Mark ready'))),
    });

    const readyLane = this.lane({
      title: 'Ready to collect',
      count: String(foodCourt.ready.length),
      hint: 'Show your order number at the counter.',
      empty: 'Nothing to collect yet.',
      tickets: foodCourt.ready.map((order) => {
        if (!order.walkIn) {
          return ticket(order,
            h('button', { class: 'button button--primary', type: 'button', 'data-action': 'collect', 'data-id': order.id }, 'Collect order'));
        }
        return ticket(order,
          timed
            ? h('p', { class: 'ticket__note' }, 'Waiting to be picked up')
            : h('button', { class: 'button', type: 'button', 'data-action': 'collect', 'data-id': order.id }, 'Hand over'));
      }),
    });

    redraw(document.getElementById('lanes'),
      waitingLane,
      kitchenLane,
      readyLane,
      h('p', { class: 'lanes__footer' }, `${plural(foodCourt.collectedCount, 'order')} collected so far.`));
  },

  lane({ title, count, hint, empty, tickets, footer }) {
    return h('section', { class: 'lane', 'aria-label': title },
      h('header', { class: 'lane__head' },
        h('h2', {}, title),
        h('span', { class: 'lane__count' }, count)),
      h('p', { class: 'lane__hint' }, hint),
      tickets.length > 0 ? h('ol', { class: 'tickets' }, tickets) : h('p', { class: 'lane__empty' }, empty),
      footer);
  },
};
