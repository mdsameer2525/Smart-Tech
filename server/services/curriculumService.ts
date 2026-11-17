import type Database from 'better-sqlite3';
import {
  addPrerequisiteEdge,
  identifyAffectedLearners,
  recalculateCourseProgress,
  validateDAG,
  type ConceptGraph,
  type GraphConceptNode,
  type GraphPrerequisiteEdge,
} from '../graph/graphEngine.ts';

export interface CourseConceptRow extends GraphConceptNode {
  course_id: number;
  description: string;
  lesson_content: string;
  video_url: string;
  status: string;
  retired_into_ids: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseEdgeRow extends GraphPrerequisiteEdge {
  id: number;
  course_id: number;
  created_at: string;
}

export function loadCourseGraph(db: Database.Database, courseId: number): {
  nodes: CourseConceptRow[];
  edges: CourseEdgeRow[];
} {
  const nodes = db
    .prepare(
      `SELECT id, course_id, title, description, lesson_content, video_url, estimated_duration, status, retired_into_ids, created_at, updated_at
       FROM concepts
       WHERE course_id = ? AND status = 'active'
       ORDER BY id ASC`
    )
    .all(courseId) as CourseConceptRow[];

  const activeIds = new Set(nodes.map((n) => n.id));
  const allEdges = db
    .prepare(
      `SELECT id, course_id, prerequisite_concept_id, dependent_concept_id, created_at
       FROM prerequisites
       WHERE course_id = ?
       ORDER BY id ASC`
    )
    .all(courseId) as CourseEdgeRow[];

  const edges = allEdges.filter(
    (e) => activeIds.has(e.prerequisite_concept_id) && activeIds.has(e.dependent_concept_id)
  );

  return { nodes, edges };
}

export function getLearnerProgressState(
  db: Database.Database,
  courseId: number,
  learnerId: number
) {
  const { nodes, edges } = loadCourseGraph(db, courseId);

  const masteryRows = db
    .prepare(
      `SELECT cm.concept_id, cm.mastery_status, cm.best_score, cm.mastered_at
       FROM concept_mastery cm
       JOIN concepts c ON c.id = cm.concept_id
       WHERE cm.learner_id = ? AND c.course_id = ?`
    )
    .all(learnerId, courseId) as Array<{
    concept_id: number;
    mastery_status: string;
    best_score: number;
    mastered_at: string | null;
  }>;

  const lessonRows = db
    .prepare(
      `SELECT lp.concept_id, lp.completed, lp.completed_at
       FROM lessons_progress lp
       JOIN concepts c ON c.id = lp.concept_id
       WHERE lp.learner_id = ? AND c.course_id = ?`
    )
    .all(learnerId, courseId) as Array<{
    concept_id: number;
    completed: number;
    completed_at: string | null;
  }>;

  const masteredSet = new Set(
    masteryRows.filter((m) => m.mastery_status === 'mastered').map((m) => m.concept_id)
  );
  const completedLessonSet = new Set(
    lessonRows.filter((l) => l.completed === 1).map((l) => l.concept_id)
  );

  const masteryMap = new Map(masteryRows.map((m) => [m.concept_id, m]));
  const recalculated = recalculateCourseProgress(nodes, edges, masteredSet, completedLessonSet);

  const enrichedConcepts = recalculated.evaluations.map((evalItem) => {
    const node = nodes.find((n) => n.id === evalItem.conceptId)!;
    const mastery = masteryMap.get(evalItem.conceptId);
    const quiz = db
      .prepare('SELECT id, title, mastery_threshold FROM quizzes WHERE concept_id = ?')
      .get(evalItem.conceptId) as { id: number; title: string; mastery_threshold: number } | undefined;

    return {
      ...node,
      ...evalItem,
      bestScore: mastery?.best_score ?? 0,
      masteredAt: mastery?.mastered_at ?? null,
      quizId: quiz?.id ?? null,
      masteryThreshold: quiz?.mastery_threshold ?? 70,
    };
  });

  // Also include retired concepts where the learner has preserved historical records
  const retiredWithHistory = db
    .prepare(
      `SELECT c.id, c.title, c.retired_into_ids, cm.mastery_status, cm.best_score, cm.mastered_at
       FROM concepts c
       JOIN concept_mastery cm ON cm.concept_id = c.id
       WHERE c.course_id = ? AND c.status = 'retired' AND cm.learner_id = ?`
    )
    .all(courseId, learnerId) as Array<{
    id: number;
    title: string;
    retired_into_ids: string | null;
    mastery_status: string;
    best_score: number;
    mastered_at: string | null;
  }>;

  return {
    concepts: enrichedConcepts,
    edges,
    masteredCount: recalculated.masteredCount,
    totalCount: recalculated.totalCount,
    progressPercentage: recalculated.progressPercentage,
    levels: recalculated.levels,
    topologicalOrder: recalculated.topologicalOrder,
    retiredHistory: retiredWithHistory,
  };
}

export function getEnrolledLearnerStates(db: Database.Database, courseId: number) {
  const enrollments = db
    .prepare(
      `SELECT learner_id, target_concept_id FROM enrollments WHERE course_id = ? AND status = 'active'`
    )
    .all(courseId) as Array<{ learner_id: number; target_concept_id: number | null }>;

  return enrollments.map((e) => {
    const mastered = db
      .prepare(
        `SELECT cm.concept_id
         FROM concept_mastery cm
         JOIN concepts c ON c.id = cm.concept_id
         WHERE cm.learner_id = ? AND c.course_id = ? AND cm.mastery_status = 'mastered'`
      )
      .all(e.learner_id, courseId) as Array<{ concept_id: number }>;

    return {
      learnerId: e.learner_id,
      masteredConceptIds: mastered.map((m) => m.concept_id),
      targetConceptId: e.target_concept_id,
    };
  });
}

export function applyPrerequisiteAdd(
  db: Database.Database,
  courseId: number,
  instructorId: number,
  prerequisiteId: number,
  dependentId: number
) {
  const { nodes, edges } = loadCourseGraph(db, courseId);
  const graph: ConceptGraph = { nodes, edges };
  const result = addPrerequisiteEdge(graph, prerequisiteId, dependentId);

  if (!result.valid) {
    return {
      ok: false as const,
      status: 400,
      error: result.reason,
      cyclePath: result.cyclePath,
      cycleTitles: result.cycleTitles,
    };
  }

  const prevSnapshot = {
    concepts: nodes.map((n) => ({ id: n.id, title: n.title })),
    edges: edges.map((e) => ({
      from: e.prerequisite_concept_id,
      to: e.dependent_concept_id,
    })),
  };

  const insertRes = db
    .prepare(
      'INSERT INTO prerequisites (course_id, prerequisite_concept_id, dependent_concept_id) VALUES (?, ?, ?)'
    )
    .run(courseId, prerequisiteId, dependentId);

  const newEdgeId = Number(insertRes.lastInsertRowid);
  const newEdges: GraphPrerequisiteEdge[] = [
    ...edges,
    { id: newEdgeId, prerequisite_concept_id: prerequisiteId, dependent_concept_id: dependentId },
  ];

  const prereqTitle = nodes.find((n) => n.id === prerequisiteId)?.title ?? '';
  const depTitle = nodes.find((n) => n.id === dependentId)?.title ?? '';

  const learnerStates = getEnrolledLearnerStates(db, courseId);
  const affectedReports = identifyAffectedLearners(nodes, edges, newEdges, learnerStates);

  const insertNotif = db.prepare(
    `INSERT INTO notifications (user_id, course_id, message, message_key, message_params, read_status)
     VALUES (?, ?, ?, ?, ?, 0)`
  );

  for (const report of affectedReports) {
    const msg = `A new prerequisite ("${prereqTitle}") has been added before "${depTitle}". Your learning path has been updated while preserving all existing progress.`;
    insertNotif.run(
      report.learnerId,
      courseId,
      msg,
      'notif.prereq_added',
      JSON.stringify({ prerequisite: prereqTitle, dependent: depTitle })
    );
  }

  const nextSnapshot = {
    concepts: nodes.map((n) => ({ id: n.id, title: n.title })),
    edges: newEdges.map((e) => ({
      from: e.prerequisite_concept_id,
      to: e.dependent_concept_id,
    })),
  };

  db.prepare(
    `INSERT INTO curriculum_history
      (course_id, instructor_id, change_type, previous_structure, updated_structure, change_description, affected_concepts, affected_learners_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    courseId,
    instructorId,
    'add_prerequisite',
    JSON.stringify(prevSnapshot),
    JSON.stringify(nextSnapshot),
    `Added prerequisite link: ${prereqTitle} -> ${depTitle}`,
    JSON.stringify([prereqTitle, depTitle]),
    affectedReports.length
  );

  return {
    ok: true as const,
    edgeId: newEdgeId,
    affectedLearnersCount: affectedReports.length,
    affectedReports,
  };
}

export function applyPrerequisiteRemove(
  db: Database.Database,
  edgeId: number,
  instructorId: number
) {
  const edge = db
    .prepare(
      'SELECT id, course_id, prerequisite_concept_id, dependent_concept_id FROM prerequisites WHERE id = ?'
    )
    .get(edgeId) as CourseEdgeRow | undefined;

  if (!edge) {
    return { ok: false as const, status: 404, error: 'Prerequisite link not found.' };
  }

  const { nodes, edges } = loadCourseGraph(db, edge.course_id);
  const prevSnapshot = {
    concepts: nodes.map((n) => ({ id: n.id, title: n.title })),
    edges: edges.map((e) => ({
      from: e.prerequisite_concept_id,
      to: e.dependent_concept_id,
    })),
  };

  db.prepare('DELETE FROM prerequisites WHERE id = ?').run(edgeId);

  const newEdges = edges.filter((e) => e.id !== edgeId);
  const prereqTitle = nodes.find((n) => n.id === edge.prerequisite_concept_id)?.title ?? '';
  const depTitle = nodes.find((n) => n.id === edge.dependent_concept_id)?.title ?? '';

  const learnerStates = getEnrolledLearnerStates(db, edge.course_id);
  const affectedReports = identifyAffectedLearners(nodes, edges, newEdges, learnerStates);

  const insertNotif = db.prepare(
    `INSERT INTO notifications (user_id, course_id, message, message_key, message_params, read_status)
     VALUES (?, ?, ?, ?, ?, 0)`
  );

  for (const report of affectedReports) {
    const msg = `The prerequisite "${prereqTitle}" before "${depTitle}" was removed. Your unlocked concepts and learning path have been recalculated.`;
    insertNotif.run(
      report.learnerId,
      edge.course_id,
      msg,
      'notif.prereq_removed',
      JSON.stringify({ prerequisite: prereqTitle, dependent: depTitle })
    );
  }

  const nextSnapshot = {
    concepts: nodes.map((n) => ({ id: n.id, title: n.title })),
    edges: newEdges.map((e) => ({
      from: e.prerequisite_concept_id,
      to: e.dependent_concept_id,
    })),
  };

  db.prepare(
    `INSERT INTO curriculum_history
      (course_id, instructor_id, change_type, previous_structure, updated_structure, change_description, affected_concepts, affected_learners_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    edge.course_id,
    instructorId,
    'remove_prerequisite',
    JSON.stringify(prevSnapshot),
    JSON.stringify(nextSnapshot),
    `Removed prerequisite link: ${prereqTitle} -> ${depTitle}`,
    JSON.stringify([prereqTitle, depTitle]),
    affectedReports.length
  );

  return {
    ok: true as const,
    courseId: edge.course_id,
    affectedLearnersCount: affectedReports.length,
    affectedReports,
  };
}

export interface SplitConceptPayload {
  conceptId: number;
  newConcepts: Array<{
    title: string;
    description: string;
    lesson_content?: string;
    video_url?: string;
    estimated_duration: number;
    mastery_threshold?: number;
  }>;
  internalLinks: Array<{ fromIndex: number; toIndex: number }>;
  incomingTargetIndices: number[];
  outgoingSourceIndices: number[];
  migrationPolicy: string;
}

export function splitConceptInCourse(
  db: Database.Database,
  instructorId: number,
  payload: SplitConceptPayload
) {
  const original = db
    .prepare('SELECT * FROM concepts WHERE id = ? AND status = ?')
    .get(payload.conceptId, 'active') as CourseConceptRow | undefined;

  if (!original) {
    return { ok: false as const, status: 404, error: 'Active concept not found.' };
  }

  if (!payload.newConcepts || payload.newConcepts.length < 2) {
    return {
      ok: false as const,
      status: 400,
      error: 'Splitting a concept requires at least 2 replacement concepts.',
    };
  }

  const courseId = original.course_id;
  const { nodes: oldNodes, edges: oldEdges } = loadCourseGraph(db, courseId);

  // Validate internal links do not form a cycle
  const tempNodes: GraphConceptNode[] = payload.newConcepts.map((c, idx) => ({
    id: idx + 1,
    title: c.title,
    estimated_duration: c.estimated_duration || 15,
  }));
  const tempEdges: GraphPrerequisiteEdge[] = payload.internalLinks.map((l) => ({
    prerequisite_concept_id: l.fromIndex + 1,
    dependent_concept_id: l.toIndex + 1,
  }));
  const internalCheck = validateDAG(tempNodes, tempEdges);
  if (!internalCheck.isValid) {
    return {
      ok: false as const,
      status: 400,
      error: `Invalid internal links between split concepts: ${internalCheck.message}`,
      cycleTitles: internalCheck.cycleTitles,
    };
  }

  const prevSnapshot = {
    concepts: oldNodes.map((n) => ({ id: n.id, title: n.title })),
    edges: oldEdges.map((e) => ({
      from: e.prerequisite_concept_id,
      to: e.dependent_concept_id,
    })),
  };

  const incomingParents = oldEdges
    .filter((e) => e.dependent_concept_id === original.id)
    .map((e) => e.prerequisite_concept_id);
  const outgoingChildren = oldEdges
    .filter((e) => e.prerequisite_concept_id === original.id)
    .map((e) => e.dependent_concept_id);

  const createdIds: number[] = [];

  const runTransaction = db.transaction(() => {
    const insertConcept = db.prepare(
      `INSERT INTO concepts (course_id, title, description, lesson_content, video_url, estimated_duration, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`
    );
    const insertQuiz = db.prepare(
      'INSERT INTO quizzes (concept_id, title, mastery_threshold) VALUES (?, ?, ?)'
    );
    const insertQuestion = db.prepare(
      'INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation) VALUES (?, ?, ?, ?, ?)'
    );

    for (const nc of payload.newConcepts) {
      const cRes = insertConcept.run(
        courseId,
        nc.title.trim(),
        nc.description.trim(),
        nc.lesson_content?.trim() ||
          `${nc.description.trim()}\n\nThis focused learning module was created by splitting "${original.title}" into clear, mastery-verified sections.`,
        nc.video_url?.trim() || original.video_url || '',
        Math.max(5, Number(nc.estimated_duration) || 15)
      );
      const newId = Number(cRes.lastInsertRowid);
      createdIds.push(newId);

      // Create an editable starter quiz for each new concept
      const qRes = insertQuiz.run(
        newId,
        `${nc.title.trim()} Mastery Check`,
        Math.min(100, Math.max(50, Number(nc.mastery_threshold) || 70))
      );
      const quizId = Number(qRes.lastInsertRowid);
      insertQuestion.run(
        quizId,
        `Which statement accurately describes the core focus of "${nc.title.trim()}"?`,
        JSON.stringify([
          nc.description.trim() || `Core fundamentals of ${nc.title.trim()}`,
          'Unrelated hardware wiring',
          'Skipping prerequisite verification',
          'Deleting historical learner scores',
        ]),
        0,
        `This section focuses specifically on: ${nc.description.trim() || nc.title.trim()}.`
      );
    }

    const insertEdge = db.prepare(
      'INSERT OR IGNORE INTO prerequisites (course_id, prerequisite_concept_id, dependent_concept_id) VALUES (?, ?, ?)'
    );

    // Wire internal links among newly split concepts
    for (const link of payload.internalLinks) {
      const fromId = createdIds[link.fromIndex];
      const toId = createdIds[link.toIndex];
      if (fromId && toId && fromId !== toId) {
        insertEdge.run(courseId, fromId, toId);
      }
    }

    // Connect incoming prerequisites to selected entry concepts (defaults to first concept)
    const entryIndices =
      payload.incomingTargetIndices.length > 0 ? payload.incomingTargetIndices : [0];
    for (const parentId of incomingParents) {
      for (const idx of entryIndices) {
        const targetId = createdIds[idx];
        if (targetId) {
          insertEdge.run(courseId, parentId, targetId);
        }
      }
    }

    // Connect selected exit concepts to outgoing dependents (defaults to last concept)
    const exitIndices =
      payload.outgoingSourceIndices.length > 0
        ? payload.outgoingSourceIndices
        : [createdIds.length - 1];
    for (const childId of outgoingChildren) {
      for (const idx of exitIndices) {
        const sourceId = createdIds[idx];
        if (sourceId) {
          insertEdge.run(courseId, sourceId, childId);
        }
      }
    }

    // Retire original concept WITHOUT deleting it or any learner history/quiz attempts!
    db.prepare(
      `UPDATE concepts
       SET status = 'retired', retired_into_ids = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(JSON.stringify(createdIds), original.id);

    // If any learner had the retired concept as their target_concept_id, update target to the final split concept
    const exitConceptId = createdIds[exitIndices[0]] ?? createdIds[createdIds.length - 1];
    db.prepare(
      `UPDATE enrollments
       SET target_concept_id = ?
       WHERE course_id = ? AND target_concept_id = ?`
    ).run(exitConceptId, courseId, original.id);
  });

  runTransaction();

  const { nodes: newNodes, edges: newEdges } = loadCourseGraph(db, courseId);
  const newTitles = payload.newConcepts.map((c) => c.title.trim());

  // Notify ALL enrolled learners in this course clearly
  const enrollments = db
    .prepare(`SELECT learner_id FROM enrollments WHERE course_id = ? AND status = 'active'`)
    .all(courseId) as Array<{ learner_id: number }>;

  const insertNotif = db.prepare(
    `INSERT INTO notifications (user_id, course_id, message, message_key, message_params, read_status)
     VALUES (?, ?, ?, ?, ?, 0)`
  );

  for (const enr of enrollments) {
    const msg = `The concept "${original.title}" has been divided into smaller learning sections (${newTitles.join(', ')}). Your previous quiz results and progress remain preserved; new sections require mastery verification.`;
    insertNotif.run(
      enr.learner_id,
      courseId,
      msg,
      'notif.concept_split',
      JSON.stringify({
        original: original.title,
        newConcepts: newTitles.join(', '),
        policy: payload.migrationPolicy,
      })
    );
  }

  const nextSnapshot = {
    concepts: newNodes.map((n) => ({ id: n.id, title: n.title })),
    edges: newEdges.map((e) => ({
      from: e.prerequisite_concept_id,
      to: e.dependent_concept_id,
    })),
  };

  db.prepare(
    `INSERT INTO curriculum_history
      (course_id, instructor_id, change_type, previous_structure, updated_structure, change_description, affected_concepts, affected_learners_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    courseId,
    instructorId,
    'split_concept',
    JSON.stringify(prevSnapshot),
    JSON.stringify(nextSnapshot),
    `Split "${original.title}" into: ${newTitles.join(' -> ')}. Policy: ${payload.migrationPolicy || 'Preserve original mastery records; require fresh mastery on split modules.'}`,
    JSON.stringify([original.title, ...newTitles]),
    enrollments.length
  );

  return {
    ok: true as const,
    retiredConceptId: original.id,
    createdConceptIds: createdIds,
    affectedLearnersCount: enrollments.length,
    newTitles,
  };
}
