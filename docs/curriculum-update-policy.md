# Curriculum Update Policy & Graph Algorithms

## 1. Cycle Detection (3-Color DFS)
Every prerequisite edge addition (`A -> B`) is validated on the backend before persisting to SQLite:
- Self-loops (`A -> A`) and duplicate edges are rejected immediately.
- DFS marks active recursion-stack nodes as `1` (Visiting). Reaching any `1` node identifies a back-edge and reconstructs the exact conflicting cycle path (`[v, ..., u, v]`) returned in HTTP `400` responses so the UI can explain and highlight the conflict.

## 2. Mastery-Based Unlocking Policy
- Marking a lesson completed records reading progress (`lessons_progress.completed = 1`) without granting mastery.
- Mastery requires scoring `>= quiz.mastery_threshold` (default 70%) on the concept's multiple-choice quiz.
- Concept `X` is unlocked if and only if every direct prerequisite `P -> X` has `mastery_status = 'mastered'`.
- Attempting a quiz for a locked concept is rejected by the backend with HTTP `403 Forbidden`.

## 3. Live Curriculum Restructuring & Progress Preservation
- **Adding / Removing Prerequisite Links**: Existing learner `concept_mastery` and `quiz_attempts` records are never deleted. If a new prerequisite is added upstream of an already-mastered concept, the learner retains their mastery record and sees a transparent review notice (`needsPrerequisiteReview`). Unmastered downstream concepts dynamically lock/unlock and affected learners receive notifications.
- **Splitting a Concept**: The original concept is transitioned to `status = 'retired'` with `retired_into_ids` pointing to the new modules. All historical quiz attempts and scores remain preserved in the learner's history view. Newly created replacement modules start unmastered (never auto-mastered) to ensure authentic verification of each new granular skill.
