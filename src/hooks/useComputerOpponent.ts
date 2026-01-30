/**
 * useComputerOpponent Hook
 *
 * Manages the CPU opponent's behavior in turn-based mode.
 * The CPU waits for its turn, "thinks" for a random duration,
 * and then plays a move.
 */

import { useEffect, useRef, useCallback } from "react";
import { WordSearchSolver } from "@/lib/dsa/WordSearchSolver";
import { WordLocation } from "@/lib/wordSearch";

interface UseComputerOpponentProps {
  grid: string[][] | null;
  words: string[];
  playerFoundWords: string[];
  cpuFoundWords: string[];
  onCpuFoundWord: (location: WordLocation) => void;
  isCpuTurn: boolean;
  gameActive: boolean;
}

export function useComputerOpponent({
  grid,
  words,
  playerFoundWords,
  cpuFoundWords,
  onCpuFoundWord,
  isCpuTurn,
  gameActive,
}: UseComputerOpponentProps) {
  const solverRef = useRef<WordSearchSolver | null>(null);
  const turnTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize solver
  useEffect(() => {
    if (grid && words.length > 0) {
      solverRef.current = new WordSearchSolver(grid, words);
    }
  }, [grid, words]);

  // Handle Turn Logic
  useEffect(() => {
    // Clear any pending moves if it's not our turn or game is over
    if (!isCpuTurn || !gameActive) {
      if (turnTimeoutRef.current) {
        clearTimeout(turnTimeoutRef.current);
        turnTimeoutRef.current = null;
      }
      return;
    }

    if (!solverRef.current) return;

    // "Thinking" time: Random between 2s and 5s
    // Must be fast enough to fit in the turn limit
    const thinkingTime = Math.random() * 3000 + 2000;

    turnTimeoutRef.current = setTimeout(() => {
      const allFoundWords = [...playerFoundWords, ...cpuFoundWords];

      // Attempt to find a word
      // Max budget is high because it's turn-based (we assume CPU is smart)
      const result = solverRef.current?.findNextWord(allFoundWords, 500);

      if (result) {
        const location: WordLocation = {
          word: result.word,
          start: result.start,
          end: result.end,
        };
        onCpuFoundWord(location);
      } else {
        // CPU couldn't find a word (rare with high budget, but possible if board is cleared)
        // In a real game, maybe it passes? For now, do nothing and let timer run out.
      }
    }, thinkingTime);

    return () => {
      if (turnTimeoutRef.current) {
        clearTimeout(turnTimeoutRef.current);
      }
    };
  }, [isCpuTurn, gameActive, playerFoundWords, cpuFoundWords, onCpuFoundWord]);
}
