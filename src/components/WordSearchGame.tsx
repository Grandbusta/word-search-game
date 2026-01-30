
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { WordSearchGenerator, GridState, WordLocation, Point } from '@/lib/wordSearch';
import { getRandomWords } from '@/lib/wordData';
import { sounds } from '@/lib/sounds';
import { useComputerOpponent } from '@/hooks/useComputerOpponent';

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

  // Game Mode State
  const [gameMode, setGameMode] = useState<'solo' | 'versus' | null>(null); // null = mode selection
  
  // Turn-Based State
  const [currentTurn, setCurrentTurn] = useState<'player' | 'cpu'>('player');
  const [turnTimer, setTurnTimer] = useState(30);

  // CPU State (for versus mode)
  const [cpuFoundWords, setCpuFoundWords] = useState<string[]>([]);
  const [cpuScore, setCpuScore] = useState(0);
  const [cpuWordLocations, setCpuWordLocations] = useState<WordLocation[]>([]);

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

    // Reset CPU state for versus mode
    // Reset CPU state for versus mode
    setCpuFoundWords([]);
    setCpuScore(0);
    setCpuWordLocations([]);
    setCurrentTurn('player');
    setTurnTimer(30);
  }, [level]);

  useEffect(() => {
    if (timer > 0 && !gameOver && !showIntro && popup?.type !== 'level_complete') {
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
             setGameOver(true);
             if (gameMode === 'versus') {
               if (score > cpuScore) setPopup({ word: "Victory!", type: 'success' });
               else if (cpuScore > score) setPopup({ word: "Defeat!", type: 'error' });
               else setPopup({ word: "Draw!", type: 'error' });
             } else {
               setPopup({ word: "Time's Up!", type: 'error' });
             }
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
  }, [timer, gameOver, showIntro, popup, gameMode, score, cpuScore]);

  // Turn Timer (Versus Mode)
  useEffect(() => {
    if (gameMode !== 'versus' || gameOver || showIntro || popup?.type === 'level_complete') return;

    const interval = setInterval(() => {
      setTurnTimer(prev => {
        if (prev <= 1) {
          // Turn expired! Switch turn and give penalty points
          const penaltyPoints = 10;
          if (currentTurn === 'player') {
             setCpuScore(s => s + penaltyPoints);
             setPopup({ word: "Turn Missed! CPU +10", type: 'error' });
             setCurrentTurn('cpu');
          } else {
             setScore(s => s + penaltyPoints);
             setPopup({ word: "CPU Missed! You +10", type: 'success' });
             setCurrentTurn('player');
          }
          setTimeout(() => setPopup(null), 1000);
          return 30; // Reset to 30s
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameMode, gameOver, showIntro, popup, currentTurn]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // CPU found word handler
  const handleCpuFoundWord = useCallback((location: WordLocation) => {
    if (gameOver) return;
    
    // Check if word was already found by player
    if (foundWords.includes(location.word)) return;
    
    // Add to CPU's found words
    setCpuFoundWords(prev => [...prev, location.word]);
    setCpuScore(prev => prev + location.word.length);
    setCpuWordLocations(prev => [...prev, location]);
    
    // Play a sound effect
    sounds.playError(); // Opponent found one!
    
    // Check for game completion
    const totalFound = foundWords.length + cpuFoundWords.length + 1;
    if (totalFound >= currentWords.length) {
      // Game Over: Highest score wins
      const finalPlayerScore = score;
      const finalCpuScore = cpuScore + location.word.length;
      
      const playerWins = finalPlayerScore > finalCpuScore;
      const isDraw = finalPlayerScore === finalCpuScore;
      
      setPopup({ 
        word: isDraw ? "Draw!" : playerWins ? "Victory!" : "Defeat!", 
        type: playerWins ? 'success' : 'error' 
      });
      setGameOver(true);
    } else {
      // Pass turn back to player
      setCurrentTurn('player');
      setTurnTimer(30);
    }
  }, [gameOver, foundWords, cpuFoundWords, currentWords, score, cpuScore]);

  // Computer opponent hook (only active in versus mode)
  useComputerOpponent({
    grid: gameState?.grid || null,
    words: currentWords,
    playerFoundWords: foundWords,
    cpuFoundWords,
    onCpuFoundWord: handleCpuFoundWord,
    isCpuTurn: gameMode === 'versus' && currentTurn === 'cpu' && !gameOver,
    gameActive: gameMode === 'versus' && !gameOver && !showIntro,
  });

  const handleMouseDown = (row: number, col: number) => {
    // If game over or level complete popup is showing, don't start selection
    if (popup?.type === 'level_complete' || (popup?.type === 'error' && popup?.word === "Time's Up!")) {
      return;
    }
    if (gameOver) return;
    
    // Prevent move if it's CPU's turn
    if (gameMode === 'versus' && currentTurn === 'cpu') return;

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
             setPopup({ word: match.word, points, type: 'success' });
             setTimeout(() => setPopup(null), 500);
             
             // Versus Mode: End turn after finding a word
             if (gameMode === 'versus') {
                setCurrentTurn('cpu');
                setTurnTimer(30);
             }
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
    
    // Prevent move if it's CPU's turn
    if (gameMode === 'versus' && currentTurn === 'cpu') return;

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

  if (!gameState) return <div>Loading...</div>;

  return (
    <div 
      className="flex flex-col-reverse lg:flex-row gap-6 md:gap-8 p-0 md:p-4 max-w-7xl mx-auto items-center lg:items-start" 
      onMouseUp={handleMouseUp}
      // Add touch end to container to catch releases outside grid
      onTouchEnd={handleTouchEnd}
    >
      {/* Intro / Mode Selection Modal */}
      {showIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.3)] p-6 md:p-8 rounded-2xl max-w-lg w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
            
            <h2 className="text-3xl md:text-4xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 uppercase tracking-widest drop-shadow-sm">
              Select Mode
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

            {/* Game Mode Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  setGameMode('solo');
                  setShowIntro(false);
                  sounds.resume();
                }}
                className="w-full py-4 bg-cyan-600 text-white text-lg font-bold rounded-xl hover:bg-cyan-500 transition-all duration-300 shadow-lg uppercase tracking-wider"
              >
                Solo Mission
              </button>
              
              <button 
                onClick={() => {
                  setGameMode('versus');
                  setShowIntro(false);
                  sounds.resume();
                }}
                className="w-full py-4 bg-red-600 text-white text-lg font-bold rounded-xl hover:bg-red-500 transition-all duration-300 shadow-lg uppercase tracking-wider"
              >
                Multiplayer VS CPU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Board */}
      <div 
        className="relative grid gap-0 border border-cyan-500/30 bg-black/40 backdrop-blur-md select-none shadow-[0_0_15px_rgba(6,182,212,0.15)] rounded-lg overflow-hidden touch-none mx-auto"
        ref={gridRef}
        style={{ 
          gridTemplateColumns: `repeat(${gridSize.cols}, minmax(0, 1fr))`,
          width: 'min(95vw, 600px)',
          height: 'min(95vw, 600px)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {gameState.grid.map((row, r) => (
          row.map((letter, c) => (
            <div 
              key={`${r}-${c}`}
              data-row={r}
              data-col={c}
              className={`flex items-center justify-center font-sans font-bold cursor-pointer text-cyan-400/90 hover:bg-cyan-500/20 hover:text-cyan-100 transition-all duration-200 
                ${gridSize.rows >= 15 ? 'text-sm md:text-lg' : 'text-lg md:text-xl'}`}
              onMouseDown={() => handleMouseDown(r, c)}
              onMouseEnter={() => handleMouseEnter(r, c)}
            >
              {letter}
            </div>
          ))
        ))}

        {/* SVG Overlay for Lines */}
        <svg 
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
          style={{ zIndex: 10 }}
        >
          {/* Found Words (Player) */}
          {foundWords.map(word => {
            const w = gameState.words.find(w => w.word === word);
            if (!w) return null;
            const coords = getLineCoords(w.start, w.end);
            return (
              <line 
                key={`player-${word}`}
                x1={coords.x1} y1={coords.y1}
                x2={coords.x2} y2={coords.y2}
                stroke="rgba(216, 180, 254, 0.4)"
                strokeWidth="24"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 5px rgba(192, 132, 252, 0.5))' }}
              />
            );
          })}

          {/* Found Words (CPU) */}
          {cpuWordLocations.map(location => {
            const coords = getLineCoords(location.start, location.end);
            return (
              <line 
                key={`cpu-${location.word}`}
                x1={coords.x1} y1={coords.y1}
                x2={coords.x2} y2={coords.y2}
                stroke="rgba(251, 146, 60, 0.4)"
                strokeWidth="24"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 5px rgba(239, 68, 68, 0.5))' }}
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
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-4 md:p-6 rounded-xl shadow-lg">
          {/* Score Display - Different for solo vs versus */}
          {gameMode === 'versus' ? (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <div className={`text-center flex-1 p-2 rounded-lg transition-all ${currentTurn === 'player' ? 'bg-cyan-500/20 ring-1 ring-cyan-500' : 'opacity-60'}`}>
                  <div className="text-sm text-cyan-400 font-bold uppercase tracking-wider mb-1">
                    {currentTurn === 'player' ? 'YOUR TURN' : 'You'}
                  </div>
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">{score}</div>
                </div>
                
                <div className="text-xl text-slate-500 font-bold px-3">VS</div>
                
                <div className={`text-center flex-1 p-2 rounded-lg transition-all ${currentTurn === 'cpu' ? 'bg-red-500/20 ring-1 ring-red-500' : 'opacity-60'}`}>
                  <div className="text-sm text-red-400 font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                    {currentTurn === 'cpu' ? 'CPU TURN' : 'CPU'}
                  </div>
                  <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">{cpuScore}</div>
                </div>
              </div>

              {/* Turn Timer Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Turn Timer</span>
                  <span className={turnTimer <= 5 ? 'text-red-500 font-bold animate-pulse' : ''}>{turnTimer}s</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 linear ${currentTurn === 'player' ? 'bg-cyan-500' : 'bg-red-500'}`}
                    style={{ width: `${(turnTimer / 30) * 100}%` }}
                  />
                </div>
              </div>

              {/* Global Timer */}
              <div className={`text-center text-xl font-mono font-bold mt-2 ${timer <= 10 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                Global Time: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center mb-2">
               <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Score: {score}</h2>
               <div className={`text-2xl font-mono font-bold ${timer <= 10 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                 {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
               </div>
            </div>
          )}

          <div className="text-sm text-cyan-400 font-bold mb-4 uppercase tracking-wider">
            {gameMode === 'versus' ? 'Turn-Based Battle' : `Level ${level}`} • {gridSize.rows}x{gridSize.cols} Grid
          </div>
          <p className="text-slate-400 mb-6">Find the words listed below.</p>
          <button 
            onClick={() => startNewGame(level)}
            className="w-full py-3 px-6 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all duration-300 font-bold shadow-[0_0_15px_rgba(8,145,178,0.4)] uppercase tracking-wider transform hover:scale-105"
          >
            Reset Level
          </button>
        </div>

        {/* Word List - Shows who found each word in versus mode */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-1 gap-2 md:gap-3 p-3 md:p-4 bg-slate-900/30 rounded-xl border border-slate-800">
          {currentWords.map(word => {
            const playerFound = foundWords.includes(word);
            const cpuFound = cpuFoundWords.includes(word);
            const isFound = playerFound || cpuFound;
            
            return (
              <div 
                key={word} 
                className={`flex items-center gap-2 md:gap-3 transition-all duration-300 ${
                  playerFound 
                    ? 'text-green-500/80 line-through decoration-green-500/50 decoration-2'
                    : cpuFound
                    ? 'text-red-500/60 line-through decoration-red-500/50 decoration-2'
                    : 'text-slate-300 hover:text-cyan-300 hover:translate-x-1'
                }`}
              >
                <span className={`w-4 md:w-6 text-center text-xs md:text-sm ${isFound ? 'opacity-100' : 'opacity-0'}`}>
                  {playerFound ? '✓' : cpuFound ? '✗' : ''}
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
