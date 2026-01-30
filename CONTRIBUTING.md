# Contributing to Word Search Game

First of all, thank you for showing interest in contributing to the Word Search Game! Projects like this thrive on community involvement.

By contributing, you help make this game more performant, accessible, and fun for everyone.

---

## 🏗 Development Setup

To get a local copy up and running, follow these simple steps:

1. **Fork the Repository**
   Click the "Fork" button at the top right of this page to create a copy of the repo under your account.

2. **Clone Your Fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/word-search-game.git
   cd word-search-game
   ```

3. **Install Dependencies**

   ```bash
   npm install
   ```

4. **Start the Development Server**
   ```bash
   npm start
   ```

The app should now be running at `http://localhost:3000`.

---

## 🛣 Contribution Workflow

We follow a standard "Feature Branch" workflow.

1. **Create a Branch:** Give your branch a descriptive name.
   - For features: `feature/short-description`
   - For bug fixes: `fix/issue-description`
   - For docs: `docs/improvement-name`

   ```bash
   git checkout -b feature/dynamic-level-generator
   ```

2. **Commit Your Changes:** Write clear, concise commit messages.

   ```bash
   git commit -m "feat: add procedural grid generation logic"
   ```

3. **Push to GitHub:**

   ```bash
   git push origin feature/your-feature-name
   ```

4. **Open a Pull Request:** Navigate to the original repository and click "Compare & pull request."

---

## 🎨 Coding Standards

To maintain a clean and readable codebase, please keep the following in mind:

- **Component-Based Architecture:** Keep React components modular. If a component is getting too large, consider breaking it into smaller sub-components.
- **Hooks over Classes:** Use functional components and React Hooks (`useState`, `useEffect`, etc.).
- **Styling:** Maintain CSS consistency with the current theme. Ensure the game remains responsive across mobile and desktop.
- **Performance:** Avoid unnecessary re-renders. Use `React.memo` or `useMemo` where appropriate for heavy grid calculations.

---

## 🧪 Testing & Quality

- Before submitting a PR, ensure there are no console errors or warnings.
- If you add a new utility function (e.g., a word-finding algorithm), adding a corresponding unit test is highly encouraged.

---

## 📋 Pull Request Checklist

When opening a PR, please ensure:

- [ ] The PR title follows a clear format (e.g., `feat: ...` or `fix: ...`).
- [ ] You have linked the PR to a related issue (if applicable).
- [ ] The UI looks good on both mobile and desktop screens.
- [ ] Your code is commented in complex areas.

---
