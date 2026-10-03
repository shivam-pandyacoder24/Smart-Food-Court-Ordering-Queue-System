'use strict';

/**
 * SINGLY LINKED LIST
 * Used for: each customer's order history.
 *
 * A new order is added at the head in O(1), so walking the list from the head
 * reads the history newest first without any sorting.
 */

class ListNode {
  constructor(value, next = null) {
    this.value = value;
    this.next = next;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  get size() {
    return this.length;
  }

  isEmpty() {
    return this.length === 0;
  }

  /** Adds at the front. O(1) */
  addFirst(value) {
    this.head = new ListNode(value, this.head);
    if (this.tail === null) this.tail = this.head;
    this.length++;
  }

  /** Adds at the end. O(1) because the list keeps a tail pointer. */
  addLast(value) {
    const node = new ListNode(value);
    if (this.tail === null) this.head = node;
    else this.tail.next = node;
    this.tail = node;
    this.length++;
  }

  /** Removes and returns the first value, or null when the list is empty. O(1) */
  removeFirst() {
    if (this.head === null) return null;
    const value = this.head.value;
    this.head = this.head.next;
    if (this.head === null) this.tail = null;
    this.length--;
    return value;
  }

  /** Returns the first value that passes the test, or null. O(n) */
  find(matches) {
    for (let node = this.head; node !== null; node = node.next) {
      if (matches(node.value)) return node.value;
    }
    return null;
  }

  /** Every value from head to tail. O(n) */
  toArray() {
    const values = [];
    for (let node = this.head; node !== null; node = node.next) values.push(node.value);
    return values;
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { LinkedList, ListNode };
