'use strict';

/**
 * HASH TABLE (separate chaining)
 * Used for: finding an order by its order number, and a customer by their ID.
 *
 * The hash function turns a key into a bucket number, so a lookup goes
 * straight to one bucket instead of scanning every order: O(1) on average.
 * Two keys that land in the same bucket are chained together in a small
 * linked list. When the table gets crowded it doubles in size and every
 * entry is rehashed.
 */

class HashEntry {
  constructor(key, value, next) {
    this.key = key;
    this.value = value;
    this.next = next;
  }
}

class HashTable {
  constructor(capacity = 8) {
    this.buckets = new Array(capacity).fill(null);
    this.count = 0;
  }

  get size() {
    return this.count;
  }

  get capacity() {
    return this.buckets.length;
  }

  /** Entries per bucket. The table grows when this passes MAX_LOAD_FACTOR. */
  get loadFactor() {
    return this.count / this.capacity;
  }

  /**
   * Polynomial rolling hash: h = h * 31 + character code, for each character.
   * Numbers are hashed through their digits, so 1042 and "1042" are the same key.
   */
  hash(key) {
    const text = String(key);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0; // keep it a 32-bit unsigned number
    }
    return hash % this.capacity;
  }

  /** Adds a key, or replaces the value when the key already exists. */
  set(key, value) {
    const text = String(key);
    const index = this.hash(text);

    for (let entry = this.buckets[index]; entry !== null; entry = entry.next) {
      if (entry.key === text) {
        entry.value = value;
        return;
      }
    }

    this.buckets[index] = new HashEntry(text, value, this.buckets[index]);
    this.count++;
    if (this.loadFactor > HashTable.MAX_LOAD_FACTOR) this.resize(this.capacity * 2);
  }

  /**
   * Finds a key and reports the work done.
   * @returns {{ found: boolean, value: any, bucket: number, comparisons: number }}
   */
  lookup(key) {
    const text = String(key);
    const bucket = this.hash(text);
    let comparisons = 0;

    for (let entry = this.buckets[bucket]; entry !== null; entry = entry.next) {
      comparisons++;
      if (entry.key === text) return { found: true, value: entry.value, bucket, comparisons };
    }

    return { found: false, value: undefined, bucket, comparisons };
  }

  /** The value stored for a key, or undefined. */
  get(key) {
    return this.lookup(key).value;
  }

  has(key) {
    return this.lookup(key).found;
  }

  /** Removes a key. Returns true when it was present. */
  delete(key) {
    const text = String(key);
    const index = this.hash(text);
    let previous = null;

    for (let entry = this.buckets[index]; entry !== null; entry = entry.next) {
      if (entry.key === text) {
        if (previous === null) this.buckets[index] = entry.next;
        else previous.next = entry.next;
        this.count--;
        return true;
      }
      previous = entry;
    }

    return false;
  }

  /** Moves every entry into a new, larger array of buckets. */
  resize(newCapacity) {
    const oldBuckets = this.buckets;
    this.buckets = new Array(newCapacity).fill(null);

    for (const head of oldBuckets) {
      for (let entry = head; entry !== null; entry = entry.next) {
        const index = this.hash(entry.key);
        this.buckets[index] = new HashEntry(entry.key, entry.value, this.buckets[index]);
      }
    }
  }

  /** Every stored value, in bucket order. */
  values() {
    const values = [];
    for (const head of this.buckets) {
      for (let entry = head; entry !== null; entry = entry.next) values.push(entry.value);
    }
    return values;
  }

  /** The keys chained in each bucket, for displaying the table. */
  chains() {
    return this.buckets.map((head) => {
      const keys = [];
      for (let entry = head; entry !== null; entry = entry.next) keys.push(entry.key);
      return keys;
    });
  }
}

HashTable.MAX_LOAD_FACTOR = 0.75;

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { HashTable, HashEntry };
