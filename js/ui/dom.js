'use strict';

/** Small helpers shared by the pages. */

const STATUS_LABEL = Object.freeze({
  waiting: 'In the queue',
  cooking: 'Cooking',
  ready: 'Ready to collect',
  collected: 'Collected',
});

/**
 * Creates an element: h('button', { class: 'button', 'data-id': 7 }, 'Add')
 * Text children are added as text, never as HTML, so names typed by a customer are safe to show.
 */
function h(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);

  for (const [name, value] of Object.entries(attributes)) {
    if (value === false || value === null || value === undefined) continue;
    element.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === false || child === null || child === undefined) continue;
    element.append(child);
  }

  return element;
}

const lastDrawn = new WeakMap();

/**
 * Replaces a container's content, but only when the new content is different.
 * Leaving unchanged content alone means buttons are never swapped out from
 * under a click, and keyboard focus stays on the same control after a redraw.
 */
function redraw(container, ...children) {
  const fresh = document.createElement('div');
  fresh.append(...children.flat(Infinity).filter(Boolean));

  const html = fresh.innerHTML;
  if (lastDrawn.get(container) === html) return;
  lastDrawn.set(container, html);

  const hadFocus = container.contains(document.activeElement);
  const selector = hadFocus ? focusSelector(document.activeElement) : null;
  container.replaceChildren(...fresh.childNodes);
  if (!hadFocus) return;

  // Put focus back on the same control, or on the container if that control is gone.
  const again = selector ? container.querySelector(selector) : null;
  if (again) {
    again.focus();
  } else {
    container.setAttribute('tabindex', '-1');
    container.focus({ preventScroll: true });
  }
}

/** A selector that finds the same control again after its container is redrawn. */
function focusSelector(element) {
  if (element.id) return `#${element.id}`;
  const { action, id } = element.dataset;
  if (!action) return null;
  return id ? `[data-action="${action}"][data-id="${id}"]` : `[data-action="${action}"]`;
}

/** Sets text only when it changed, so screen readers are not told the same thing twice. */
function setText(element, text) {
  if (element.textContent !== text) element.textContent = text;
}

function rupees(amount) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/** plural(1, 'order') -> "1 order", plural(3, 'order') -> "3 orders" */
function plural(count, word, manyWord = `${word}s`) {
  return `${count} ${count === 1 ? word : manyWord}`;
}

function clockTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** "1 Masala Dosa, 2 Masala Chai" */
function orderSummary(order) {
  return order.lines.map((line) => `${line.quantity} ${line.name}`).join(', ');
}

/** A line of small print explaining which data structure just did the work. */
function trace(...parts) {
  return h('p', { class: 'trace' }, ...parts);
}
