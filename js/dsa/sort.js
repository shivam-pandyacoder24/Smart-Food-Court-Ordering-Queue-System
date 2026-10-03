'use strict';

/**
 * SORTING
 * Used for: ordering the menu by price, popularity or name.
 *
 *   mergeSort  stable, always O(n log n). Used for price and popularity, where
 *              many items tie and should keep their original menu order.
 *   quickSort  in place on a copy, O(n log n) on average. Used for names, which
 *              are unique, so stability does not matter.
 *
 * Neither function changes the array it is given. `compare(a, b)` works like the
 * one passed to Array.prototype.sort: negative when a comes first.
 */

/**
 * @param {Array} items
 * @param {(a: any, b: any) => number} compare
 * @returns {{ sorted: Array, comparisons: number }}
 */
function mergeSort(items, compare) {
  let comparisons = 0;

  function merge(left, right) {
    const merged = [];
    let i = 0;
    let j = 0;

    while (i < left.length && j < right.length) {
      comparisons++;
      // "<=" takes from the left half on a tie, which is what keeps the sort stable.
      if (compare(left[i], right[j]) <= 0) merged.push(left[i++]);
      else merged.push(right[j++]);
    }
    while (i < left.length) merged.push(left[i++]);
    while (j < right.length) merged.push(right[j++]);

    return merged;
  }

  function sort(list) {
    if (list.length <= 1) return list;
    const middle = Math.floor(list.length / 2);
    return merge(sort(list.slice(0, middle)), sort(list.slice(middle)));
  }

  return { sorted: sort(items.slice()), comparisons };
}

/**
 * @param {Array} items
 * @param {(a: any, b: any) => number} compare
 * @returns {{ sorted: Array, comparisons: number }}
 */
function quickSort(items, compare) {
  const sorted = items.slice();
  let comparisons = 0;

  function swap(a, b) {
    const held = sorted[a];
    sorted[a] = sorted[b];
    sorted[b] = held;
  }

  // Lomuto partition. The middle element is the pivot, so input that is
  // already sorted does not trigger the O(n^2) worst case.
  function partition(low, high) {
    swap(low + Math.floor((high - low) / 2), high);
    const pivot = sorted[high];
    let boundary = low;

    for (let i = low; i < high; i++) {
      comparisons++;
      if (compare(sorted[i], pivot) < 0) swap(i, boundary++);
    }
    swap(boundary, high);
    return boundary;
  }

  function sort(low, high) {
    if (low >= high) return;
    const pivotIndex = partition(low, high);
    sort(low, pivotIndex - 1);
    sort(pivotIndex + 1, high);
  }

  sort(0, sorted.length - 1);
  return { sorted, comparisons };
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { mergeSort, quickSort };
