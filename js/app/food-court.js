'use strict';

/**
 * The food court itself: menu, tray, orders and the kitchen queue.
 *
 * This file contains no HTML. It only connects the data structures in js/dsa
 * to the things a food court does, so the same code runs in the browser and
 * in the tests.
 *
 *   Order placed  ->  waiting queue  ->  kitchen  ->  ready  ->  collected
 */

const ORDER_STATUS = Object.freeze({
  WAITING: 'waiting',
  COOKING: 'cooking',
  READY: 'ready',
  COLLECTED: 'collected',
});

function compareNames(a, b) {
  if (a.name < b.name) return -1;
  return a.name > b.name ? 1 : 0;
}

/** The ways the menu can be sorted, and the algorithm each one uses. */
const SORT_OPTIONS = Object.freeze({
  popular: { label: 'Most popular', algorithm: 'merge sort', sort: mergeSort, compare: (a, b) => b.orders - a.orders },
  'price-low': { label: 'Price, low to high', algorithm: 'merge sort', sort: mergeSort, compare: (a, b) => a.price - b.price },
  'price-high': { label: 'Price, high to low', algorithm: 'merge sort', sort: mergeSort, compare: (a, b) => b.price - a.price },
  name: { label: 'Name, A to Z', algorithm: 'quick sort', sort: quickSort, compare: compareNames },
});

const MAX_PER_ITEM = 10;
const MAX_PREP_MINUTES = 20;
const MAX_WAITING_DURING_RUSH = 5;
const WALK_IN_PICKUP_MS = 15000;
const COLLECTED_ORDERS_KEPT = 80;

class FoodCourt {
  /**
   * @param {object} options
   * @param {Array}  options.items               menu items
   * @param {object} options.categories          nested category data
   * @param {Array}  options.pairings            [item id, item id, strength]
   * @param {Array}  [options.students]          sample customers for walk-in orders
   * @param {number} [options.stations]          orders the kitchen cooks at once
   * @param {number} [options.firstOrderId]
   * @param {number} [options.msPerKitchenMinute] how fast the demo clock runs
   * @param {() => number} [options.now]         clock, replaceable in tests
   * @param {() => number} [options.random]      random source, replaceable in tests
   */
  constructor({
    items,
    categories,
    pairings,
    students = [],
    stations = 2,
    firstOrderId = 1038,
    msPerKitchenMinute = 2500,
    now = () => Date.now(),
    random = Math.random,
  }) {
    this.now = now;
    this.random = random;
    this.students = students;
    this.stations = stations;
    this.firstOrderId = firstOrderId;
    this.msPerKitchenMinute = msPerKitchenMinute;

    // TREE 1: categories
    this.categories = CategoryTree.fromNested(categories);

    // ARRAYS: the menu, plus a copy sorted by id for binary search
    this.menu = items.map((item) => this.describe(item));
    this.menuById = mergeSort(this.menu, (a, b) => a.id - b.id).sorted;

    // TREE 2: item names in a balanced binary search tree
    const byName = quickSort(this.menu, compareNames).sorted;
    this.nameIndex = BinarySearchTree.fromSorted(
      byName.map((item) => ({ key: item.name.toLowerCase(), value: item }))
    );

    // GRAPH: which items go well together
    this.pairings = new Graph();
    this.menu.forEach((item) => this.pairings.addVertex(item.id));
    pairings.forEach(([a, b, strength]) => this.pairings.addEdge(a, b, strength));

    // STACK: tray changes that can be undone
    this.tray = [];
    this.undoStack = new Stack();

    this.clearOrders();
  }

  /** Adds the words a menu search should match: name, description and category names. */
  describe(item) {
    const path = this.categories.pathTo(item.category);
    const categoryName = path[path.length - 1].name;
    const words = [item.name, item.about, ...path.slice(1).map((node) => node.name)];
    if (item.veg) words.push('vegetarian');
    return Object.freeze({ ...item, categoryName, keywords: words.join(' ').toLowerCase() });
  }

  /** Empties every order structure. Used at start-up and by "Reset demo". */
  clearOrders() {
    this.orders = new HashTable(); // HASHING: order number -> order
    this.customers = new HashTable(); // HASHING: customer ID -> { id, name, history }
    this.waiting = new Queue(); // QUEUE: orders the kitchen has not started
    this.cooking = [];
    this.ready = [];
    this.collectedCount = 0;
    this.nextOrderId = this.firstOrderId;
    this.autopilot = true;
    this.rush = false;
    this.nextWalkInAt = 0;
  }

  // ---------------------------------------------------------------- menu

  /** One item by id. BINARY SEARCH on the id-sorted array. */
  findItem(id) {
    return binarySearch(this.menuById, id, (item) => item.id).item;
  }

  /** One item by exact name. BST lookup; also returns the path walked. */
  findItemByName(name) {
    return this.nameIndex.search(name.trim().toLowerCase());
  }

  /** Item names that start with the typed text. BST prefix walk. */
  suggest(typed, limit = 5) {
    const prefix = typed.trim().toLowerCase();
    return prefix === '' ? [] : this.nameIndex.withPrefix(prefix, limit).values;
  }

  /**
   * The menu as the customer asked to see it.
   * LINEAR SEARCH filters the array, then the chosen SORT orders the matches.
   */
  browse({ query = '', categoryId = this.categories.root.id, vegOnly = false, sortBy = 'popular' } = {}) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const categoryIds = this.categories.subtreeIds(categoryId);

    const search = linearSearch(
      this.menu,
      (item) =>
        categoryIds.includes(item.category) &&
        (!vegOnly || item.veg) &&
        words.every((word) => item.keywords.includes(word))
    );

    const option = SORT_OPTIONS[sortBy] || SORT_OPTIONS.popular;
    const sort = option.sort(search.found, option.compare);

    return {
      items: sort.sorted,
      path: this.categories.pathTo(categoryId),
      searchComparisons: search.comparisons,
      sortComparisons: sort.comparisons,
      sortAlgorithm: option.algorithm,
    };
  }

  // ---------------------------------------------------------------- tray

  quantityInTray(itemId) {
    const line = this.tray.find((candidate) => candidate.item.id === itemId);
    return line ? line.quantity : 0;
  }

  trayCount() {
    return this.tray.reduce((count, line) => count + line.quantity, 0);
  }

  trayTotal() {
    return this.tray.reduce((total, line) => total + line.item.price * line.quantity, 0);
  }

  /** Adds one of an item and remembers the change on the undo stack. */
  addToTray(itemId) {
    const item = this.findItem(itemId);
    if (item === null || this.quantityInTray(itemId) >= MAX_PER_ITEM) return false;

    this.changeQuantity(item, +1);
    this.undoStack.push({ type: 'add', itemId, name: item.name });
    return true;
  }

  /** Removes one of an item and remembers the change on the undo stack. */
  removeFromTray(itemId) {
    const index = this.tray.findIndex((line) => line.item.id === itemId);
    if (index === -1) return false;

    const item = this.tray[index].item;
    this.changeQuantity(item, -1);
    this.undoStack.push({ type: 'remove', itemId, name: item.name, index });
    return true;
  }

  /** Reverses the most recent tray change. Returns that change, or null when there is none. */
  undo() {
    const change = this.undoStack.pop();
    if (change === null) return null;

    const item = this.findItem(change.itemId);
    if (change.type === 'add') this.changeQuantity(item, -1);
    else this.changeQuantity(item, +1, change.index);
    return change;
  }

  changeQuantity(item, change, insertAt = this.tray.length) {
    const index = this.tray.findIndex((line) => line.item.id === item.id);

    if (index === -1) {
      if (change > 0) this.tray.splice(insertAt, 0, { item, quantity: change });
      return;
    }

    this.tray[index].quantity += change;
    if (this.tray[index].quantity <= 0) this.tray.splice(index, 1);
  }

  /**
   * Items that go well with what is in the tray.
   * GRAPH: adds up the edge weights from every tray item to its neighbours.
   */
  suggestions(limit = 3, { vegOnly = false } = {}) {
    const scores = new Map();

    for (const line of this.tray) {
      for (const neighbor of this.pairings.neighbors(line.item.id)) {
        if (this.quantityInTray(neighbor.id) > 0) continue;
        const item = this.findItem(neighbor.id);
        if (vegOnly && !item.veg) continue;

        const entry = scores.get(neighbor.id) || { item, score: 0, strongest: 0, goesWith: '' };
        entry.score += neighbor.weight;
        if (neighbor.weight > entry.strongest) {
          entry.strongest = neighbor.weight;
          entry.goesWith = line.item.name;
        }
        scores.set(neighbor.id, entry);
      }
    }

    const ranked = mergeSort([...scores.values()], (a, b) => b.score - a.score).sorted;
    return ranked.slice(0, limit);
  }

  // -------------------------------------------------------------- orders

  /**
   * Turns the tray into an order and puts it at the rear of the kitchen queue.
   * @returns {{ order: object|null, error: string|null }}
   */
  placeOrder({ customerId, customerName = '' }) {
    const id = String(customerId || '').trim().toUpperCase();
    const name = String(customerName || '').trim().slice(0, 40);

    if (this.tray.length === 0) return { order: null, error: 'Add something to your tray first.' };
    if (!/^[A-Z0-9-]{3,20}$/.test(id)) {
      return { order: null, error: 'Enter your student ID: 3 to 20 letters or digits.' };
    }

    const order = this.createOrder({ id, name: name || 'Student' }, this.tray, false);
    this.tray = [];
    this.undoStack.clear();
    return { order, error: null };
  }

  createOrder(customer, lines, walkIn) {
    const quantity = lines.reduce((count, line) => count + line.quantity, 0);
    const longestPrep = lines.reduce((longest, line) => Math.max(longest, line.item.prep), 0);

    const order = {
      id: this.nextOrderId++,
      customerId: customer.id,
      customerName: customer.name,
      walkIn,
      lines: lines.map((line) => ({
        itemId: line.item.id,
        name: line.item.name,
        price: line.item.price,
        quantity: line.quantity,
      })),
      total: lines.reduce((total, line) => total + line.item.price * line.quantity, 0),
      // The slowest dish, plus a minute for every extra plate.
      prepMinutes: Math.min(MAX_PREP_MINUTES, longestPrep + quantity - 1),
      status: ORDER_STATUS.WAITING,
      placedAt: this.now(),
      startedAt: null,
      dueAt: null,
      readyAt: null,
      collectedAt: null,
    };

    this.file(order);
    this.waiting.enqueue(order); // QUEUE: join at the rear
    return order;
  }

  /** Stores an order so it can be found by order number and by customer. */
  file(order) {
    this.orders.set(order.id, order); // HASHING

    let customer = this.customers.get(order.customerId); // HASHING
    if (customer === undefined) {
      customer = { id: order.customerId, name: order.customerName, history: new LinkedList() };
      this.customers.set(customer.id, customer);
    }
    customer.name = order.customerName;
    customer.history.addFirst(order); // LINKED LIST: newest order at the head
  }

  /** An order placed by one of the sample students, used to keep the queue busy. */
  placeWalkInOrder() {
    if (this.students.length === 0) return null;

    const pick = (list) => list[Math.floor(this.random() * list.length)];
    const main = pick(this.menu);
    const lines = [{ item: main, quantity: 1 }];

    const partner = this.pairings.neighbors(main.id)[0]; // GRAPH: its strongest pairing
    if (partner) lines.push({ item: this.findItem(partner.id), quantity: 1 });

    return this.createOrder(pick(this.students), lines, true);
  }

  /** Places the fixed sample orders: [student index, [[item id, quantity], ...]] */
  placeSampleOrders(sampleOrders) {
    for (const [studentIndex, picks] of sampleOrders) {
      const lines = picks.map(([itemId, quantity]) => ({ item: this.findItem(itemId), quantity }));
      this.createOrder(this.students[studentIndex], lines, true);
    }
  }

  /**
   * Finds an order by its number. HASHING: one bucket, no scanning.
   * @returns {{ found: boolean, value: object|undefined, bucket: number, comparisons: number }}
   */
  findOrder(orderId) {
    return this.orders.lookup(String(orderId).trim().replace(/^#/, ''));
  }

  /**
   * A customer's orders, newest first.
   * HASHING finds the customer; walking their LINKED LIST gives the history.
   */
  historyFor(customerId) {
    const lookup = this.customers.lookup(String(customerId).trim().toUpperCase());
    return {
      found: lookup.found,
      customer: lookup.found ? lookup.value : null,
      orders: lookup.found ? lookup.value.history.toArray() : [],
      bucket: lookup.bucket,
      comparisons: lookup.comparisons,
    };
  }

  // ------------------------------------------------------------- kitchen

  /** 1 for the front of the queue, and 0 when the order is not waiting. */
  queuePosition(orderId) {
    return this.waiting.positionOf((order) => order.id === orderId);
  }

  /** The kitchen takes the order at the FRONT of the queue, if a station is free. */
  startNext() {
    if (this.cooking.length >= this.stations || this.waiting.isEmpty()) return null;

    const order = this.waiting.dequeue(); // QUEUE: first in, first out
    order.status = ORDER_STATUS.COOKING;
    order.startedAt = this.now();
    order.dueAt = order.startedAt + order.prepMinutes * this.msPerKitchenMinute;
    this.cooking.push(order);
    return order;
  }

  markReady(orderId) {
    const index = this.cooking.findIndex((order) => order.id === orderId);
    if (index === -1) return null;

    const [order] = this.cooking.splice(index, 1);
    order.status = ORDER_STATUS.READY;
    order.readyAt = this.now();
    this.ready.push(order);
    return order;
  }

  collect(orderId) {
    const index = this.ready.findIndex((order) => order.id === orderId);
    if (index === -1) return null;

    const [order] = this.ready.splice(index, 1);
    order.status = ORDER_STATUS.COLLECTED;
    order.collectedAt = this.now();
    this.collectedCount++;
    return order;
  }

  /** Kitchen minutes until an order is ready, counting everything ahead of it. */
  estimateMinutes(orderId) {
    const order = this.orders.get(orderId);
    if (!order || order.status === ORDER_STATUS.READY || order.status === ORDER_STATUS.COLLECTED) return 0;

    const minutesLeft = (cooking) => Math.max(0, (cooking.dueAt - this.now()) / this.msPerKitchenMinute);
    if (order.status === ORDER_STATUS.COOKING) return Math.ceil(minutesLeft(order));

    // Play the queue forward: each waiting order takes the station that frees up first.
    const stationFreeIn = this.cooking.map(minutesLeft);
    while (stationFreeIn.length < this.stations) stationFreeIn.push(0);

    for (const waiting of this.waiting.toArray()) {
      const station = stationFreeIn.indexOf(Math.min(...stationFreeIn));
      stationFreeIn[station] += waiting.prepMinutes;
      if (waiting.id === order.id) return Math.ceil(stationFreeIn[station]);
    }
    return 0;
  }

  setRush(on) {
    this.rush = on;
    this.nextWalkInAt = this.now();
  }

  /**
   * Moves the kitchen forward when autopilot is on. Call it about once a second.
   * @returns {boolean} true when anything changed
   */
  tick() {
    if (!this.autopilot) return false;

    const now = this.now();
    let changed = false;

    for (const order of this.cooking.slice()) {
      if (now >= order.dueAt) changed = this.markReady(order.id) !== null || changed;
    }

    while (this.startNext() !== null) changed = true;

    for (const order of this.ready.slice()) {
      if (order.walkIn && now - order.readyAt >= WALK_IN_PICKUP_MS) changed = this.collect(order.id) !== null || changed;
    }

    if (this.rush && now >= this.nextWalkInAt) {
      if (this.waiting.size < MAX_WAITING_DURING_RUSH) changed = this.placeWalkInOrder() !== null || changed;
      this.nextWalkInAt = now + 6000 + this.random() * 8000;
    }

    return changed;
  }

  // ------------------------------------------------------------- saving

  /** Plain data describing every order, for saving in the browser. */
  snapshot() {
    const all = mergeSort(this.orders.values(), (a, b) => a.id - b.id).sorted;
    const collected = all.filter((order) => order.status === ORDER_STATUS.COLLECTED && order.walkIn);
    const tooOld = new Set(collected.slice(0, Math.max(0, collected.length - COLLECTED_ORDERS_KEPT)));

    return {
      version: 1,
      nextOrderId: this.nextOrderId,
      autopilot: this.autopilot,
      rush: this.rush,
      collectedCount: this.collectedCount,
      orders: all.filter((order) => !tooOld.has(order)),
    };
  }

  /** Rebuilds every structure from a snapshot. Returns false when the data is unusable. */
  restore(saved) {
    const usable =
      saved &&
      saved.version === 1 &&
      Number.isInteger(saved.nextOrderId) &&
      Array.isArray(saved.orders) &&
      saved.orders.every((order) => Number.isInteger(order.id) && Array.isArray(order.lines));
    if (!usable) return false;

    this.clearOrders();
    this.nextOrderId = saved.nextOrderId;
    this.autopilot = saved.autopilot !== false;
    this.rush = saved.rush === true;
    this.collectedCount = Number(saved.collectedCount) || 0;

    for (const data of mergeSort(saved.orders, (a, b) => a.id - b.id).sorted) {
      const order = { ...data, lines: data.lines.map((line) => ({ ...line })) };
      this.file(order);
      if (order.status === ORDER_STATUS.WAITING) this.waiting.enqueue(order);
      else if (order.status === ORDER_STATUS.COOKING) this.cooking.push(order);
      else if (order.status === ORDER_STATUS.READY) this.ready.push(order);
    }
    return true;
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { FoodCourt, ORDER_STATUS, SORT_OPTIONS };
