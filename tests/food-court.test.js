'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createFoodCourt } = require('./helpers/load.js');

const DOSA = 101;
const SAMOSA = 122;
const CHAI = 125;
const COFFEE = 126;

test('every item can be found by id and by name', () => {
  const { foodCourt } = createFoodCourt();

  for (const item of MENU_ITEMS) {
    assert.equal(foodCourt.findItem(item.id).name, item.name);
    assert.equal(foodCourt.findItemByName(item.name).value.id, item.id);
  }
  assert.equal(foodCourt.findItem(999), null);
  assert.equal(foodCourt.findItemByName('Pizza').found, false);
});

test('every item belongs to a real category and every pairing joins real items', () => {
  const { foodCourt } = createFoodCourt();

  for (const item of MENU_ITEMS) assert.notEqual(foodCourt.categories.find(item.category), null, item.name);
  for (const [a, b] of MENU_PAIRINGS) {
    assert.notEqual(foodCourt.findItem(a), null);
    assert.notEqual(foodCourt.findItem(b), null);
  }
  assert.equal(foodCourt.pairings.edgeCount, MENU_PAIRINGS.length);
});

test('browsing filters by words, category subtree and veg, then sorts', () => {
  const { foodCourt } = createFoodCourt();

  const everything = foodCourt.browse();
  assert.equal(everything.items.length, MENU_ITEMS.length);
  assert.equal(everything.searchComparisons, MENU_ITEMS.length);
  assert.equal(everything.items[0].name, 'Masala Chai'); // most ordered

  const cheapest = foodCourt.browse({ sortBy: 'price-low' }).items;
  for (let i = 1; i < cheapest.length; i++) assert.ok(cheapest[i - 1].price <= cheapest[i].price);

  const byName = foodCourt.browse({ sortBy: 'name' });
  assert.equal(byName.sortAlgorithm, 'quick sort');
  assert.deepEqual(
    byName.items.map((item) => item.name),
    MENU_ITEMS.map((item) => item.name).sort()
  );

  const drinks = foodCourt.browse({ categoryId: 'drinks' });
  assert.equal(drinks.items.length, 7);
  assert.deepEqual(drinks.path.map((node) => node.name), ['All items', 'Drinks']);

  const chicken = foodCourt.browse({ query: '  Chicken ' }).items;
  assert.deepEqual(chicken.map((item) => item.name).sort(), ['Butter Chicken', 'Chicken Biryani', 'Chicken Kathi Roll']);
  assert.equal(foodCourt.browse({ query: 'chicken', vegOnly: true }).items.length, 0);
  assert.equal(foodCourt.browse({ query: 'kathi paneer' }).items.length, 1);
  assert.equal(foodCourt.browse({ query: 'dessert' }).items.length, 4); // matches the category name
});

test('the search box suggests names that start with the typed text', () => {
  const { foodCourt } = createFoodCourt();

  assert.deepEqual(
    foodCourt.suggest('Ma').map((item) => item.name),
    ['Mango Milkshake', 'Masala Chai', 'Masala Dosa']
  );
  assert.deepEqual(foodCourt.suggest(''), []);
  assert.deepEqual(foodCourt.suggest('xyz'), []);
});

test('undo reverses tray changes, most recent first', () => {
  const { foodCourt } = createFoodCourt();
  const tray = () => foodCourt.tray.map((line) => `${line.quantity} ${line.item.name}`);

  foodCourt.addToTray(DOSA);
  foodCourt.addToTray(CHAI);
  foodCourt.addToTray(CHAI);
  assert.deepEqual(tray(), ['1 Masala Dosa', '2 Masala Chai']);
  assert.equal(foodCourt.trayTotal(), 60 + 15 + 15);
  assert.equal(foodCourt.trayCount(), 3);

  foodCourt.removeFromTray(DOSA);
  assert.deepEqual(tray(), ['2 Masala Chai']);

  assert.equal(foodCourt.undo().type, 'remove'); // the dosa comes back, in its old place
  assert.deepEqual(tray(), ['1 Masala Dosa', '2 Masala Chai']);

  foodCourt.undo();
  assert.deepEqual(tray(), ['1 Masala Dosa', '1 Masala Chai']);
  foodCourt.undo();
  foodCourt.undo();
  assert.deepEqual(tray(), []);
  assert.equal(foodCourt.undo(), null);
  assert.equal(foodCourt.addToTray(999), false);
});

test('suggestions come from the pairing graph and skip what is already in the tray', () => {
  const { foodCourt } = createFoodCourt();
  assert.deepEqual(foodCourt.suggestions(), []);

  foodCourt.addToTray(SAMOSA);
  const first = foodCourt.suggestions();
  assert.equal(first[0].item.name, 'Masala Chai');
  assert.equal(first[0].goesWith, 'Samosa');

  foodCourt.addToTray(CHAI);
  const names = foodCourt.suggestions(10).map((entry) => entry.item.name);
  assert.ok(!names.includes('Masala Chai'));
  assert.ok(!names.includes('Samosa'));
  assert.ok(names.length > 0);

  foodCourt.addToTray(110); // Butter Chicken pairs only with veg items here, so check a non-veg neighbour
  foodCourt.addToTray(123); // French Fries pairs with Chicken Kathi Roll
  const all = foodCourt.suggestions(20).map((entry) => entry.item.name);
  const vegOnly = foodCourt.suggestions(20, { vegOnly: true }).map((entry) => entry.item.name);
  assert.ok(all.includes('Chicken Kathi Roll'));
  assert.ok(!vegOnly.includes('Chicken Kathi Roll'));
});

test('placing an order needs a tray and a valid student ID', () => {
  const { foodCourt } = createFoodCourt();

  assert.match(foodCourt.placeOrder({ customerId: 'STU2041' }).error, /tray/);
  foodCourt.addToTray(DOSA);
  assert.match(foodCourt.placeOrder({ customerId: '' }).error, /student ID/);
  assert.match(foodCourt.placeOrder({ customerId: 'a b' }).error, /student ID/);
  assert.equal(foodCourt.trayCount(), 1); // a failed attempt keeps the tray

  const { order, error } = foodCourt.placeOrder({ customerId: ' stu2041 ', customerName: 'Asha' });
  assert.equal(error, null);
  assert.equal(order.customerId, 'STU2041');
  assert.equal(order.total, 60);
  assert.equal(foodCourt.trayCount(), 0);
  assert.equal(foodCourt.undoStack.isEmpty(), true);
});

test('the first order after the four sample orders is #1042, and the hash table finds it', () => {
  const { foodCourt } = createFoodCourt();
  foodCourt.placeSampleOrders(SAMPLE_ORDERS);

  foodCourt.addToTray(DOSA);
  foodCourt.addToTray(COFFEE);
  const { order } = foodCourt.placeOrder({ customerId: 'STU2041', customerName: 'Asha' });

  assert.equal(order.id, 1042);
  assert.equal(order.status, ORDER_STATUS.WAITING);
  assert.equal(order.prepMinutes, 9); // dosa takes 8, plus one extra plate

  const lookup = foodCourt.findOrder('#1042');
  assert.equal(lookup.found, true);
  assert.equal(lookup.value, order);
  assert.ok(lookup.comparisons <= 2);
  assert.equal(foodCourt.findOrder(4000).found, false);
  assert.equal(foodCourt.queuePosition(1042), 5);
});

test('order -> queue -> kitchen -> ready, strictly first in first out', () => {
  const { foodCourt, clock } = createFoodCourt();
  foodCourt.placeSampleOrders(SAMPLE_ORDERS);
  const ids = (orders) => orders.map((order) => order.id);

  assert.deepEqual(ids(foodCourt.waiting.toArray()), [1038, 1039, 1040, 1041]);

  foodCourt.tick(); // two stations take the two orders at the front
  assert.deepEqual(ids(foodCourt.cooking), [1038, 1039]);
  assert.deepEqual(ids(foodCourt.waiting.toArray()), [1040, 1041]);
  assert.equal(foodCourt.startNext(), null); // no free station
  assert.equal(foodCourt.queuePosition(1040), 1);

  // 1038 needs 9 kitchen minutes, 1039 needs 13, 1040 needs 5, 1041 needs 7.
  assert.equal(foodCourt.estimateMinutes(1038), 9);
  assert.equal(foodCourt.estimateMinutes(1040), 9 + 5);
  assert.equal(foodCourt.estimateMinutes(1041), 13 + 7);

  clock.time = 9000;
  foodCourt.tick();
  assert.deepEqual(ids(foodCourt.ready), [1038]);
  assert.deepEqual(ids(foodCourt.cooking), [1039, 1040]);
  assert.equal(foodCourt.findOrder(1038).value.status, ORDER_STATUS.READY);
  assert.equal(foodCourt.estimateMinutes(1038), 0);

  clock.time = 14000;
  foodCourt.tick();
  assert.deepEqual(ids(foodCourt.ready), [1038, 1039, 1040]);
  assert.deepEqual(ids(foodCourt.cooking), [1041]);
  assert.equal(foodCourt.waiting.isEmpty(), true);

  clock.time = 24000; // sample orders are picked up 15 seconds after they are ready
  foodCourt.tick();
  assert.deepEqual(ids(foodCourt.ready), [1039, 1040, 1041]);
  assert.equal(foodCourt.collectedCount, 1);
  assert.equal(foodCourt.findOrder(1038).value.status, ORDER_STATUS.COLLECTED);
});

test('with autopilot off the kitchen only moves when staff press the buttons', () => {
  const { foodCourt, clock } = createFoodCourt();
  foodCourt.placeSampleOrders(SAMPLE_ORDERS);
  foodCourt.autopilot = false;

  clock.time = 60000;
  assert.equal(foodCourt.tick(), false);
  assert.equal(foodCourt.cooking.length, 0);

  assert.equal(foodCourt.startNext().id, 1038); // always the front of the queue
  assert.equal(foodCourt.startNext().id, 1039);
  assert.equal(foodCourt.markReady(1039).status, ORDER_STATUS.READY);
  assert.equal(foodCourt.markReady(1039), null);
  assert.equal(foodCourt.collect(1039).status, ORDER_STATUS.COLLECTED);
  assert.equal(foodCourt.collect(1038), null); // still cooking
  assert.equal(foodCourt.startNext().id, 1040);
});

test("a customer's history is a linked list read newest first", () => {
  const { foodCourt } = createFoodCourt();

  for (const itemId of [DOSA, CHAI, SAMOSA]) {
    foodCourt.addToTray(itemId);
    foodCourt.placeOrder({ customerId: 'STU2041', customerName: 'Asha' });
  }
  foodCourt.addToTray(COFFEE);
  foodCourt.placeOrder({ customerId: 'STU3000', customerName: 'Ben' });

  const history = foodCourt.historyFor('stu2041');
  assert.equal(history.found, true);
  assert.equal(history.customer.name, 'Asha');
  assert.deepEqual(history.orders.map((order) => order.id), [1040, 1039, 1038]);
  assert.deepEqual(history.orders.map((order) => order.lines[0].name), ['Samosa', 'Masala Chai', 'Masala Dosa']);

  assert.equal(foodCourt.historyFor('STU3000').orders.length, 1);
  assert.equal(foodCourt.historyFor('NOBODY').found, false);
  assert.deepEqual(foodCourt.historyFor('NOBODY').orders, []);
});

test('lunch rush adds walk-in orders but never lets the queue pass five', () => {
  let seed = 1;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const { foodCourt, clock } = createFoodCourt({ random });
  foodCourt.setRush(true);

  for (let second = 0; second < 600; second++) {
    clock.time = second * 1000;
    foodCourt.tick();
    assert.ok(foodCourt.waiting.size <= 5);
    assert.ok(foodCourt.cooking.length <= foodCourt.stations);
  }

  assert.ok(foodCourt.collectedCount > 10);
  assert.equal(foodCourt.orders.size, foodCourt.nextOrderId - 1038);
  for (const order of foodCourt.orders.values()) {
    assert.ok(order.lines.length >= 1);
    assert.ok(order.prepMinutes >= 1 && order.prepMinutes <= 20);
  }
});

test('a snapshot restores every order into the right structure', () => {
  const { foodCourt, clock } = createFoodCourt();
  foodCourt.placeSampleOrders(SAMPLE_ORDERS);
  foodCourt.addToTray(DOSA);
  foodCourt.placeOrder({ customerId: 'STU2041', customerName: 'Asha' });
  foodCourt.tick();
  clock.time = 9000;
  foodCourt.tick();

  const saved = JSON.parse(JSON.stringify(foodCourt.snapshot()));
  const { foodCourt: restored } = createFoodCourt();
  assert.equal(restored.restore(saved), true);

  const ids = (orders) => orders.map((order) => order.id);
  assert.deepEqual(ids(restored.waiting.toArray()), ids(foodCourt.waiting.toArray()));
  assert.deepEqual(ids(restored.cooking), ids(foodCourt.cooking));
  assert.deepEqual(ids(restored.ready), ids(foodCourt.ready));
  assert.equal(restored.nextOrderId, 1043);
  assert.equal(restored.findOrder(1042).value.customerName, 'Asha');
  assert.deepEqual(ids(restored.historyFor('STU2041').orders), [1042]);

  restored.addToTray(CHAI);
  assert.equal(restored.placeOrder({ customerId: 'STU2041' }).order.id, 1043);

  assert.equal(restored.restore(null), false);
  assert.equal(restored.restore({ version: 1, nextOrderId: 5, orders: 'broken' }), false);
  assert.equal(restored.findOrder(1043).found, true); // a bad snapshot changes nothing
});
