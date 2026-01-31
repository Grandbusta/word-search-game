/**
 * Word Search Solver using DFS + Trie
 *
 * This solver uses Depth-First Search (DFS) to explore the grid,
 * combined with a Trie for efficient prefix validation. This combination
 * allows us to prune invalid paths early, dramatically reducing search space.
 *
 * Algorithm Overview:
 * 1. Build a Trie from the target words
 * 2. For each cell in the grid, start a DFS
 * 3. At each step, check if current path is a valid prefix (via Trie)
 * 4. If prefix is invalid, prune (backtrack immediately)
 * 5. If prefix is a complete word, record the find
 *
 * Time Complexity: O(M * N * 4^L) worst case, but Trie pruning makes it much faster
 * Space Complexity: O(L) for recursion stack + O(W * K) for Trie
 *
 * Where M*N is grid size, L is max word length, W is word count, K is avg word length
 */

import { Trie, TrieNode } from "./Trie";

export interface Point {
  row: number;
  col: number;
}

export interface FoundWord {
  word: string;
  start: Point;
  end: Point;
  path: Point[];
}

// 8 directions: horizontal, vertical, and diagonal
const DIRECTIONS: [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1], // top-left, top, top-right
  [0, -1],
  [0, 1], // left, right
  [1, -1],
  [1, 0],
  [1, 1], // bottom-left, bottom, bottom-right
];

export class WordSearchSolver {
  private grid: string[][];
  private rows: number;
  private cols: number;
  private trie: Trie;
  private foundWords: Set<string>;
  private solutions: FoundWord[];

  constructor(grid: string[][], words: string[]) {
    this.grid = grid;
    this.rows = grid.length;
    this.cols = grid[0]?.length || 0;
    this.trie = Trie.fromWords(words);
    this.foundWords = new Set();
    this.solutions = [];
  }

  /**
   * Find all words in the grid.
   * Returns array of found words with their locations.
   */
  findAllWords(): FoundWord[] {
    this.foundWords.clear();
    this.solutions = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.dfs(row, col, "", [], new Set());
      }
    }

    return this.solutions;
  }

  /**
   * Find the next word from a random starting position.
   * This is used for the "thinking" simulation where the CPU
   * doesn't instantly solve the board.
   *
   * @param alreadyFound Words that have already been found (by player or CPU)
   * @param maxAttempts Limit search attempts to simulate "thinking time"
   */
  findNextWord(
    alreadyFound: string[],
    maxAttempts: number = 100,
  ): FoundWord | null {
    const foundSet = new Set(alreadyFound);
    let attempts = 0;

    // Randomize starting positions for variety
    const positions = this.getShuffledPositions();

    for (const { row, col } of positions) {
      if (attempts >= maxAttempts) break;

      const result = this.searchFromCell(
        row,
        col,
        foundSet,
        maxAttempts - attempts,
      );
      attempts += result.attempts;

      if (result.found && !foundSet.has(result.found.word)) {
        return result.found;
      }
    }

    return null;
  }

  /**
   * DFS from a specific cell with attempt limiting.
   */
  private searchFromCell(
    startRow: number,
    startCol: number,
    excludeWords: Set<string>,
    maxAttempts: number,
  ): { found: FoundWord | null; attempts: number } {
    let attempts = 0;
    let found: FoundWord | null = null;

    const dfs = (
      row: number,
      col: number,
      currentWord: string,
      path: Point[],
      visited: Set<string>,
    ): boolean => {
      if (attempts >= maxAttempts) return false;
      attempts++;

      // Bounds check
      if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
        return false;
      }

      const key = `${row},${col}`;
      if (visited.has(key)) return false;

      const char = this.grid[row][col];
      const newWord = currentWord + char;

      // Trie pruning: if no word starts with this prefix, stop
      const trieNode = this.trie.getNode(newWord);
      if (!trieNode) return false;

      const newPath = [...path, { row, col }];
      const newVisited = new Set(visited);
      newVisited.add(key);

      // Check if we found a complete word
      if (
        trieNode.isEndOfWord &&
        trieNode.word &&
        !excludeWords.has(trieNode.word)
      ) {
        found = {
          word: trieNode.word,
          start: path[0] || { row, col },
          end: { row, col },
          path: newPath,
        };
        return true;
      }

      // Continue DFS in all 8 directions
      for (const [dr, dc] of DIRECTIONS) {
        if (dfs(row + dr, col + dc, newWord, newPath, newVisited)) {
          return true;
        }
      }

      return false;
    };

    dfs(startRow, startCol, "", [], new Set());
    return { found, attempts };
  }

  /**
   * Standard DFS for finding all words.
   */
  private dfs(
    row: number,
    col: number,
    currentWord: string,
    path: Point[],
    visited: Set<string>,
  ): void {
    // Bounds check
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return;
    }

    const key = `${row},${col}`;
    if (visited.has(key)) return;

    const char = this.grid[row][col];
    const newWord = currentWord + char;

    // Trie pruning: if no word starts with this prefix, stop early
    const trieNode = this.trie.getNode(newWord);
    if (!trieNode) return;

    const newPath = [...path, { row, col }];
    const newVisited = new Set(visited);
    newVisited.add(key);

    // Check if we found a complete word
    if (
      trieNode.isEndOfWord &&
      trieNode.word &&
      !this.foundWords.has(trieNode.word)
    ) {
      this.foundWords.add(trieNode.word);
      this.solutions.push({
        word: trieNode.word,
        start: path[0] || { row, col },
        end: { row, col },
        path: newPath,
      });
    }

    // Continue DFS in all 8 directions
    for (const [dr, dc] of DIRECTIONS) {
      this.dfs(row + dr, col + dc, newWord, newPath, newVisited);
    }
  }

  /**
   * Get grid positions in random order for variety in CPU behavior.
   */
  private getShuffledPositions(): Point[] {
    const positions: Point[] = [];
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        positions.push({ row, col });
      }
    }
    // Fisher-Yates shuffle
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    return positions;
  }
}
