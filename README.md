# Smart-Tech — Prerequisite-Aware Learning Platform

Smart-Tech is a full-stack EdTech platform built around **Directed Acyclic Concept Graphs (DAGs)**, **mastery-based concept unlocking**, **personalized shortest valid learning paths**, and **live curriculum restructuring with full learner history preservation**.

---

## Problem Statement

Traditional online courses present topics as flat lists (`Variables -> Loops -> Functions -> Recursion`). Learners often jump into advanced concepts without mastering foundational prerequisites, causing frustration and dropouts. Meanwhile, instructors cannot restructure live courses—adding prerequisites or splitting complex modules—without breaking learner progress or quiz records.

## Core Platform Capabilities

1. **Course & Concept Management**: Instructors author courses, concepts, text lessons, verified `http`/`https` video links, estimated durations, and configurable MCQ mastery quizzes.
2. **Prerequisite Graph Editor & Cycle Detection**: Visual DAG editor backed by deterministic 3-color DFS cycle detection and Kahn's topological sorting on both client and server.
3. **Mastery-Gated Unlocking**: Completing a reading does not unlock dependent topics alone. Dependent concepts unlock only after all direct prerequisites pass their quiz mastery thresholds.
4. **Personalized Learning Paths**: Learners pick any target concept (e.g., *Algorithms* or *Recursion*). Smart-Tech traverses reverse dependencies, skips already-mastered concepts, orders remaining branches topologically, and computes total estimated learning time.
5. **Live Curriculum Restructuring & History Preservation**: Instructors can add/remove prerequisite links or split a large concept into smaller modules while learners are enrolled. Original quiz attempts and mastery records remain archived and intact, unlocking states & paths recalculate automatically, and affected learners receive notifications.
6. **Multilingual Interface**: Complete UI translation in **English**, **Kannada (ಕನ್ನಡ)**, and **Hindi (हिन्दी)** with persistent user preference.

---

## Architecture Overview

```
React 19 + Vite 8 + Tailwind CSS v4 + i18next (src/)
        │  REST / JSON + JWT Bearer Auth (Lazy-loaded route chunks)
        ▼
Express.js REST API (server/app.ts, server/routes/api.ts)
        ├── Security Headers, CORS Policy, Rate Limiting, Ownership AuthZ
        ├── Pure DAG Graph Engine (server/graph/graphEngine.ts)
        ├── Curriculum Restructuring Service (server/services/curriculumService.ts)
        └── SQLite Relational Database (server/database/schema.sql + smarttech.db)
```

---

## Demo Accounts (Pre-Seeded)

| Role | Name | Email | Password | State |
| :--- | :--- | :--- | :--- | :--- |
| Instructor | Dr. Ananya Rao | `instructor@smarttech.edu` | `demo123` | Owns 5 seeded courses, Graph Editor & Restructuring |
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

# Run production server (Node 22+ serving dist/ & /api/*)
NODE_ENV=production npm start
```

---

## Environment Variables & Production Checklist

See `.env.example`:
- `JWT_SECRET`: **Required in production** — set a strong random 32+ byte secret for signing JWT session tokens.
- `DB_PATH`: SQLite file path (defaults to `./smarttech.db`). Mount persistent disk storage in containerized deployments.
- `APP_URL`: Public origin URL (used for strict CORS matching in production).
- `PORT`: Server port (defaults to `3000`).
- `GEMINI_API_KEY`: Optional (not required for deterministic graph, quiz, or path logic).

### Production Deployment Readiness Checklist
1. Set `NODE_ENV=production` and a unique `JWT_SECRET` environment variable.
2. Run `npm run lint`, `npm test`, and `npm run build` cleanly prior to rollout.
3. Verify `/api/health`, `/robots.txt`, and `/sitemap.xml` respond with HTTP 200.
4. Serve behind HTTPS termination (reverse proxy / Cloud Run / Nginx).

---

## Graph Algorithms Implemented (`server/graph/graphEngine.ts`)

- **3-Color Depth-First Search (`detectCycles`)**: Tracks Unvisited (`0`), Visiting (`1`), Visited (`2`) states and parent pointers to reject cycle-creating edges with the exact conflicting cycle path.
- **Kahn's Topological Sort (`topologicalSort`)**: Computes valid prerequisite-first linear ordering and topological layer depths (`levels`) for DAG visualization.
- **Reverse-Edge BFS (`getPrerequisiteAncestors`) & Forward BFS (`getDependentConcepts`)**: Discovers all required upstream dependencies and downstream dependents.
- **Personalized Path Solver (`calculatePersonalizedLearningPath`)**: Topologically sorts the required ancestor subgraph, skips mastered concepts, sums remaining durations, and explains multi-branch ordering.
- **Affected Learner Analyzer (`identifyAffectedLearners`)**: Compares unlocking and target learning paths before and after graph edits to notify only affected learners.
