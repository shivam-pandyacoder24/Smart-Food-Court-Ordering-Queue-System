'use strict';

/**
 * GRAPH (undirected, weighted, adjacency lists)
 * Used for: "goes well with" suggestions.
 *
 * Each menu item is a vertex. An edge joins two items that are often ordered
 * together, and its weight says how often. The neighbours of the items in your
 * tray become the suggestions, and a breadth-first search reaches items that
 * are two steps away.
 */

class Graph {
  constructor() {
    // vertex -> list of { id, weight }, kept strongest first
    this.adjacency = new Map();
    this.edges = 0;
  }

  get vertexCount() {
    return this.adjacency.size;
  }

  get edgeCount() {
    return this.edges;
  }

  addVertex(id) {
    if (!this.adjacency.has(id)) this.adjacency.set(id, []);
  }

  hasVertex(id) {
    return this.adjacency.has(id);
  }

  /** Joins two vertices in both directions. Adding the same edge again updates its weight. */
  addEdge(a, b, weight = 1) {
    this.addVertex(a);
    this.addVertex(b);
    if (this.weightBetween(a, b) === 0) this.edges++;
    this.link(a, b, weight);
    this.link(b, a, weight);
  }

  /** Inserts the neighbour so the list stays ordered by weight, like one step of insertion sort. */
  link(from, to, weight) {
    const list = this.adjacency.get(from).filter((edge) => edge.id !== to);
    let position = 0;
    while (position < list.length && list[position].weight >= weight) position++;
    list.splice(position, 0, { id: to, weight });
    this.adjacency.set(from, list);
  }

  /** Weight of the edge between two vertices, or 0 when they are not joined. */
  weightBetween(a, b) {
    const edge = (this.adjacency.get(a) || []).find((candidate) => candidate.id === b);
    return edge ? edge.weight : 0;
  }

  /** Direct neighbours, strongest first. */
  neighbors(id) {
    return (this.adjacency.get(id) || []).slice();
  }

  /**
   * Breadth-first search from `start`.
   * Returns every vertex reached within `maxDepth` steps, nearest first,
   * leaving out the starting vertex.
   * @returns {Array<{ id: any, depth: number }>}
   */
  breadthFirst(start, maxDepth = Infinity) {
    if (!this.hasVertex(start)) return [];

    const reached = [];
    const seen = new Set([start]);
    const toVisit = [{ id: start, depth: 0 }]; // read with an index, so it works as a queue

    for (let next = 0; next < toVisit.length; next++) {
      const { id, depth } = toVisit[next];
      if (depth > 0) reached.push({ id, depth });
      if (depth === maxDepth) continue;

      for (const neighbor of this.adjacency.get(id)) {
        if (seen.has(neighbor.id)) continue;
        seen.add(neighbor.id);
        toVisit.push({ id: neighbor.id, depth: depth + 1 });
      }
    }

    return reached;
  }
}

// Lets the Node test runner load this file. Browsers skip this line.
if (typeof module !== 'undefined') module.exports = { Graph };
