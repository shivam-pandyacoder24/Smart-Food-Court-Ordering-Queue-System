'use strict';

/**
 * The Data structures page: one row per topic, saying what it is used for
 * and showing what the structure holds at this moment.
 */

const SOURCE_URL = 'https://github.com/shivam-pandyacoder24/Smart-Food-Court-Ordering-Queue-System/blob/main/';
const BUCKETS_SHOWN = 32;

/** Boxes joined by arrows, e.g. front -> 1040 -> 1041 -> rear */
function chain(values, { start, end, empty }) {
  if (values.length === 0) return h('p', { class: 'live__empty' }, empty);

  const parts = [];
  if (start) parts.push(h('span', { class: 'cell cell--label' }, start));
  values.forEach((value, index) => {
    if (start || index > 0) parts.push(h('span', { class: 'cell__arrow', 'aria-hidden': 'true' }, '→'));
    parts.push(h('span', { class: 'cell' }, String(value)));
  });
  if (end) {
    parts.push(h('span', { class: 'cell__arrow', 'aria-hidden': 'true' }, '→'));
    parts.push(h('span', { class: 'cell cell--label' }, end));
  }
  return h('p', { class: 'cells' }, parts);
}

function fact(...parts) {
  return h('p', { class: 'live__fact' }, ...parts);
}

const StructuresView = {
  /** Runs once: fills the "Example item" menu in alphabetical order (an in-order walk of the BST). */
  setup(app, onChange) {
    const select = document.getElementById('example-item');
    for (const { value: item } of app.foodCourt.nameIndex.inOrder()) {
      select.append(h('option', { value: item.id }, item.name));
    }
    select.value = String(app.exampleItemId);
    select.addEventListener('change', () => {
      app.exampleItemId = Number(select.value);
      onChange();
    });
  },

  render(app) {
    const rows = this.rows(app).map((row) =>
      h('article', { class: 'structure' },
        h('div', { class: 'structure__about' },
          h('h2', {}, row.title),
          h('p', { class: 'structure__use' }, row.use),
          h('p', {}, row.how),
          h('p', { class: 'structure__meta' },
            h('span', {}, row.cost),
            h('a', { href: SOURCE_URL + row.file }, row.file))),
        h('div', { class: 'live', 'aria-label': `${row.title}: current contents` }, row.live)));

    redraw(document.getElementById('structures'), rows);
  },

  rows(app) {
    const foodCourt = app.foodCourt;
    const example = foodCourt.findItem(app.exampleItemId);
    const browse = app.lastBrowse || foodCourt.browse(app.filters);

    return [
      this.arrays(foodCourt),
      this.searching(foodCourt, browse, example),
      this.sorting(browse),
      this.linkedList(app),
      this.stack(foodCourt),
      this.queue(foodCourt),
      this.categoryTree(foodCourt),
      this.searchTree(foodCourt, example),
      this.graph(foodCourt, example),
      this.hashing(foodCourt),
    ];
  },

  arrays(foodCourt) {
    const shown = foodCourt.menu.slice(0, 5);
    return {
      title: 'Array',
      use: 'Holds the menu',
      how: 'Every menu item lives in one array. The other structures point back to these items instead of copying them.',
      cost: 'Read by index: O(1)',
      file: 'js/data/menu.js',
      live: [
        h('ol', { class: 'array', start: '0' }, shown.map((item, index) =>
          h('li', {}, h('span', { class: 'array__index' }, `[${index}]`), h('span', { class: 'cell' }, item.name)))),
        fact(`… and ${foodCourt.menu.length - shown.length} more, ${foodCourt.menu.length} items in all.`),
      ],
    };
  },

  searching(foodCourt, browse, example) {
    const byId = binarySearch(foodCourt.menuById, example.id, (item) => item.id);
    return {
      title: 'Searching',
      use: 'Finds food as you type',
      how: 'The search box matches words anywhere in a name or description, so it uses linear search over the whole array. Fetching an item by its id uses binary search on a copy of the array sorted by id.',
      cost: 'Linear: O(n). Binary: O(log n)',
      file: 'js/dsa/search.js',
      live: [
        fact(h('strong', {}, 'Linear search: '),
          `your last menu view checked ${plural(browse.searchComparisons, 'item')} and kept ${browse.items.length}.`),
        fact(h('strong', {}, 'Binary search: '),
          `item ${example.id} (${example.name}) was found in ${plural(byId.comparisons, 'step')} out of ${foodCourt.menu.length} items.`),
      ],
    };
  },

  sorting(browse) {
    return {
      title: 'Sorting',
      use: 'Orders the menu by price, popularity or name',
      how: 'Price and popularity use merge sort. It is stable, so dishes with the same price keep their menu order. Names are unique, so they use quick sort.',
      cost: 'Both: O(n log n) on average',
      file: 'js/dsa/sort.js',
      live: [
        fact(h('strong', {}, `Last sort: ${browse.sortAlgorithm}. `),
          `${plural(browse.items.length, 'item')} ordered in ${plural(browse.sortComparisons, 'comparison')}.`),
        chain(browse.items.slice(0, 4).map((item) => item.name), { empty: 'No items to sort.' }),
      ],
    };
  },

  linkedList(app) {
    const foodCourt = app.foodCourt;
    const id = app.tracking.customerId || app.customer.id || foodCourt.students[0].id;
    const history = foodCourt.historyFor(id);
    return {
      title: 'Linked list',
      use: "Keeps each student's order history",
      how: 'Each student has their own linked list of orders. A new order becomes the head node, so reading from the head gives the newest order first.',
      cost: 'Add at head: O(1)',
      file: 'js/dsa/linked-list.js',
      live: [
        fact(h('strong', {}, history.found ? `${history.customer.name} (${history.customer.id})` : id.toUpperCase())),
        chain(history.orders.map((order) => order.id), {
          start: 'head',
          end: 'null',
          empty: 'No orders yet for this student, so the list is empty.',
        }),
      ],
    };
  },

  stack(foodCourt) {
    const changes = foodCourt.undoStack.toArray();
    return {
      title: 'Stack',
      use: 'Powers Undo in the tray',
      how: 'Every change to the tray is pushed on a stack. Undo pops the top change and reverses it, so the latest change is always undone first.',
      cost: 'Push and pop: O(1)',
      file: 'js/dsa/stack.js',
      live: changes.length === 0
        ? h('p', { class: 'live__empty' }, 'The stack is empty. Add something to your tray, then come back.')
        : h('ol', { class: 'stack' }, changes.map((change, index) =>
            h('li', {},
              h('span', { class: 'cell' }, `${change.type === 'add' ? 'Added' : 'Removed'} ${change.name}`),
              index === 0 && h('span', { class: 'stack__top' }, 'top, undone next')))),
    };
  },

  queue(foodCourt) {
    return {
      title: 'Queue',
      use: 'Runs the kitchen line',
      how: 'A placed order joins the rear of the queue. The kitchen only ever takes the order at the front, so nobody is served ahead of an earlier order.',
      cost: 'Enqueue and dequeue: O(1)',
      file: 'js/dsa/queue.js',
      live: [
        chain(foodCourt.waiting.toArray().map((order) => order.id), {
          start: 'front',
          end: 'rear',
          empty: 'The queue is empty. Place an order or add a walk-in order on the queue board.',
        }),
        fact(`${plural(foodCourt.cooking.length, 'order')} cooking, ${foodCourt.ready.length} ready, ${foodCourt.collectedCount} collected.`),
      ],
    };
  },

  categoryTree(foodCourt) {
    const branch = (node) =>
      h('li', {}, h('span', { class: 'cell' }, node.name), node.children.length > 0 && h('ul', {}, node.children.map(branch)));
    return {
      title: 'Tree',
      use: 'Organises the menu categories',
      how: 'Categories form a tree with any number of children per node. Choosing a category shows everything in its subtree, and the breadcrumb is the path from the root.',
      cost: 'Find a category: O(n)',
      file: 'js/dsa/category-tree.js',
      live: [
        h('ul', { class: 'mini-tree' }, branch(foodCourt.categories.root)),
        fact(`${foodCourt.categories.size} categories on ${foodCourt.categories.height()} levels.`),
      ],
    };
  },

  searchTree(foodCourt, example) {
    const lookup = foodCourt.findItemByName(example.name);
    const prefix = example.name.slice(0, 2).toLowerCase();
    const matches = foodCourt.nameIndex.withPrefix(prefix);
    return {
      title: 'Binary search tree',
      use: 'Looks items up by name and suggests names as you type',
      how: 'Item names are stored in a balanced binary search tree. A lookup goes left or right at each node, and an in-order walk lists the names alphabetically for the search suggestions.',
      cost: 'Lookup: O(log n)',
      file: 'js/dsa/bst.js',
      live: [
        fact(h('strong', {}, `Path to “${example.name}”: `),
          `${plural(lookup.comparisons, 'comparison')} instead of up to ${foodCourt.nameIndex.size}.`),
        chain(lookup.path, { start: 'root', empty: '' }),
        fact(`Names starting with “${prefix}”: ${matches.values.map((item) => item.name).join(', ')}. ` +
          `The walk visited ${matches.visited} of ${foodCourt.nameIndex.size} nodes. Tree height: ${foodCourt.nameIndex.height()}.`),
      ],
    };
  },

  graph(foodCourt, example) {
    const neighbors = foodCourt.pairings.neighbors(example.id);
    const twoSteps = foodCourt.pairings.breadthFirst(example.id, 2).filter((reached) => reached.depth === 2);
    const name = (id) => foodCourt.findItem(id).name;
    return {
      title: 'Graph',
      use: 'Suggests what goes well with your order',
      how: 'Items are vertices. An edge joins two items that are often ordered together, and its weight is how often. The tray suggests the neighbours of what you picked; a breadth-first search reaches items two steps away.',
      cost: 'Neighbours of an item: O(degree)',
      file: 'js/dsa/graph.js',
      live: neighbors.length === 0
        ? h('p', { class: 'live__empty' }, `${example.name} has no pairings. Pick another example item.`)
        : [
            fact(h('strong', {}, `${example.name} is joined to:`)),
            h('ul', { class: 'edges' }, neighbors.map((edge) =>
              h('li', {},
                h('span', { class: 'cell' }, name(edge.id)),
                h('span', { class: 'edges__weight', 'aria-label': `strength ${edge.weight} of 5` },
                  h('span', { style: `width:${edge.weight * 20}%` }))))),
            fact(twoSteps.length > 0
              ? `Two steps away: ${twoSteps.map((reached) => name(reached.id)).join(', ')}.`
              : 'Nothing else is within two steps.'),
            fact(`${foodCourt.pairings.vertexCount} vertices, ${foodCourt.pairings.edgeCount} edges.`),
          ],
    };
  },

  hashing(foodCourt) {
    const table = foodCourt.orders;
    const chains = table.chains();
    const latest = foodCourt.nextOrderId - 1;
    const lookup = table.lookup(latest);
    const longest = chains.reduce((most, keys) => Math.max(most, keys.length), 0);
    return {
      title: 'Hash table',
      use: 'Finds an order or a student instantly',
      how: 'The order number is hashed to pick a bucket, so tracking an order looks in one bucket instead of scanning every order. Keys that share a bucket are chained in a short list, and the table doubles when it gets crowded.',
      cost: 'Insert and lookup: O(1) on average',
      file: 'js/dsa/hash-table.js',
      live: [
        fact(h('strong', {}, 'Orders table: '),
          `${plural(table.size, 'order')} in ${table.capacity} buckets, load factor ${table.loadFactor.toFixed(2)}, longest chain ${longest}.`),
        h('ol', { class: 'buckets', start: '0' }, chains.slice(0, BUCKETS_SHOWN).map((keys, index) =>
          h('li', { class: keys.length === 0 ? 'is-empty' : null },
            h('span', { class: 'array__index' }, `[${index}]`),
            keys.length === 0
              ? h('span', { class: 'buckets__none' }, 'empty')
              : keys.map((key, position) => [
                  position > 0 && h('span', { class: 'cell__arrow', 'aria-hidden': 'true' }, '→'),
                  h('span', { class: 'cell' }, key),
                ])))),
        chains.length > BUCKETS_SHOWN && fact(`… and ${chains.length - BUCKETS_SHOWN} more buckets.`),
        lookup.found && fact(`Order ${latest} is in bucket ${lookup.bucket}, found after ${plural(lookup.comparisons, 'comparison')}.`),
        fact(h('strong', {}, 'Students table: '),
          `${plural(foodCourt.customers.size, 'student')} in ${foodCourt.customers.capacity} buckets.`),
      ],
    };
  },
};
