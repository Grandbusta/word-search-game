
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { WordSearchGenerator, GridState, Point } from '@/lib/wordSearch';
import { getRandomWords } from '@/lib/wordData';
import { sounds } from '@/lib/sounds';

export default function WordSearchGame() {
  const [gameState, setGameState] = useState<GridState | null>(null);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Point | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<Point | null>(null);
  const [gridSize, setGridSize] = useState({ rows: 15, cols: 15 });
  const [popup, setPopup] = useState<{ word: string; points?: number; type: 'success' | 'error' | 'level_complete' } | null>(null);
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [showIntro, setShowIntro] = useState(true);
  const [level, setLevel] = useState(1);
  const [timer, setTimer] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Accessibility: Keyboard navigation state
  const [focusedCell, setFocusedCell] = useState<Point | null>(null);
  const [isKeyboardSelecting, setIsKeyboardSelecting] = useState(false);
  const [keyboardSelectionStart, setKeyboardSelectionStart] = useState<Point | null>(null);
  
  // Accessibility: Screen reader announcements
  const [announcement, setAnnouncement] = useState<string>('');

  // Refs for calculating line positions
  const gridRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startNewGame = useCallback((levelOverride?: number) => {
    const currentLevel = levelOverride ?? level;
    let rows = 10;
    let cols = 10;
    let wordCount = 5;
    let timeLimit = 60; // 1 minute for easy

    if (currentLevel === 2) { rows = 12; cols = 12; wordCount = 10; timeLimit = 120; }
    if (currentLevel >= 3) { rows = 15; cols = 15; wordCount = 15; timeLimit = 180; }

    setGridSize({ rows, cols });
    const words = getRandomWords(wordCount);
    setCurrentWords(words);
    
    // We need to generate with the NEW size, so we can't rely on gridSize state immediately if we just set it
    // Pass explicit rows/cols to generator
    const generator = new WordSearchGenerator(rows, cols);
    const state = generator.generate(words);
    
    // Update currentWords to match what was actually placed (in case generation failed for some)
    const actuallyPlacedWords = state.words.map(w => w.word);
    setCurrentWords(actuallyPlacedWords);
    
    setGameState(state);
    setFoundWords([]);
    setScore(0);
    setPopup(null);
    setTimer(timeLimit);
    setGameOver(false);
  }, [level]);

  useEffect(() => {
    if (timer > 0 && !gameOver && !showIntro && popup?.type !== 'level_complete') {
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
             setGameOver(true);
             setPopup({ word: "Time's Up!", type: 'error' });
             sounds.playError();
             return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timer, gameOver, showIntro, popup]);

  useEffect(() => {
    // Wrap in setTimeout to avoid "synchronous setState in effect" warning/error
    // This pushes the state updates to the next tick
    const timer = setTimeout(() => {
      startNewGame();
    }, 0);
    return () => clearTimeout(timer);
  }, [startNewGame]);

  const handleMouseDown = (row: number, col: number) => {
    // If game over or level complete popup is showing, don't start selection
    if (popup?.type === 'level_complete' || (popup?.type === 'error' && popup?.word === "Time's Up!")) {
      return;
    }
    if (gameOver) return;
    sounds.resume();
    setIsSelecting(true);
    setSelectionStart({ row, col });
    setSelectionEnd({ row, col });
    sounds.playSelectStart();
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isSelecting) {
      if (selectionEnd?.row !== row || selectionEnd?.col !== col) {
        setSelectionEnd({ row, col });
        sounds.playHover();
      }
    }
  };

  const handleMouseUp = () => {
    // If game over or level complete popup is showing, don't close it on click
    if (popup?.type === 'level_complete' || (popup?.type === 'error' && popup?.word === "Time's Up!")) {
      return;
    }

    if (gameOver || !isSelecting || !selectionStart || !selectionEnd || !gameState) return;

    // Check if the selection matches any word
    const selectedWord = getSelectedWord(gameState.grid, selectionStart, selectionEnd);
    if (selectedWord) {
      // Check if it's in the list and not already found
      // We need to check exact coordinates to distinguish same words in diff places (rare but possible)
      // For now, just check word string matching and ensure it's a valid location
      const match = gameState.words.find(w => 
        w.word === selectedWord && 
        isSameLine(w.start, w.end, selectionStart, selectionEnd)
      );

      if (match) {
        if (!foundWords.includes(match.word)) {
          setFoundWords([...foundWords, match.word]);
          // Dynamic scoring: 1 point per letter
          const points = match.word.length;
          setScore(score + points);
          sounds.playSuccess();
          
          // Check for level completion
          if (foundWords.length + 1 === currentWords.length) {
             setPopup({ word: "Level Complete!", points: 50, type: 'level_complete' });
             sounds.playLevelComplete();
             setGameOver(true); // Stop the timer and game interactions
          } else {
             // Show popup
             setPopup({ word: match.word, points, type: 'success' });
             setTimeout(() => setPopup(null), 500);
          }
        } else {
          // Already found
          setPopup({ word: "Already Found!", type: 'error' });
          sounds.playError();
          setTimeout(() => setPopup(null), 300);
        }
      } else {
        // Not a word
        setPopup({ word: "Wrong!", type: 'error' });
        sounds.playError();
        setTimeout(() => setPopup(null), 300);
      }
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    // If game over or level complete popup is showing, don't start selection
    if (popup?.type === 'level_complete' || (popup?.type === 'error' && popup?.word === "Time's Up!")) {
      return;
    }
    if (gameOver) return;
    sounds.resume();
    // Prevent default to stop scrolling while playing
    // e.preventDefault(); // React synthetic events might complain, handled via CSS touch-action usually
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element instanceof HTMLElement && element.dataset.row && element.dataset.col) {
      const row = parseInt(element.dataset.row);
      const col = parseInt(element.dataset.col);
      handleMouseDown(row, col);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element instanceof HTMLElement && element.dataset.row && element.dataset.col) {
      const row = parseInt(element.dataset.row);
      const col = parseInt(element.dataset.col);
      
      // Update selection if we moved to a new cell
      if (isSelecting) {
        setSelectionEnd({ row, col });
      }
    }
  };

  const handleTouchEnd = () => {
    // If game over or level complete popup is showing, don't close it on click
    if (popup?.type === 'level_complete' || (popup?.type === 'error' && popup?.word === "Time's Up!")) {
      return;
    }
    handleMouseUp();
  };

  // Helper to get coordinates for SVG lines
  // We assume each cell is a fixed size or we calculate based on percentages/refs
  // For simplicity, let's use percentage based on row/col count
  const getLineCoords = (start: Point, end: Point) => {
    const cellWidth = 100 / gridSize.cols;
    const cellHeight = 100 / gridSize.rows;
    
    const x1 = (start.col * cellWidth) + (cellWidth / 2);
    const y1 = (start.row * cellHeight) + (cellHeight / 2);
    const x2 = (end.col * cellWidth) + (cellWidth / 2);
    const y2 = (end.row * cellHeight) + (cellHeight / 2);

    return { x1: `${x1}%`, y1: `${y1}%`, x2: `${x2}%`, y2: `${y2}%` };
  };

  // Accessibility: Cancel keyboard selection
  const cancelKeyboardSelection = useCallback(() => {
    setIsKeyboardSelecting(false);
    setKeyboardSelectionStart(null);
    setSelectionStart(null);
    setSelectionEnd(null);
    setAnnouncement('Selection cancelled');
  }, []);

  // Accessibility: Complete keyboard selection and validate word
  const completeKeyboardSelection = useCallback((endCell: Point) => {
    if (!keyboardSelectionStart || !gameState) {
      cancelKeyboardSelection();
      return;
    }

    const selectedWord = getSelectedWord(gameState.grid, keyboardSelectionStart, endCell);
    
    if (selectedWord) {
      const match = gameState.words.find(w => 
        w.word === selectedWord && 
        isSameLine(w.start, w.end, keyboardSelectionStart, endCell)
      );

      if (match) {
        if (!foundWords.includes(match.word)) {
          const newFoundWords = [...foundWords, match.word];
          setFoundWords(newFoundWords);
          const points = match.word.length;
          setScore(score + points);
          sounds.playSuccess();
          
          // Announce for screen readers
          setAnnouncement(`Found ${match.word}, ${points} points`);
          
          if (newFoundWords.length === currentWords.length) {
            setPopup({ word: "Level Complete!", points: 50, type: 'level_complete' });
            sounds.playLevelComplete();
            setGameOver(true);
            setAnnouncement(`Level ${level} complete! All words found.`);
          } else {
            setPopup({ word: match.word, points, type: 'success' });
            setTimeout(() => setPopup(null), 500);
          }
        } else {
          setPopup({ word: "Already Found!", type: 'error' });
          sounds.playError();
          setAnnouncement('Word already found');
          setTimeout(() => setPopup(null), 300);
        }
      } else {
        setPopup({ word: "Wrong!", type: 'error' });
        sounds.playError();
        setAnnouncement('Wrong selection');
        setTimeout(() => setPopup(null), 300);
      }
    } else {
      setAnnouncement('Invalid selection path');
    }

    // Reset keyboard selection state
    setIsKeyboardSelecting(false);
    setKeyboardSelectionStart(null);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [keyboardSelectionStart, gameState, foundWords, score, currentWords, level, cancelKeyboardSelection]);

  // Accessibility: Check if a cell is in the current keyboard selection path
  const isInKeyboardSelection = useCallback((row: number, col: number): boolean => {
    if (!isKeyboardSelecting || !keyboardSelectionStart || !focusedCell) return false;
    
    const points = getPointsOnLine(keyboardSelectionStart, focusedCell);
    if (!points) return false;
    
    return points.some(p => p.row === row && p.col === col);
  }, [isKeyboardSelecting, keyboardSelectionStart, focusedCell]);

  // Accessibility: Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (gameOver || showIntro) return;
    
    // Initialize focus if not set
    const current = focusedCell || { row: 0, col: 0 };
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        const newRowUp = Math.max(0, current.row - 1);
        setFocusedCell({ row: newRowUp, col: current.col });
        if (isKeyboardSelecting) {
          setSelectionEnd({ row: newRowUp, col: current.col });
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        const newRowDown = Math.min(gridSize.rows - 1, current.row + 1);
        setFocusedCell({ row: newRowDown, col: current.col });
        if (isKeyboardSelecting) {
          setSelectionEnd({ row: newRowDown, col: current.col });
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        const newColLeft = Math.max(0, current.col - 1);
        setFocusedCell({ row: current.row, col: newColLeft });
        if (isKeyboardSelecting) {
          setSelectionEnd({ row: current.row, col: newColLeft });
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        const newColRight = Math.min(gridSize.cols - 1, current.col + 1);
        setFocusedCell({ row: current.row, col: newColRight });
        if (isKeyboardSelecting) {
          setSelectionEnd({ row: current.row, col: newColRight });
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        sounds.resume();
        if (!isKeyboardSelecting) {
          // Start selection
          setIsKeyboardSelecting(true);
          setKeyboardSelectionStart(current);
          setSelectionStart(current);
          setSelectionEnd(current);
          sounds.playSelectStart();
          setAnnouncement('Selection started. Use arrow keys to extend selection, then press Enter to confirm.');
        } else {
          // End selection and validate
          completeKeyboardSelection(current);
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (isKeyboardSelecting) {
          cancelKeyboardSelection();
        }
        break;
    }
  }, [focusedCell, gridSize, gameOver, showIntro, isKeyboardSelecting, completeKeyboardSelection, cancelKeyboardSelection]);

  if (!gameState) return <div>Loading...</div>;

  return (
    <div 
      className="flex flex-col-reverse lg:flex-row gap-6 md:gap-8 p-0 md:p-4 max-w-7xl mx-auto items-center lg:items-start" 
      onMouseUp={handleMouseUp}
      // Add touch end to container to catch releases outside grid
      onTouchEnd={handleTouchEnd}
    >
      {/* Accessibility: Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Intro / How to Play Modal */}
      {showIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.3)] p-6 md:p-8 rounded-2xl max-w-lg w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-cyan-500 to-transparent"></div>
            
            <h2 className="text-3xl md:text-4xl font-extrabold mb-6 text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-purple-500 uppercase tracking-widest drop-shadow-sm">
              How to Play
            </h2>
            
            <div className="space-y-4 md:space-y-6 text-base md:text-lg text-slate-300 mb-8 text-left">
              <div className="flex items-start gap-4">
                <div className="bg-cyan-500/20 p-2 rounded-lg text-cyan-400 font-bold shrink-0 mt-1 text-sm md:text-base">01</div>
                <p>Find hidden words in the <span className="text-white font-bold">10x10 grid</span> (Level 1).</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400 font-bold shrink-0 mt-1 text-sm md:text-base">02</div>
                <p>Words can be placed <span className="text-white font-bold">horizontally, vertically, or diagonally</span>.</p>
              </div>
              <div className="flex items-start gap-4">
                <div className="bg-pink-500/20 p-2 rounded-lg text-pink-400 font-bold shrink-0 mt-1 text-sm md:text-base">03</div>
                <p><span className="text-white font-bold">Drag</span> your finger or mouse across letters to select.</p>
              </div>
            </div>

            <button 
              onClick={() => {
                setShowIntro(false);
                sounds.resume();
              }}
              className="w-full py-3 md:py-4 bg-linear-to-r from-cyan-600 to-purple-600 text-white text-lg md:text-xl font-bold rounded-xl hover:from-cyan-500 hover:to-purple-500 transition-all duration-300 shadow-[0_0_20px_rgba(8,145,178,0.4)] uppercase tracking-wider transform hover:scale-[1.02]"
            >
              Start Mission
            </button>
          </div>
        </div>
      )}

      {/* Game Board */}
      <div 
        className="relative grid gap-0 border border-cyan-500/30 bg-black/40 backdrop-blur-md select-none shadow-[0_0_15px_rgba(6,182,212,0.15)] rounded-lg overflow-hidden touch-none mx-auto focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        ref={gridRef}
        role="grid"
        aria-label={`Word search grid, ${gridSize.rows} rows by ${gridSize.cols} columns. Use arrow keys to navigate, Enter or Space to start and end selection.`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ 
          gridTemplateColumns: `repeat(${gridSize.cols}, minmax(0, 1fr))`,
          width: 'min(95vw, 600px)',
          height: 'min(95vw, 600px)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {gameState.grid.map((row, r) => (
          <div 
            key={`row-${r}`}
            role="row"
            style={{ display: 'contents' }}
          >
            {row.map((letter, c) => {
              const isFocused = focusedCell?.row === r && focusedCell?.col === c;
              const isInSelection = isInKeyboardSelection(r, c);
              return (
                <div 
                  key={`${r}-${c}`}
                  role="gridcell"
                  aria-label={`Letter ${letter}, row ${r + 1}, column ${c + 1}${isInSelection ? ', selected' : ''}`}
                  aria-selected={isInSelection}
                  data-row={r}
                  data-col={c}
                  className={`flex items-center justify-center font-sans font-bold cursor-pointer text-cyan-400/90 hover:bg-cyan-500/20 hover:text-cyan-100 transition-all duration-200 
                    ${gridSize.rows >= 15 ? 'text-sm md:text-lg' : 'text-lg md:text-xl'}
                    ${isFocused ? 'ring-2 ring-cyan-400 ring-inset bg-cyan-500/30 z-20' : ''}
                    ${isInSelection ? 'bg-purple-500/20' : ''}`}
                  onMouseDown={() => handleMouseDown(r, c)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        ))}

        {/* SVG Overlay for Lines */}
        <svg 
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 10 }}
        >
          {/* Found Words */}
          {foundWords.map(word => {
            const w = gameState.words.find(w => w.word === word);
            if (!w) return null;
            const coords = getLineCoords(w.start, w.end);
            return (
              <line 
                key={word}
                x1={coords.x1} y1={coords.y1}
                x2={coords.x2} y2={coords.y2}
                stroke="rgba(216, 180, 254, 0.4)"
                strokeWidth="24"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 5px rgba(192, 132, 252, 0.5))' }}
              />
            );
          })}

          {/* Current Selection */}
          {isSelecting && selectionStart && selectionEnd && (
            <line 
              x1={getLineCoords(selectionStart, selectionEnd).x1}
              y1={getLineCoords(selectionStart, selectionEnd).y1}
              x2={getLineCoords(selectionStart, selectionEnd).x2}
              y2={getLineCoords(selectionStart, selectionEnd).y2}
              stroke="rgba(34, 211, 238, 0.5)"
              strokeWidth="24"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.8))' }}
            />
          )}
        </svg>

        {/* Celebration Popup */}
        {popup && (
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 border-2 ${
            popup.type === 'success' ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]' : 
            popup.type === 'error' ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]' :
            'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)]'
          } p-6 rounded-xl text-center z-20 animate-bounce backdrop-blur-xl`}>
            
            <div className={`text-2xl font-bold mb-2 ${
              popup.type === 'success' ? 'text-green-400' : 
              popup.type === 'error' ? 'text-red-400' :
              'text-yellow-400'
            } uppercase tracking-widest`}>
              {popup.type === 'success' ? 'Correct!' : popup.type === 'error' ? 'Oops!' : 'Victory!'}
            </div>
            
            <div className="text-xl text-white">
              {popup.type === 'success' ? (
                <>You found <span className="font-bold text-cyan-300 drop-shadow-[0_0_5px_rgba(103,232,249,0.8)]">{popup.word}</span></>
              ) : popup.type === 'error' && popup.word !== "Time's Up!" ? (
                <span className="font-bold text-red-300">{popup.word}</span>
              ) : (
                <div className="flex flex-col gap-2 items-center">
                  <span>{popup.word === "Time's Up!" ? "Try Again?" : `Level ${level} Complete!`}</span>
                  <button 
                    onClick={() => {
                      if (popup.word === "Time's Up!") {
                        startNewGame(level); // Restart current level
                      } else {
                        const nextLevel = level + 1;
                        setLevel(nextLevel);
                        startNewGame(nextLevel);
                      }
                    }}
                    className={`mt-2 py-2 px-6 font-bold rounded transition-colors ${
                      popup.word === "Time's Up!" ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-yellow-500 hover:bg-yellow-400 text-black'
                    }`}
                  >
                    {popup.word === "Time's Up!" ? "Retry Level" : "Next Level \u2192"}
                  </button>
                </div>
              )}
            </div>
            
            {popup.points && popup.type !== 'level_complete' && <div className="text-sm text-slate-400 mt-2">+{popup.points} points</div>}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-4 md:gap-6 w-full max-w-[95vw] lg:max-w-sm">
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 p-4 md:p-6 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
             <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-pink-600">Score: {score}</h2>
             <div className={`text-2xl font-mono font-bold ${timer <= 10 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
               {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
             </div>
          </div>
          <div className="text-sm text-cyan-400 font-bold mb-4 uppercase tracking-wider">
            Level {level} • {gridSize.rows}x{gridSize.cols} Grid
          </div>
          <p className="text-slate-300 mb-6">Find the words listed below.</p>
          <button 
            onClick={() => startNewGame(level)}
            className="w-full py-3 px-6 bg-linear-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 font-bold shadow-[0_0_15px_rgba(8,145,178,0.4)] uppercase tracking-wider transform hover:scale-105"
          >
            Reset Level
          </button>
        </div>

        <div 
          role="list"
          aria-label={`Words to find. ${foundWords.length} of ${currentWords.length} found.`}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3 p-3 md:p-4 bg-slate-900/30 rounded-xl border border-slate-800"
        >
          {currentWords.map(word => {
            const isFound = foundWords.includes(word);
            return (
              <div 
                key={word}
                role="listitem"
                aria-label={`${word}${isFound ? ', found' : ', not found yet'}`}
                className={`flex items-center gap-2 md:gap-3 transition-all duration-300 ${
                  isFound 
                    ? 'text-green-500/50 line-through decoration-green-500/50 decoration-2' 
                    : 'text-slate-300 hover:text-cyan-300 hover:translate-x-1'
                }`}
              >
                <span 
                  className={`w-4 md:w-6 text-center text-xs md:text-sm ${isFound ? 'opacity-100' : 'opacity-0'}`}
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span className="font-mono tracking-wide text-xs md:text-base">{word}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Helpers

function isSameLine(start1: Point, end1: Point, start2: Point, end2: Point): boolean {
  // Check if start/end match (can be reversed)
  const forward = (start1.row === start2.row && start1.col === start2.col && end1.row === end2.row && end1.col === end2.col);
  const reverse = (start1.row === end2.row && start1.col === end2.col && end1.row === start2.row && end1.col === start2.col);
  return forward || reverse;
}

function getSelectedWord(grid: string[][], start: Point, end: Point): string | null {
  const points = getPointsOnLine(start, end);
  if (!points) return null;
  return points.map(p => grid[p.row][p.col]).join('');
}

function getPointsOnLine(start: Point, end: Point): Point[] | null {
  const points: Point[] = [];
  const dRow = Math.sign(end.row - start.row);
  const dCol = Math.sign(end.col - start.col);

  // Check if valid line (horizontal, vertical, or diagonal)
  if (dRow === 0 && dCol === 0) return [{ ...start }];
  
  // If not straight line
  if (dRow !== 0 && dCol !== 0 && Math.abs(end.row - start.row) !== Math.abs(end.col - start.col)) {
    return null; 
  }

  let currRow = start.row;
  let currCol = start.col;

  while (true) {
    points.push({ row: currRow, col: currCol });
    if (currRow === end.row && currCol === end.col) break;
    currRow += dRow;
    currCol += dCol;
    
    // Safety break
    if (points.length > 100) break;
  }

  return points;
}
