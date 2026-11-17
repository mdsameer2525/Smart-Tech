# Smart-Tech — Prerequisite-Aware Learning Platform

Smart-Tech is a full-stack EdTech platform built around **Directed Acyclic Concept Graphs (DAGs)**, **mastery-based concept unlocking**, **personalized shortest valid learning paths**, and **live curriculum restructuring with full learner history preservation**.

---

## Problem Statement

Traditional online courses present topics as flat lists (`Variables -> Loops -> Functions -> Recursion`). Learners often jump into advanced concepts without mastering foundational prerequisites, causing frustration and dropouts. Meanwhile, instructors cannot restructure live courses—adding prerequisites or splitting complex modules—without breaking learner progress or quiz records.

## Proposed Solution

Smart-Tech models every course as a verified **Directed Acyclic Graph (DAG)** of concepts and prerequisite dependencies:

1. **Course & Concept Management**: Instructors author courses, concepts, text lessons, video links, estimated durations, and configurable MCQ mastery quizzes.
2. **Prerequisite Graph Editor & Cycle Detection**: Visual DAG editor backed by deterministic 3-color DFS cycle detection and Kahn's topological sorting on both client and server.
3. **Mastery-Based Unlocking**: Completing a lesson alone does not unlock dependent topics. Dependent concepts unlock only after all direct prerequisites pass their quiz mastery thresholds.
4. **Personalized Learning Paths**: Learners pick any target concept (e.g., *Algorithms* or *Recursion*). Smart-Tech traverses reverse dependencies, skips already-mastered concepts, orders remaining branches topologically, and computes total estimated learning time.
5. **Live Curriculum Restructuring & History Preservation**: Instructors can add/remove prerequisite links or split a large concept into smaller modules while learners are enrolled. Original quiz attempts and mastery records remain archived and intact, unlocking states & paths recalculate automatically, and affected learners receive notifications.
6. **Multilingual Interface**: Complete UI translation in **English**, **Kannada (ಕನ್ನಡ)**, and **Hindi (हिन्दी)** with persistent user preference.

---

## Architecture Overview

```
React + Vite + Tailwind + i18next (src/)
        │  REST / JSON + JWT Bearer Auth
        ▼
Express.js REST API (server/routes/api.ts)
        ├── Pure DAG Graph Engine (server/graph/graphEngine.ts)
        ├── Curriculum Restructuring Service (server/services/curriculumService.ts)
        └── SQLite Relational Database (server/database/schema.sql + smarttech.db)
```

---

## Demo Accounts (Pre-Seeded)

| Role | Name | Email | Password | State |
| :--- | :--- | :--- | :--- | :--- |
| Instructor | Dr. Ananya Rao | `instructor@smarttech.edu` | `demo123` | Course owner, Graph Editor & Restructuring |
| Learner | Aarav Sharma | `aarav@smarttech.edu` | `demo123` | 5/15 mastered, Loops quiz at 55% (Recursion locked), Target: Algorithms |
| Learner | Priya Nair | `priya@smarttech.edu` | `demo123` | 1/15 mastered, early beginner, Target: Recursion |
| Learner | Rohan Kulkarni | `rohan@smarttech.edu` | `demo123` | 11/15 mastered, advanced branch, Target: Algorithms |

---

## Setup & Commands

```bash
# Install dependencies
npm install

# Run full-stack dev server (Express + Vite on port 3000)
npm run dev

# Run graph algorithm & API integration test suite
npm test

# Typecheck & production build
npm run lint
npm run build
```

---

## Environment Variables

See `.env.example`:
- `JWT_SECRET`: Secret key for signing session tokens.
- `DB_PATH`: SQLite file path (defaults to `./smarttech.db`).
- `APP_URL`: Hosting base URL.
- `GEMINI_API_KEY`: Optional (not required for deterministic graph, quiz, or path logic).

---

## Graph Algorithms Implemented (`server/graph/graphEngine.ts`)

- **3-Color Depth-First Search (`detectCycles`)**: Tracks Unvisited (`0`), Visiting (`1`), Visited (`2`) states and parent pointers to reject cycle-creating edges with the exact conflicting cycle path.
- **Kahn's Topological Sort (`topologicalSort`)**: Computes valid prerequisite-first linear ordering and topological layer depths (`levels`) for DAG visualization.
- **Reverse-Edge BFS (`getPrerequisiteAncestors`) & Forward BFS (`getDependentConcepts`)**: Discovers all required upstream dependencies and downstream dependents.
- **Personalized Path Solver (`calculatePersonalizedLearningPath`)**: Topologically sorts the required ancestor subgraph, skips mastered concepts, sums remaining durations, and explains multi-branch ordering.
- **Affected Learner Analyzer (`identifyAffectedLearners`)**: Compares unlocking and target learning paths before and after graph edits to notify only affected learners.
