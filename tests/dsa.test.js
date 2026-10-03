'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

require('./helpers/load.js');

test('linear search returns every match and counts one comparison per element', () => {
  const result = linearSearch([4, 9, 2, 9, 7], (value) => value === 9);
  assert.deepEqual(result.found, [9, 9]);
  assert.equal(result.comparisons, 5);
});

test('binary search finds a key in a sorted array in at most log2(n) + 1 steps', () => {
  const sorted = Array.from({ length: 100 }, (_, index) => ({ id: index * 2 }));

  const hit = binarySearch(sorted, 84, (entry) => entry.id);
  assert.equal(hit.index, 42);
  assert.equal(hit.item.id, 84);
  assert.ok(hit.comparisons <= 7);

  const miss = binarySearch(sorted, 85, (entry) => entry.id);
  assert.equal(miss.index, -1);
  assert.equal(miss.item, null);
});

test('merge sort and quick sort agree with the built-in sort and leave the input alone', () => {
  const numbers = [38, 27, 43, 3, 9, 82, 10, 3, 27, 1];
  const expected = numbers.slice().sort((a, b) => a - b);
  const before = numbers.slice();

  assert.deepEqual(mergeSort(numbers, (a, b) => a - b).sorted, expected);
  assert.deepEqual(quickSort(numbers, (a, b) => a - b).sorted, expected);
  assert.deepEqual(numbers, before);
  assert.deepEqual(mergeSort([], (a, b) => a - b).sorted, []);
  assert.deepEqual(quickSort([5], (a, b) => a - b).sorted, [5]);
});

test('merge sort is stable: items that tie keep their original order', () => {
  const items = [
    { name: 'a', price: 20 },
    { name: 'b', price: 10 },
    { name: 'c', price: 20 },
    { name: 'd', price: 10 },
  ];
  const names = mergeSort(items, (a, b) => a.price - b.price).sorted.map((item) => item.name);
  assert.deepEqual(names, ['b', 'd', 'a', 'c']);
});

test('linked list adds at both ends and reads head to tail', () => {
  const list = new LinkedList();
  assert.equal(list.isEmpty(), true);

  list.addFirst('second');
  list.addFirst('first');
  list.addLast('third');

  assert.deepEqual(list.toArray(), ['first', 'second', 'third']);
  assert.equal(list.size, 3);
  assert.equal(list.find((value) => value.startsWith('th')), 'third');
  assert.equal(list.removeFirst(), 'first');
  assert.deepEqual(list.toArray(), ['second', 'third']);
});

test('stack is last in, first out', () => {
  const stack = new Stack();
  stack.push('a');
  stack.push('b');
  stack.push('c');

  assert.equal(stack.peek(), 'c');
  assert.deepEqual(stack.toArray(), ['c', 'b', 'a']);
  assert.equal(stack.pop(), 'c');
  assert.equal(stack.pop(), 'b');
  assert.equal(stack.size, 1);
  assert.equal(stack.pop(), 'a');
  assert.equal(stack.pop(), null);
  assert.equal(stack.isEmpty(), true);
});

test('queue is first in, first out', () => {
  const queue = new Queue();
  queue.enqueue(1038);
  queue.enqueue(1039);
  queue.enqueue(1040);

  assert.equal(queue.peek(), 1038);
  assert.equal(queue.positionOf((id) => id === 1040), 3);
  assert.equal(queue.positionOf((id) => id === 9999), 0);
  assert.equal(queue.dequeue(), 1038);
  assert.equal(queue.dequeue(), 1039);
  assert.deepEqual(queue.toArray(), [1040]);
  assert.equal(queue.dequeue(), 1040);
  assert.equal(queue.dequeue(), null);

  queue.enqueue(1041); // still usable after being emptied
  assert.equal(queue.peek(), 1041);
  assert.equal(queue.size, 1);
});

test('category tree finds nodes, paths and whole subtrees', () => {
  const tree = CategoryTree.fromNested(MENU_CATEGORIES);

  assert.equal(tree.find('cold-drinks').name, 'Cold');
  assert.equal(tree.find('nowhere'), null);
  assert.deepEqual(tree.pathTo('south-indian').map((node) => node.id), ['menu', 'meals', 'south-indian']);
  assert.deepEqual(tree.subtreeIds('drinks'), ['drinks', 'hot-drinks', 'cold-drinks']);
  assert.equal(tree.subtreeIds('menu').length, tree.size);
  assert.equal(tree.height(), 3);
  assert.throws(() => tree.add('nowhere', 'x', 'X'));
});

test('binary search tree keeps keys in order and looks them up along one path', () => {
  const tree = new BinarySearchTree();
  for (const key of ['m', 'f', 't', 'b', 'h', 'p', 'w']) tree.insert(key, key.toUpperCase());

  assert.equal(tree.size, 7);
  assert.equal(tree.height(), 3);
  assert.deepEqual(tree.inOrder().map((entry) => entry.key), ['b', 'f', 'h', 'm', 'p', 't', 'w']);

  const hit = tree.search('h');
  assert.equal(hit.value, 'H');
  assert.deepEqual(hit.path, ['m', 'f', 'h']);
  assert.equal(tree.search('z').found, false);

  tree.insert('h', 'replaced');
  assert.equal(tree.size, 7);
  assert.equal(tree.search('h').value, 'replaced');
});

test('a tree built from sorted entries is balanced, and prefix search is alphabetical', () => {
  const names = MENU_ITEMS.map((item) => item.name.toLowerCase()).sort();
  const tree = BinarySearchTree.fromSorted(names.map((name) => ({ key: name, value: name })));

  assert.equal(tree.size, names.length);
  assert.equal(tree.height(), Math.ceil(Math.log2(names.length + 1)));

  const expected = names.filter((name) => name.startsWith('ma'));
  assert.deepEqual(tree.withPrefix('ma').values, expected);
  assert.deepEqual(tree.withPrefix('ma', 2).values, expected.slice(0, 2));
  assert.deepEqual(tree.withPrefix('zz').values, []);
  assert.ok(tree.withPrefix('ma').visited < names.length);
});

test('graph edges are two-way, sorted by weight, and searched breadth first', () => {
  const graph = new Graph();
  graph.addEdge('dosa', 'coffee', 5);
  graph.addEdge('dosa', 'vada', 3);
  graph.addEdge('coffee', 'idli', 4);
  graph.addEdge('idli', 'chutney', 1);

  assert.equal(graph.vertexCount, 5);
  assert.equal(graph.edgeCount, 4);
  assert.equal(graph.weightBetween('coffee', 'dosa'), 5);
  assert.deepEqual(graph.neighbors('dosa'), [
    { id: 'coffee', weight: 5 },
    { id: 'vada', weight: 3 },
  ]);

  assert.deepEqual(graph.breadthFirst('dosa', 2), [
    { id: 'coffee', depth: 1 },
    { id: 'vada', depth: 1 },
    { id: 'idli', depth: 2 },
  ]);
  assert.equal(graph.breadthFirst('dosa').length, 4);
  assert.deepEqual(graph.breadthFirst('missing'), []);

  graph.addEdge('dosa', 'vada', 9); // same edge again only updates the weight
  assert.equal(graph.edgeCount, 4);
  assert.equal(graph.neighbors('dosa')[0].id, 'vada');
});

test('hash table stores, replaces, deletes and grows without losing entries', () => {
  const table = new HashTable(4);
  for (let id = 1000; id < 1100; id++) table.set(id, `order ${id}`);

  assert.equal(table.size, 100);
  assert.ok(table.capacity > 4);
  assert.ok(table.loadFactor <= HashTable.MAX_LOAD_FACTOR);
  for (let id = 1000; id < 1100; id++) assert.equal(table.get(id), `order ${id}`);

  assert.equal(table.get('1042'), 'order 1042'); // numbers and digit strings are the same key
  table.set(1042, 'changed');
  assert.equal(table.size, 100);
  assert.equal(table.get(1042), 'changed');

  assert.equal(table.delete(1042), true);
  assert.equal(table.delete(1042), false);
  assert.equal(table.has(1042), false);
  assert.equal(table.get(1042), undefined);
  assert.equal(table.size, 99);
});

test('hash table chains colliding keys in one bucket and still finds each of them', () => {
  const table = new HashTable(8);
  const keys = ['1038', '1039', '1040', '1041', '1042'];
  keys.forEach((key) => table.set(key, key));

  const chains = table.chains();
  assert.equal(chains.length, 8);
  assert.equal(chains.flat().length, keys.length);
  assert.ok(chains.some((chain) => chain.length > 1), 'expected at least one collision');

  for (const key of keys) {
    const lookup = table.lookup(key);
    assert.equal(lookup.found, true);
    assert.ok(chains[lookup.bucket].includes(key));
    assert.ok(lookup.comparisons <= chains[lookup.bucket].length);
  }
});
