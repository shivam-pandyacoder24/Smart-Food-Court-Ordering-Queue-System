'use strict';

/**
 * SEARCHING
 * Used for: finding food on the menu.
 *
 *   linearSearch  checks every element, so it works on unsorted data.  O(n)
 *   binarySearch  halves a sorted array on every step.                 O(log n)
 *
 * Both return how many comparisons they made, so the site can show the cost.
 */

/**
 * Collects every element that passes the test.
 * @param {Array} items
 * @param {(item: any) => boolean} matches
 * @returns {{ found: Array, comparisons: number }}
 */
function linearSearch(items, matches) {
  const found = [];
  let comparisons = 0;

  for (let i = 0; i < items.length; i++) {
    comparisons++;
    if (matches(items[i])) found.push(items[i]);
  }

  return { found, comparisons };
}

/**
 * Finds one element by key in an array that is already sorted by that key.
 * @param {Array} sortedItems
 * @param {number|string} target
 * @param {(item: any) => number|string} keyOf
 * @returns {{ index: number, item: any, comparisons: number }} index is -1 when absent
 */
function binarySearch(sortedItems, target, keyOf) {
  let low = 0;
  let high = sortedItems.length - 1;
  let comparisons = 0;

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    const key = keyOf(sortedItems[mid]);
    comparisons++;

    if (key === target) return { index: mid, item: sortedItems[mid], comparisons };
    if (key < target) low = mid + 1;
    else high = mid - 1;
  }

  return { index: -1, item: null, comparisons };
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { linearSearch, binarySearch };
