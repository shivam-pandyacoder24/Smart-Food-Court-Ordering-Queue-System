'use strict';

/**
 * TREE 1: general (n-ary) tree
 * Used for: menu categories.
 *
 *   All items
 *   ├── Meals
 *   │   ├── South Indian
 *   │   └── North Indian
 *   └── Drinks
 *       ├── Hot
 *       └── Cold
 *
 * Choosing "Meals" shows every item in its whole subtree, and the breadcrumb
 * above the menu is the path from the root to the chosen category.
 */

class CategoryNode {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.parent = null;
    this.children = [];
  }
}

class CategoryTree {
  constructor(rootId, rootName) {
    this.root = new CategoryNode(rootId, rootName);
    this.count = 1;
  }

  /** Builds a tree from nested data: { id, name, children: [...] } */
  static fromNested(definition) {
    const tree = new CategoryTree(definition.id, definition.name);

    function addChildren(parentId, children = []) {
      for (const child of children) {
        tree.add(parentId, child.id, child.name);
        addChildren(child.id, child.children);
      }
    }

    addChildren(definition.id, definition.children);
    return tree;
  }

  get size() {
    return this.count;
  }

  /** Adds a category under an existing parent and returns the new node. */
  add(parentId, id, name) {
    const parent = this.find(parentId);
    if (parent === null) throw new Error(`Unknown parent category: ${parentId}`);

    const node = new CategoryNode(id, name);
    node.parent = parent;
    parent.children.push(node);
    this.count++;
    return node;
  }

  /** Depth-first search for a category. Returns the node, or null. O(n) */
  find(id) {
    function search(node) {
      if (node.id === id) return node;
      for (const child of node.children) {
        const match = search(child);
        if (match !== null) return match;
      }
      return null;
    }
    return search(this.root);
  }

  /** The nodes from the root down to the category. Empty when the id is unknown. */
  pathTo(id) {
    const path = [];
    for (let node = this.find(id); node !== null; node = node.parent) path.unshift(node);
    return path;
  }

  /** The ids of a category and everything below it, in pre-order. */
  subtreeIds(id) {
    const start = this.find(id);
    const ids = [];

    function collect(node) {
      ids.push(node.id);
      node.children.forEach(collect);
    }

    if (start !== null) collect(start);
    return ids;
  }

  /** Pre-order walk. `visit` receives each node and its depth (root = 0). */
  walk(visit) {
    function step(node, depth) {
      visit(node, depth);
      node.children.forEach((child) => step(child, depth + 1));
    }
    step(this.root, 0);
  }

  /** Number of levels: a tree with only a root has height 1. */
  height() {
    function measure(node) {
      let tallest = 0;
      for (const child of node.children) tallest = Math.max(tallest, measure(child));
      return tallest + 1;
    }
    return measure(this.root);
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { CategoryTree, CategoryNode };
