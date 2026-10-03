'use strict';

/**
 * QUEUE (first in, first out)
 * Used for: the kitchen's line of waiting orders.
 *
 * A placed order joins at the rear. The kitchen always takes the order at the
 * front, so nobody can be served before someone who ordered earlier.
 * enqueue and dequeue are O(1) because the queue keeps both a front and a rear
 * pointer.
 */

class QueueNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class Queue {
  constructor() {
    this.front = null;
    this.rear = null;
    this.count = 0;
  }

  get size() {
    return this.count;
  }

  isEmpty() {
    return this.count === 0;
  }

  /** Adds at the rear. */
  enqueue(value) {
    const node = new QueueNode(value);
    if (this.rear === null) this.front = node;
    else this.rear.next = node;
    this.rear = node;
    this.count++;
  }

  /** Removes and returns the value at the front, or null when the queue is empty. */
  dequeue() {
    if (this.front === null) return null;
    const value = this.front.value;
    this.front = this.front.next;
    if (this.front === null) this.rear = null;
    this.count--;
    return value;
  }

  /** Returns the value at the front without removing it, or null. */
  peek() {
    return this.front === null ? null : this.front.value;
  }

  /** 1 for the front of the queue, 2 for the next, ... and 0 when nothing matches. O(n) */
  positionOf(matches) {
    let position = 1;
    for (let node = this.front; node !== null; node = node.next) {
      if (matches(node.value)) return position;
      position++;
    }
    return 0;
  }

  /** Every value from front to rear. O(n) */
  toArray() {
    const values = [];
    for (let node = this.front; node !== null; node = node.next) values.push(node.value);
    return values;
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { Queue };
