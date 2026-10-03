'use strict';

/**
 * TREE 2: binary search tree
 * Used for: looking up menu items by name, and the search box suggestions.
 *
 * Keys are item names in lower case. Smaller keys go left, larger keys go
 * right, so a lookup discards half of a balanced tree on every step: O(log n).
 * An in-order walk visits the names alphabetically, which is how the search
 * box lists every name that starts with what you typed.
 */

class BstNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

class BinarySearchTree {
  constructor() {
    this.root = null;
    this.count = 0;
  }

  /**
   * Builds a balanced tree from entries sorted by key: the middle entry becomes
   * the root, and each half is built the same way. Inserting sorted keys one
   * after another would instead produce a tall, list-like tree.
   * @param {Array<{ key: string, value: any }>} sortedEntries
   */
  static fromSorted(sortedEntries) {
    const tree = new BinarySearchTree();

    function insertMiddle(low, high) {
      if (low > high) return;
      const middle = Math.floor((low + high) / 2);
      tree.insert(sortedEntries[middle].key, sortedEntries[middle].value);
      insertMiddle(low, middle - 1);
      insertMiddle(middle + 1, high);
    }

    insertMiddle(0, sortedEntries.length - 1);
    return tree;
  }

  get size() {
    return this.count;
  }

  /** Adds a key, or replaces the value when the key already exists. */
  insert(key, value) {
    const node = new BstNode(key, value);
    if (this.root === null) {
      this.root = node;
      this.count++;
      return;
    }

    let current = this.root;
    while (true) {
      if (key === current.key) {
        current.value = value;
        return;
      }
      const side = key < current.key ? 'left' : 'right';
      if (current[side] === null) {
        current[side] = node;
        this.count++;
        return;
      }
      current = current[side];
    }
  }

  /**
   * Looks up one key and reports the route taken from the root.
   * @returns {{ found: boolean, value: any, path: string[], comparisons: number }}
   */
  search(key) {
    const path = [];
    let current = this.root;

    while (current !== null) {
      path.push(current.key);
      if (key === current.key) {
        return { found: true, value: current.value, path, comparisons: path.length };
      }
      current = key < current.key ? current.left : current.right;
    }

    return { found: false, value: null, path, comparisons: path.length };
  }

  /**
   * Values whose key starts with `prefix`, in alphabetical order.
   * Subtrees that cannot contain a match are skipped.
   * @returns {{ values: Array, visited: number }}
   */
  withPrefix(prefix, limit = Infinity) {
    const values = [];
    let visited = 0;

    function visit(node) {
      if (node === null || values.length >= limit) return;
      visited++;
      const matches = node.key.startsWith(prefix);

      if (matches || node.key > prefix) visit(node.left);
      if (matches && values.length < limit) values.push(node.value);
      if (matches || node.key < prefix) visit(node.right);
    }

    visit(this.root);
    return { values, visited };
  }

  /** Every entry in key order. */
  inOrder() {
    const entries = [];

    function visit(node) {
      if (node === null) return;
      visit(node.left);
      entries.push({ key: node.key, value: node.value });
      visit(node.right);
    }

    visit(this.root);
    return entries;
  }

  /** Number of levels: an empty tree has height 0. */
  height() {
    function measure(node) {
      return node === null ? 0 : 1 + Math.max(measure(node.left), measure(node.right));
    }
    return measure(this.root);
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { BinarySearchTree, BstNode };
