'use strict';

/**
 * Starts the site: builds the food court, restores saved orders, switches
 * between pages, and sends every button press to the right action.
 */

const STORAGE_KEYS = { orders: 'food-court:orders', customer: 'food-court:customer' };
const VIEWS = ['menu', 'queue', 'orders', 'structures'];
const WIDE_SCREEN = window.matchMedia('(min-width: 1100px)');

const app = {
  foodCourt: new FoodCourt({
    items: MENU_ITEMS,
    categories: MENU_CATEGORIES,
    pairings: MENU_PAIRINGS,
    students: SAMPLE_STUDENTS,
  }),
  filters: { query: '', categoryId: MENU_CATEGORIES.id, vegOnly: false, sortBy: 'popular' },
  lastBrowse: null, // result of the latest menu search, shown on the Data structures page
  confirmation: null, // number of the order just placed, shown in the tray
  tracking: { orderId: '', customerId: '' },
  customer: { id: '', name: '' },
  exampleItemId: MENU_ITEMS[0].id,
  view: 'menu',
};

// ------------------------------------------------------------ storage

/** Reads saved JSON. Storage can be blocked or full, so every access is guarded. */
function readSaved(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key));
  } catch (error) {
    return null;
  }
}

function writeSaved(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // The site still works without saving; orders just reset on reload.
  }
}

function saveOrders() {
  writeSaved(STORAGE_KEYS.orders, app.foodCourt.snapshot());
}

function loadOrders() {
  if (!app.foodCourt.restore(readSaved(STORAGE_KEYS.orders))) {
    app.foodCourt.placeSampleOrders(SAMPLE_ORDERS);
  }
}

function loadCustomer() {
  const saved = readSaved(STORAGE_KEYS.customer);
  if (!saved || typeof saved.id !== 'string') return;

  app.customer = { id: saved.id, name: String(saved.name || '') };
  app.tracking.customerId = saved.id;
  document.getElementById('customer-id').value = saved.id;
  document.getElementById('customer-name').value = app.customer.name;
  document.getElementById('history-input').value = saved.id;
}

// ---------------------------------------------------------- rendering

/** Redraws whatever is on screen. Unchanged parts are left untouched (see redraw in dom.js). */
function render() {
  BoardView.renderServing(app);
  TrayView.render(app);

  if (app.view === 'menu') MenuView.render(app);
  if (app.view === 'queue') BoardView.renderLanes(app);
  if (app.view === 'orders') OrdersView.render(app);
  if (app.view === 'structures') StructuresView.render(app);

  fillClock();
}

/** Updates the countdowns and progress bars in place, without redrawing anything. */
function fillClock() {
  const foodCourt = app.foodCourt;

  for (const slot of document.querySelectorAll('[data-minutes]')) {
    const minutes = foodCourt.estimateMinutes(Number(slot.dataset.minutes));
    const text = minutes <= 0 ? 'under a minute' : `about ${minutes} min`;
    if (slot.textContent !== text) slot.textContent = text;
  }

  for (const bar of document.querySelectorAll('[data-progress]')) {
    const order = foodCourt.orders.get(bar.dataset.progress);
    if (!order || order.startedAt === null) continue;
    const done = (foodCourt.now() - order.startedAt) / (order.dueAt - order.startedAt);
    bar.style.width = `${Math.round(Math.min(1, Math.max(0, done)) * 100)}%`;
  }
}

let toastTimer = 0;

function toast(message) {
  const element = document.getElementById('toast');
  element.textContent = message;
  element.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element.classList.remove('is-visible'), 3200);
}

// -------------------------------------------------------------- pages

function showView(name) {
  app.view = VIEWS.includes(name) ? name : 'menu';

  for (const section of document.querySelectorAll('[data-view]')) {
    section.hidden = section.dataset.view !== app.view;
  }
  for (const link of document.querySelectorAll('[data-nav]')) {
    if (link.dataset.nav === app.view) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  closeTray();
  render();
}

function goTo(name) {
  if (window.location.hash === `#${name}`) showView(name);
  else window.location.hash = name; // fires hashchange, which calls showView
}

/** On narrow screens the tray slides in over the page; on wide screens it is always beside the menu. */
function openTray() {
  if (app.view !== 'menu') showView('menu');
  if (!WIDE_SCREEN.matches) {
    document.body.classList.add('tray-open');
    document.getElementById('backdrop').hidden = false;
  }
  document.getElementById('tray').focus();
}

function closeTray() {
  document.body.classList.remove('tray-open');
  document.getElementById('backdrop').hidden = true;
}

function closeCategories() {
  document.getElementById('categories').classList.remove('is-open');
  document.querySelector('[data-action="toggle-categories"]').setAttribute('aria-expanded', 'false');
}

// ------------------------------------------------------------ actions

/** Every button with a data-action attribute ends up here. */
const actions = {
  add(id) {
    if (!app.foodCourt.addToTray(Number(id))) toast('That is the most you can order of one item.');
  },

  remove(id) {
    app.foodCourt.removeFromTray(Number(id));
  },

  undo() {
    const change = app.foodCourt.undo();
    if (change) toast(change.type === 'add' ? `Took ${change.name} off your tray.` : `Put ${change.name} back on your tray.`);
  },

  'choose-category'(id) {
    app.filters.categoryId = id;
    closeCategories();
  },

  'toggle-categories'(id, button) {
    const open = document.getElementById('categories').classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(open));
  },

  'clear-filters'() {
    app.filters.query = '';
    app.filters.categoryId = MENU_CATEGORIES.id;
    app.filters.vegOnly = false;
    document.getElementById('search-input').value = '';
    document.getElementById('veg-only').checked = false;
  },

  'open-tray': openTray,
  'close-tray': closeTray,

  'dismiss-confirmation'() {
    app.confirmation = null;
  },

  track(id) {
    app.tracking.orderId = String(id);
    document.getElementById('track-input').value = String(id);
    goTo('orders');
  },

  'start-next'() {
    app.foodCourt.startNext();
  },

  'mark-ready'(id) {
    app.foodCourt.markReady(Number(id));
  },

  collect(id) {
    const order = app.foodCourt.collect(Number(id));
    if (order) toast(`Order ${order.id} collected. Enjoy your food.`);
  },

  'walk-in'() {
    const order = app.foodCourt.placeWalkInOrder();
    if (order) toast(`${order.customerName} placed order ${order.id}. It joined the rear of the queue.`);
  },

  reset() {
    if (!window.confirm('Clear every order and start again with the four sample orders?')) return;
    app.foodCourt.clearOrders();
    app.foodCourt.placeSampleOrders(SAMPLE_ORDERS);
    app.confirmation = null;
    app.tracking.orderId = '';
    document.getElementById('track-input').value = '';
    toast('Demo reset. The next order will be number 1042.');
  },
};

function placeOrder(event) {
  event.preventDefault();
  const idInput = document.getElementById('customer-id');
  const nameInput = document.getElementById('customer-name');
  const errorBox = document.getElementById('order-error');

  const { order, error } = app.foodCourt.placeOrder({ customerId: idInput.value, customerName: nameInput.value });
  errorBox.textContent = error || '';
  if (error) {
    idInput.focus();
    return;
  }

  app.customer = { id: order.customerId, name: nameInput.value.trim() };
  writeSaved(STORAGE_KEYS.customer, app.customer);
  idInput.value = order.customerId;

  app.confirmation = order.id;
  app.tracking = { orderId: String(order.id), customerId: order.customerId };
  document.getElementById('track-input').value = String(order.id);
  document.getElementById('history-input').value = order.customerId;

  app.foodCourt.tick(); // let the kitchen take it at once if a station is free
  saveOrders();
  render();
  toast(`Order ${order.id} placed.`);
  document.getElementById('tray').focus();
}

// --------------------------------------------------------------- start

function start() {
  loadOrders();
  loadCustomer();

  MenuView.setup(app, render);
  StructuresView.setup(app, render);

  document.addEventListener('click', (event) => {
    const control = event.target.closest('[data-action]');
    if (!control || !actions[control.dataset.action]) return;
    actions[control.dataset.action](control.dataset.id, control);
    saveOrders();
    render();
  });

  document.getElementById('order-form').addEventListener('submit', placeOrder);

  document.getElementById('track-form').addEventListener('submit', (event) => {
    event.preventDefault();
    app.tracking.orderId = document.getElementById('track-input').value.trim();
    render();
    document.getElementById('track-result').focus();
  });

  document.getElementById('history-form').addEventListener('submit', (event) => {
    event.preventDefault();
    app.tracking.customerId = document.getElementById('history-input').value.trim();
    render();
    document.getElementById('history-result').focus();
  });

  document.getElementById('autopilot').addEventListener('change', (event) => {
    app.foodCourt.autopilot = event.target.checked;
    saveOrders();
    render();
  });

  document.getElementById('rush').addEventListener('change', (event) => {
    app.foodCourt.setRush(event.target.checked);
    saveOrders();
    render();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeTray();
      closeCategories();
    }
  });

  WIDE_SCREEN.addEventListener('change', closeTray);
  window.addEventListener('hashchange', () => {
    showView(window.location.hash.slice(1));
    window.scrollTo(0, 0);
  });

  // The kitchen clock: once a second, move orders along and refresh the countdowns.
  window.setInterval(() => {
    if (app.foodCourt.tick()) saveOrders();
    render();
  }, 1000);

  app.foodCourt.tick();
  showView(window.location.hash.slice(1));
}

start();
