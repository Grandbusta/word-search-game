/**
 * Trie (Prefix Tree) Data Structure
 *
 * A tree-like data structure for efficient string storage and retrieval.
 * Each node represents a character, and paths from root to leaf nodes spell out words.
 *
 * Time Complexity:
 * - Insert: O(L) where L is the length of the word
 * - Search: O(L)
 * - StartsWith: O(L)
 *
 * Space Complexity: O(N * M) where N is number of words and M is average word length
 */

export interface TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  word: string | null; // Store the complete word at end nodes for easy retrieval
}

export class Trie {
  private root: TrieNode;

  constructor() {
    this.root = this.createNode();
  }

  private createNode(): TrieNode {
    return {
      children: new Map(),
      isEndOfWord: false,
      word: null,
    };
  }

  /**
   * Insert a word into the Trie.
   * Time: O(L) where L is word length
   */
  insert(word: string): void {
    let current = this.root;
    const upperWord = word.toUpperCase();

    for (const char of upperWord) {
      if (!current.children.has(char)) {
        current.children.set(char, this.createNode());
      }
      current = current.children.get(char)!;
    }

    current.isEndOfWord = true;
    current.word = upperWord;
  }

  /**
   * Check if an exact word exists in the Trie.
   * Time: O(L)
   */
  search(word: string): boolean {
    const node = this.traverse(word.toUpperCase());
    return node !== null && node.isEndOfWord;
  }

  /**
   * Check if any word in the Trie starts with the given prefix.
   * This is crucial for pruning DFS paths early.
   * Time: O(L)
   */
  startsWith(prefix: string): boolean {
    return this.traverse(prefix.toUpperCase()) !== null;
  }

  /**
   * Get the node at the end of the prefix path, or null if path doesn't exist.
   */
  getNode(prefix: string): TrieNode | null {
    return this.traverse(prefix.toUpperCase());
  }

  /**
   * Internal traversal helper.
   */
  private traverse(str: string): TrieNode | null {
    let current = this.root;

    for (const char of str) {
      if (!current.children.has(char)) {
        return null;
      }
      current = current.children.get(char)!;
    }

    return current;
  }

  /**
   * Build a Trie from an array of words.
   * Factory method for convenience.
   */
  static fromWords(words: string[]): Trie {
    const trie = new Trie();
    for (const word of words) {
      trie.insert(word);
    }
    return trie;
  }
}
