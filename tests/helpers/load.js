'use strict';

/**
 * The site uses plain <script> tags, so in the browser every class is a global.
 * This helper recreates that for the tests: it loads the same files, in the same
 * order as index.html, and puts what they export on Node's global scope.
 */

const path = require('node:path');

const SCRIPTS = [
  'js/dsa/search.js',
  'js/dsa/sort.js',
  'js/dsa/linked-list.js',
  'js/dsa/stack.js',
  'js/dsa/queue.js',
  'js/dsa/category-tree.js',
  'js/dsa/bst.js',
  'js/dsa/graph.js',
  'js/dsa/hash-table.js',
  'js/data/menu.js',
  'js/app/food-court.js',
];

for (const script of SCRIPTS) {
  Object.assign(globalThis, require(path.join(__dirname, '..', '..', script)));
}

/** A food court with a clock the test controls. */
function createFoodCourt(options = {}) {
  const clock = { time: 0 };
  const foodCourt = new FoodCourt({
    items: MENU_ITEMS,
    categories: MENU_CATEGORIES,
    pairings: MENU_PAIRINGS,
    students: SAMPLE_STUDENTS,
    msPerKitchenMinute: 1000,
    now: () => clock.time,
    random: () => 0,
    ...options,
  });
  return { foodCourt, clock };
}

module.exports = { SCRIPTS, createFoodCourt };
