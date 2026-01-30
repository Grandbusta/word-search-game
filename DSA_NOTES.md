# 🧠 Data Structures & Algorithms in Practice: Building a Turn-Based Word Search AI

_A learning journey contributing to [word-search-game](https://github.com/boluwatifee4/word-search-game)_

---

## 🎯 The Feature: Turn-Based Multiplayer VS CPU

I implemented a **Game Loop** system where players alternate turns with a computer opponent. This required managing state machines, timers, and event-driven AI responses.

---

## 📊 The Data Structures

### 1. Trie (Prefix Tree)

A **Trie** is a tree-like structure optimized for storing and retrieving strings. Each node represents a character, and paths from root to leaf spell out words.

```
        (root)
       /  |  \
      C   P   R
      |   |   |
      A   A   E
      |   |   |
      T   N   A
          |   |
          T   C
          |   |
          S   T
```

**Why I used it:**

- **O(L) lookup**: Check word validity in linear time relative to word length.
- **Prefix validation**: Instantly prune invalid search paths during DFS.
- **My implementation**: [`src/lib/dsa/Trie.ts`](./src/lib/dsa/Trie.ts)

### 2. DFS (Depth-First Search)

**DFS** explores the grid to find words. Unlike BFS which searches layer-by-layer, DFS dives deep along a path, making it natural for snake-like word formations.

**My implementation**: [`src/lib/dsa/WordSearchSolver.ts`](./src/lib/dsa/WordSearchSolver.ts)

---

## ⚙️ The Game Loop Algorithm

The core logic shifts from a "race" to a **State Machine**:

```mermaid
graph TD
    A[Player Turn (30s)] -->|Found Word| C[Score + Turn Swap]
    A -->|Timer Expires| B[Penalty + Turn Swap]
    C --> D[CPU Turn (30s)]
    B --> D
    D -->|AI Finds Word| E[CPU Score + Turn Swap]
    D -->|AI Timer Expires| F[Player Bonus + Turn Swap]
    E --> A
    F --> A
```

### Turn Management

- **Global Timer (60s)**: Runs independently. When 0, highest score wins.
- **Turn Timer (30s)**: Resets on every turn swap.
- **Penalty Logic**: Missing a turn grants the opponent 10 points.

### CPU "Thinking"

Instead of solving instantly, the CPU:

1. Waits for `isCpuTurn` signal.
2. Sets a random delay (2-5s) to mimic human reaction.
3. Executes DFS + Trie search logic.
4. If successful, triggers "Found" event which swaps turn back.

---

## 📁 Files Created

| File                               | Purpose                    |
| ---------------------------------- | -------------------------- |
| `src/lib/dsa/Trie.ts`              | Prefix tree implementation |
| `src/lib/dsa/WordSearchSolver.ts`  | DFS solver algorithm       |
| `src/hooks/useComputerOpponent.ts` | Turn-based state manager   |

---

## 💡 Key Learnings

1. **State Machines**: Managing `currentTurn` is crucial for turn-based logic.
2. **Event Queues**: CPU actions must be queued (setTimeout) to not block the UI.
3. **Optimized Search**: Using a Trie prevents the AI from "cheating" by checking unlikely paths instantly.

---

_This contribution demonstrates how to mix standard algorithms (DFS/Trie) with complex state management (Game Loops) in a React application._
