import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import WordSearchGame from './WordSearchGame';

// Mock dependencies
jest.mock('@/lib/sounds', () => ({
  sounds: {
    playTap: jest.fn(),
    playSuccess: jest.fn(),
    playError: jest.fn(),
    playLevelComplete: jest.fn(),
    resume: jest.fn(),
    playSelectStart: jest.fn(),
    playHover: jest.fn(),
  }
}));

jest.mock('@/lib/wordData', () => ({
  // Fix: Mock the function the component actually calls
  getRandomWords: jest.fn(() => ['REACT', 'TEST', 'CODE']),
  WORD_CATEGORIES: {},
  ALL_WORDS: []
}));

// Mock the wordSearch logic to return a predictable grid
jest.mock('@/lib/wordSearch', () => {
    return {
        WordSearchGenerator: jest.fn().mockImplementation(() => ({
            generate: () => ({
                grid: [
                    ['R', 'E', 'A', 'C', 'T', 'A', 'A', 'A', 'A', 'A'],
                    ['T', 'E', 'S', 'T', 'A', 'A', 'A', 'A', 'A', 'A'],
                    ['C', 'O', 'D', 'E', 'A', 'A', 'A', 'A', 'A', 'A'],
                    ...Array(7).fill(Array(10).fill('A'))
                ],
                words: [
                    { word: 'REACT', start: { row: 0, col: 0 }, end: { row: 0, col: 4 } },
                    { word: 'TEST', start: { row: 1, col: 0 }, end: { row: 1, col: 3 } },
                    { word: 'CODE', start: { row: 2, col: 0 }, end: { row: 2, col: 3 } }
                ]
            })
        }))
    };
});

describe('WordSearchGame Versus Mode', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('renders Versus mode correctly', async () => {
        render(<WordSearchGame />);
        
        act(() => {
            jest.runOnlyPendingTimers();
        });

        // Match actual button text from WordSearchGame.tsx
        const modeBtn = await screen.findByText('Multiplayer VS CPU');
        fireEvent.click(modeBtn);
        
        // Check for Versus specific UI using case-insensitive regex
        expect(screen.getByText(/your turn/i)).toBeInTheDocument(); 
        expect(screen.getByText(/cpu/i)).toBeInTheDocument();
        expect(screen.getByText(/turn timer/i)).toBeInTheDocument();
    });

    it('switches turn to CPU when turn timer expires', async () => {
        render(<WordSearchGame />);
        
        act(() => {
            jest.runOnlyPendingTimers();
        });

        const modeBtn = await screen.findByText('Multiplayer VS CPU');
        fireEvent.click(modeBtn);

        // Should be Player turn initially
        expect(screen.getByText(/your turn/i)).toBeVisible();

        // Fast forward 30 seconds
        act(() => {
            jest.advanceTimersByTime(30000);
        });

        // Should now be CPU turn
        expect(await screen.findByText(/cpu turn/i)).toBeVisible();
    });

    it('locks input during CPU turn', async () => {
        render(<WordSearchGame />);
        
        act(() => {
            jest.runOnlyPendingTimers();
        });

        const modeBtn = await screen.findByText('Multiplayer VS CPU');
        fireEvent.click(modeBtn);

        // Force CPU Turn by waiting 30s
        act(() => {
            jest.advanceTimersByTime(30000);
        });
        
        expect(await screen.findByText('CPU TURN')).toBeVisible();

        const grid = screen.getByRole('grid');
        
        // Check if pointer-events-none class is applied
        expect(grid).toHaveClass('pointer-events-none');
    });
    
    it('switches turn to CPU after Player finds a word', async () => {
        render(<WordSearchGame />);
        
        act(() => {
            jest.runOnlyPendingTimers();
        });

        const modeBtn = await screen.findByText('Multiplayer VS CPU');
        fireEvent.click(modeBtn);

        // Select 'REACT' (Row 0, Col 0-4)
        const cellStart = await screen.findByLabelText(/Letter R, row 1, column 1/i);
        const cellEnd = screen.getByLabelText(/Letter T, row 1, column 5/i);
        
        fireEvent.mouseDown(cellStart);
        fireEvent.mouseEnter(cellEnd);
        fireEvent.mouseUp(cellEnd);

        // Check if word is marked found in the list
        expect(await screen.findByLabelText(/REACT, found by you/i)).toBeInTheDocument();

        // Turn should switch to CPU
        expect(await screen.findByText('CPU TURN')).toBeVisible();
    });

    it('calculates dynamic timer correctly', async () => {
        render(<WordSearchGame />);
        
        act(() => {
            jest.runOnlyPendingTimers();
        });

        const modeBtn = await screen.findByText('Multiplayer VS CPU');
        fireEvent.click(modeBtn);

        // Find one word to reduce timer
        const cellStart = await screen.findByLabelText(/Letter R, row 1, column 1/i);
        const cellEnd = screen.getByLabelText(/Letter T, row 1, column 5/i);
        
        fireEvent.mouseDown(cellStart);
        fireEvent.mouseEnter(cellEnd);
        fireEvent.mouseUp(cellEnd);

        // Timer should be reset based on formula: Math.max(10, 30 - totalFound * 2)
        // With 1 word found, next timer should be 28s
        expect(screen.getByText('28s')).toBeInTheDocument();
    });
});