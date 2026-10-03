'use strict';

/**
 * STACK (last in, first out)
 * Used for: the tray's "Undo" button.
 *
 * Every change to the tray is pushed here. Undo pops the most recent change
 * and reverses it, so changes are always undone newest first.
 * push, pop and peek are all O(1).
 */

class StackNode {
  constructor(value, below) {
    this.value = value;
    this.below = below;
  }
}

class Stack {
  constructor() {
    this.top = null;
    this.count = 0;
  }

  get size() {
    return this.count;
  }

  isEmpty() {
    return this.count === 0;
  }

  push(value) {
    this.top = new StackNode(value, this.top);
    this.count++;
  }

  /** Removes and returns the newest value, or null when the stack is empty. */
  pop() {
    if (this.top === null) return null;
    const value = this.top.value;
    this.top = this.top.below;
    this.count--;
    return value;
  }

  /** Returns the newest value without removing it, or null. */
  peek() {
    return this.top === null ? null : this.top.value;
  }

  clear() {
    this.top = null;
    this.count = 0;
  }

  /** Every value from top to bottom. O(n) */
  toArray() {
    const values = [];
    for (let node = this.top; node !== null; node = node.below) values.push(node.value);
    return values;
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { Stack };
