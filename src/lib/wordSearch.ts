
export type Direction = 'HORIZONTAL' | 'VERTICAL' | 'DIAGONAL_DOWN' | 'DIAGONAL_UP';

export interface Point {
  row: number;
  col: number;
}

export interface WordLocation {
  word: string;
  start: Point;
  end: Point;
}

export interface GridState {
  grid: string[][];
  words: WordLocation[];
}

const DIRECTIONS: Direction[] = ['HORIZONTAL', 'VERTICAL', 'DIAGONAL_DOWN', 'DIAGONAL_UP'];

export class WordSearchGenerator {
  private rows: number;
  private cols: number;

  constructor(rows: number = 15, cols: number = 15) {
    this.rows = rows;
    this.cols = cols;
  }

  generate(words: string[]): GridState {
    // Initialize empty grid
    let grid: string[][] = Array(this.rows).fill(null).map(() => Array(this.cols).fill(''));
    const placedWords: WordLocation[] = [];

    // Filter out duplicates and sort words by length descending to place longer words first (harder to fit)
    const uniqueWords = Array.from(new Set(words));
    const sortedWords = uniqueWords.sort((a, b) => b.length - a.length);

    for (const word of sortedWords) {
      const placed = this.placeWord(grid, word.toUpperCase());
      if (placed) {
        placedWords.push(placed);
      } else {
        console.warn(`Could not place word: ${word}`);
      }
    }

    // Fill empty cells
    this.fillEmptyCells(grid);

    return { grid, words: placedWords };
  }

  private placeWord(grid: string[][], word: string): WordLocation | null {
    const maxAttempts = 100;
    
    for (let i = 0; i < maxAttempts; i++) {
      const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
      const startRow = Math.floor(Math.random() * this.rows);
      const startCol = Math.floor(Math.random() * this.cols);

      if (this.canPlaceWord(grid, word, startRow, startCol, direction)) {
        const end = this.insertWord(grid, word, startRow, startCol, direction);
        return {
          word,
          start: { row: startRow, col: startCol },
          end,
        };
      }
    }
    return null;
  }

  private canPlaceWord(grid: string[][], word: string, row: number, col: number, direction: Direction): boolean {
    const len = word.length;
    
    // Check bounds
    let endRow = row;
    let endCol = col;
    
    if (direction === 'HORIZONTAL') endCol += len - 1;
    else if (direction === 'VERTICAL') endRow += len - 1;
    else if (direction === 'DIAGONAL_DOWN') { endRow += len - 1; endCol += len - 1; }
    else if (direction === 'DIAGONAL_UP') { endRow -= len - 1; endCol += len - 1; } // Up-Right

    if (endRow < 0 || endRow >= this.rows || endCol < 0 || endCol >= this.cols) return false;

    // Check collisions
    for (let i = 0; i < len; i++) {
      let r = row;
      let c = col;
      if (direction === 'HORIZONTAL') c += i;
      else if (direction === 'VERTICAL') r += i;
      else if (direction === 'DIAGONAL_DOWN') { r += i; c += i; }
      else if (direction === 'DIAGONAL_UP') { r -= i; c += i; }

      const cell = grid[r][c];
      if (cell !== '' && cell !== word[i]) return false;
    }

    return true;
  }

  private insertWord(grid: string[][], word: string, row: number, col: number, direction: Direction): Point {
    const len = word.length;
    let endRow = row;
    let endCol = col;

    for (let i = 0; i < len; i++) {
      let r = row;
      let c = col;
      if (direction === 'HORIZONTAL') c += i;
      else if (direction === 'VERTICAL') r += i;
      else if (direction === 'DIAGONAL_DOWN') { r += i; c += i; }
      else if (direction === 'DIAGONAL_UP') { r -= i; c += i; }

      grid[r][c] = word[i];
      
      if (i === len - 1) {
        endRow = r;
        endCol = c;
      }
    }
    return { row: endRow, col: endCol };
  }

  private fillEmptyCells(grid: string[][]) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (grid[r][c] === '') {
          grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
        }
      }
    }
  }
}
