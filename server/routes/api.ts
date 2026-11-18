import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';
import { Router } from 'express';
import {
  addPrerequisiteEdge,
  calculatePersonalizedLearningPath,
  determineConceptUnlocking,
  topologicalSort,
  validateDAG,
} from '../graph/graphEngine.ts';
import {
  optionalAuth,
  rateLimitAuth,
  requireAuth,
  requireRole,
  signToken,
  type AuthenticatedRequest,
} from '../middleware/auth.ts';
import {
  applyPrerequisiteAdd,
  applyPrerequisiteRemove,
  getEnrolledLearnerStates,
  getLearnerProgressState,
  loadCourseGraph,
  splitConceptInCourse,
} from '../services/curriculumService.ts';

function parsePositiveInt(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function validateExternalUrl(raw: unknown): { ok: true; url: string } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, url: '' };
  const trimmed = String(raw).trim();
  if (!trimmed) return { ok: true, url: '' };
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, error: 'Video URL must use http:// or https://.' };
    }
    return { ok: true, url: trimmed };
  } catch {
    return { ok: false, error: 'Invalid video URL format. Include http:// or https://.' };
  }
}

interface OwnedCourseRow {
  id: number;
  instructor_id: number;
  title: string;
  description: string;
  category: string;
  status: string;
}

function assertCourseOwnership(
  db: Database.Database,
  courseId: number,
  userId: number,
  res: { status: (code: number) => { json: (body: unknown) => void } }
): OwnedCourseRow | null {
  const course = db
    .prepare('SELECT id, instructor_id, title, description, category, status FROM courses WHERE id = ?')
    .get(courseId) as OwnedCourseRow | undefined;
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return null;
  }
  if (course.instructor_id !== userId) {
    res.status(403).json({ error: 'Access denied. You do not own this course.' });
    return null;
  }
  return course;
}

export function createApiRouter(db: Database.Database): Router {
  const router = Router();
  const authLimiter = rateLimitAuth(80, 15 * 60 * 1000);

  // ========================
  // AUTHENTICATION
  // ========================
  router.post('/auth/register', authLimiter, (req, res) => {
    const { name, email, password, role, preferred_language } = req.body ?? {};
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      res.status(400).json({ error: 'Name must be between 2 and 100 characters.' });
      return;
    }
    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 128) {
      res.status(400).json({ error: 'Password must be between 6 and 128 characters.' });
      return;
    }
    const safeRole = role === 'instructor' ? 'instructor' : 'learner';
    const safeLang =
      preferred_language === 'kn' || preferred_language === 'hi' ? preferred_language : 'en';

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = db
      .prepare(
        'INSERT INTO users (name, email, password_hash, role, preferred_language) VALUES (?, ?, ?, ?, ?)'
      )
      .run(name.trim(), email.trim().toLowerCase(), hash, safeRole, safeLang);

    const user = db
      .prepare('SELECT id, name, email, role, preferred_language, created_at FROM users WHERE id = ?')
      .get(Number(result.lastInsertRowid)) as {
      id: number;
      name: string;
      email: string;
      role: 'instructor' | 'learner';
      preferred_language: 'en' | 'kn' | 'hi';
      created_at: string;
    };

    const token = signToken(user);
    res.status(201).json({ token, user });
  });

  router.post('/auth/login', authLimiter, (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const row = db
      .prepare('SELECT id, name, email, password_hash, role, preferred_language FROM users WHERE email = ?')
      .get(email.trim().toLowerCase()) as
      | {
          id: number;
          name: string;
          email: string;
          password_hash: string;
          role: 'instructor' | 'learner';
          preferred_language: 'en' | 'kn' | 'hi';
        }
      | undefined;

    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const user = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      preferred_language: row.preferred_language,
    };
    const token = signToken(user);
    res.json({ token, user });
  });

  router.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = db
      .prepare('SELECT id, name, email, role, preferred_language, created_at FROM users WHERE id = ?')
      .get(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ user });
  });

  router.patch('/auth/language', requireAuth, (req: AuthenticatedRequest, res) => {
    const { language } = req.body ?? {};
    if (language !== 'en' && language !== 'kn' && language !== 'hi') {
      res.status(400).json({ error: 'Unsupported language. Choose en, kn, or hi.' });
      return;
    }
    db.prepare('UPDATE users SET preferred_language = ? WHERE id = ?').run(language, req.user!.id);
    res.json({ preferred_language: language });
  });

  // ========================
  // COURSES
  // ========================
  router.get('/courses', optionalAuth, (req: AuthenticatedRequest, res) => {
    const rows = db
      .prepare(
        `SELECT c.*, u.name as instructor_name,
          (SELECT COUNT(*) FROM concepts WHERE course_id = c.id AND status = 'active') as concept_count,
          (SELECT COUNT(*) FROM prerequisites p
            JOIN concepts c1 ON c1.id = p.prerequisite_concept_id AND c1.status = 'active'
            JOIN concepts c2 ON c2.id = p.dependent_concept_id AND c2.status = 'active'
            WHERE p.course_id = c.id) as edge_count,
          (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active') as enrolled_count,
          (SELECT COALESCE(SUM(estimated_duration), 0) FROM concepts WHERE course_id = c.id AND status = 'active') as total_duration
         FROM courses c
         JOIN users u ON u.id = c.instructor_id
         ORDER BY c.id ASC`
      )
      .all() as Array<Record<string, unknown>>;

    if (req.user?.role === 'learner') {
      const enrolledIds = new Set(
        (
          db
            .prepare('SELECT course_id FROM enrollments WHERE learner_id = ?')
            .all(req.user.id) as Array<{ course_id: number }>
        ).map((r) => r.course_id)
      );
      res.json({
        courses: rows.map((c) => ({ ...c, is_enrolled: enrolledIds.has(Number(c.id)) })),
      });
      return;
    }

    res.json({
      courses: rows.map((c) => ({
        ...c,
        is_owner: Boolean(req.user && Number(c.instructor_id) === req.user.id),
      })),
    });
  });

  router.get('/courses/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
    const courseId = parsePositiveInt(req.params.id);
    if (!courseId) {
      res.status(400).json({ error: 'Invalid course ID.' });
      return;
    }
    const course = db
      .prepare(
        `SELECT c.*, u.name as instructor_name,
          (SELECT COUNT(*) FROM concepts WHERE course_id = c.id AND status = 'active') as concept_count,
          (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active') as enrolled_count
         FROM courses c
         JOIN users u ON u.id = c.instructor_id
         WHERE c.id = ?`
      )
      .get(courseId);

    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }

    const { nodes, edges } = loadCourseGraph(db, courseId);
    let enrolled = false;
    let targetConceptId: number | null = null;
    if (req.user) {
      const enr = db
        .prepare('SELECT id, target_concept_id FROM enrollments WHERE learner_id = ? AND course_id = ?')
        .get(req.user.id, courseId) as { id: number; target_concept_id: number | null } | undefined;
      enrolled = Boolean(enr);
      targetConceptId = enr?.target_concept_id ?? null;
    }

    res.json({ course, concepts: nodes, edges, enrolled, targetConceptId });
  });

  router.post('/courses', requireAuth, requireRole('instructor'), (req: AuthenticatedRequest, res) => {
    const { title, description, category, status } = req.body ?? {};
    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      res.status(400).json({ error: 'Course title must be at least 3 characters.' });
      return;
    }
    const safeStatus = status === 'draft' || status === 'archived' ? status : 'published';
    const result = db
      .prepare(
        'INSERT INTO courses (instructor_id, title, description, category, status) VALUES (?, ?, ?, ?, ?)'
      )
      .run(
        req.user!.id,
        title.trim(),
        (description || '').trim() || 'Prerequisite-structured course',
        (category || 'Computer Science').trim(),
        safeStatus
      );

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(Number(result.lastInsertRowid));
    res.status(201).json({ course });
  });

  router.put('/courses/:id', requireAuth, requireRole('instructor'), (req: AuthenticatedRequest, res) => {
    const courseId = parsePositiveInt(req.params.id);
    if (!courseId) {
      res.status(400).json({ error: 'Invalid course ID.' });
      return;
    }
    const existing = assertCourseOwnership(db, courseId, req.user!.id, res);
    if (!existing) return;

    const { title, description, category, status } = req.body ?? {};
    if (title !== undefined && (typeof title !== 'string' || title.trim().length < 3)) {
      res.status(400).json({ error: 'Course title must be at least 3 characters.' });
      return;
    }
    const safeStatus =
      status === 'published' || status === 'draft' || status === 'archived' ? status : existing.status;

    db.prepare(
      `UPDATE courses SET title = ?, description = ?, category = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(
      title !== undefined ? title.trim() : existing.title,
      description !== undefined ? String(description).trim() : existing.description,
      category !== undefined && String(category).trim() ? String(category).trim() : existing.category,
      safeStatus,
      courseId
    );

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    res.json({ course });
  });

  router.delete('/courses/:id', requireAuth, requireRole('instructor'), (req: AuthenticatedRequest, res) => {
    const courseId = parsePositiveInt(req.params.id);
    if (!courseId) {
      res.status(400).json({ error: 'Invalid course ID.' });
      return;
    }
    const existing = assertCourseOwnership(db, courseId, req.user!.id, res);
    if (!existing) return;
    db.prepare('DELETE FROM courses WHERE id = ?').run(courseId);
    res.json({ deleted: true, id: courseId });
  });

  // ========================
  // CONCEPTS
  // ========================
  router.get('/courses/:id/concepts', (req, res) => {
    const courseId = parsePositiveInt(req.params.id);
    if (!courseId) {
      res.status(400).json({ error: 'Invalid course ID.' });
      return;
    }
    const { nodes, edges } = loadCourseGraph(db, courseId);
    const topo = topologicalSort(nodes, edges);

    const conceptsWithQuiz = nodes.map((c) => {
      const quiz = db
        .prepare('SELECT id, title, mastery_threshold FROM quizzes WHERE concept_id = ?')
        .get(c.id) as { id: number; title: string; mastery_threshold: number } | undefined;
      const qCount = quiz
        ? (
            db
              .prepare('SELECT COUNT(*) as count FROM quiz_questions WHERE quiz_id = ?')
              .get(quiz.id) as { count: number }
          ).count
        : 0;
      return {
        ...c,
        level: topo.levels[c.id] ?? 0,
        quiz_id: quiz?.id ?? null,
        mastery_threshold: quiz?.mastery_threshold ?? 70,
        question_count: qCount,
      };
    });

    res.json({ concepts: conceptsWithQuiz });
  });

  router.post(
    '/courses/:id/concepts',
    requireAuth,
    requireRole('instructor'),
    (req: AuthenticatedRequest, res) => {
      const courseId = parsePositiveInt(req.params.id);
      if (!courseId) {
        res.status(400).json({ error: 'Invalid course ID.' });
        return;
      }
      const course = assertCourseOwnership(db, courseId, req.user!.id, res);
      if (!course) return;

      const {
        title,
        description,
        lesson_content,
        video_url,
        estimated_duration,
        mastery_threshold,
        questions,
      } = req.body ?? {};

      if (!title || typeof title !== 'string' || title.trim().length < 2) {
        res.status(400).json({ error: 'Concept title must be at least 2 characters.' });
        return;
      }

      const urlCheck = validateExternalUrl(video_url);
      if (!urlCheck.ok) {
        res.status(400).json({ error: urlCheck.error });
        return;
      }

      const result = db
        .prepare(
          `INSERT INTO concepts (course_id, title, description, lesson_content, video_url, estimated_duration, status)
           VALUES (?, ?, ?, ?, ?, ?, 'active')`
        )
        .run(
          courseId,
          title.trim(),
          (description || '').trim() || `Core fundamentals of ${title.trim()}.`,
          (lesson_content || '').trim() || `Study material for ${title.trim()}.`,
          urlCheck.url,
          Math.max(5, Number(estimated_duration) || 20)
        );

      const conceptId = Number(result.lastInsertRowid);
      const threshold = Math.min(100, Math.max(40, Number(mastery_threshold) || 70));
      const qRes = db
        .prepare('INSERT INTO quizzes (concept_id, title, mastery_threshold) VALUES (?, ?, ?)')
        .run(conceptId, `${title.trim()} Mastery Check`, threshold);
      const quizId = Number(qRes.lastInsertRowid);

      const insertQ = db.prepare(
        'INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation) VALUES (?, ?, ?, ?, ?)'
      );
      if (Array.isArray(questions) && questions.length > 0) {
        for (const q of questions) {
          const opts = Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['Option A', 'Option B'];
          const safeCorrect = Math.min(opts.length - 1, Math.max(0, Number(q.correct_answer) || 0));
          insertQ.run(
            quizId,
            String(q.question || '').trim() || `Question for ${title.trim()}`,
            JSON.stringify(opts.map((o: unknown) => String(o).trim())),
            safeCorrect,
            String(q.explanation || '').trim()
          );
        }
      } else {
        insertQ.run(
          quizId,
          `What is the key takeaway of "${title.trim()}"?`,
          JSON.stringify([
            (description || '').trim() || `Core understanding of ${title.trim()}`,
            'Skipping foundational concepts',
            'Ignoring prerequisite dependencies',
            'None of the above',
          ]),
          0,
          `Mastering ${title.trim()} ensures readiness for downstream concepts.`
        );
      }

      db.prepare('UPDATE courses SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(courseId);
      const concept = db.prepare('SELECT * FROM concepts WHERE id = ?').get(conceptId);
      res.status(201).json({ concept, quizId });
    }
  );

  router.put('/concepts/:id', requireAuth, requireRole('instructor'), (req: AuthenticatedRequest, res) => {
    const conceptId = parsePositiveInt(req.params.id);
    if (!conceptId) {
      res.status(400).json({ error: 'Invalid concept ID.' });
      return;
    }
    const existing = db.prepare('SELECT * FROM concepts WHERE id = ?').get(conceptId) as
      | {
          id: number;
          course_id: number;
          title: string;
          description: string;
          lesson_content: string;
          video_url: string;
          estimated_duration: number;
          status: string;
        }
      | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Concept not found.' });
      return;
    }

    const owned = assertCourseOwnership(db, existing.course_id, req.user!.id, res);
    if (!owned) return;

    const { title, description, lesson_content, video_url, estimated_duration, mastery_threshold } =
      req.body ?? {};

    if (title !== undefined && (typeof title !== 'string' || title.trim().length < 2)) {
      res.status(400).json({ error: 'Concept title must be at least 2 characters.' });
      return;
    }

    let nextVideoUrl = existing.video_url;
    if (video_url !== undefined) {
      const urlCheck = validateExternalUrl(video_url);
      if (!urlCheck.ok) {
        res.status(400).json({ error: urlCheck.error });
        return;
      }
      nextVideoUrl = urlCheck.url;
    }

    db.prepare(
      `UPDATE concepts
       SET title = ?, description = ?, lesson_content = ?, video_url = ?, estimated_duration = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      title !== undefined ? title.trim() : existing.title,
      description !== undefined ? String(description).trim() : existing.description,
      lesson_content !== undefined ? String(lesson_content) : existing.lesson_content,
      nextVideoUrl,
      estimated_duration !== undefined
        ? Math.max(5, Number(estimated_duration) || existing.estimated_duration)
        : existing.estimated_duration,
      conceptId
    );

    if (mastery_threshold !== undefined) {
      db.prepare('UPDATE quizzes SET mastery_threshold = ? WHERE concept_id = ?').run(
        Math.min(100, Math.max(40, Number(mastery_threshold) || 70)),
        conceptId
      );
    }

    db.prepare('UPDATE courses SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.course_id);
    const updated = db.prepare('SELECT * FROM concepts WHERE id = ?').get(conceptId);
    res.json({ concept: updated });
  });

  router.delete('/concepts/:id', requireAuth, requireRole('instructor'), (req: AuthenticatedRequest, res) => {
    const conceptId = parsePositiveInt(req.params.id);
    if (!conceptId) {
      res.status(400).json({ error: 'Invalid concept ID.' });
      return;
    }
    const existing = db.prepare('SELECT * FROM concepts WHERE id = ?').get(conceptId) as
      | { id: number; course_id: number; title: string }
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Concept not found.' });
      return;
    }

    const owned = assertCourseOwnership(db, existing.course_id, req.user!.id, res);
    if (!owned) return;

    // Archive instead of hard-deleting if learners have mastery or attempt records
    const hasHistory = db
      .prepare('SELECT COUNT(*) as cnt FROM concept_mastery WHERE concept_id = ?')
      .get(conceptId) as { cnt: number };

    if (hasHistory.cnt > 0) {
      db.prepare(
        "UPDATE concepts SET status = 'retired', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(conceptId);
      db.prepare(
        'DELETE FROM prerequisites WHERE prerequisite_concept_id = ? OR dependent_concept_id = ?'
      ).run(conceptId, conceptId);
      res.json({ archived: true, preservedHistory: true, id: conceptId });
      return;
    }

    db.prepare('DELETE FROM concepts WHERE id = ?').run(conceptId);
    res.json({ deleted: true, id: conceptId });
  });

  // ========================
  // GRAPH & CYCLE DETECTION
  // ========================
  router.get('/courses/:id/graph', (req, res) => {
    const courseId = parsePositiveInt(req.params.id);
    if (!courseId) {
      res.status(400).json({ error: 'Invalid course ID.' });
      return;
    }
    const { nodes, edges } = loadCourseGraph(db, courseId);
    const validation = validateDAG(nodes, edges);
    const topo = topologicalSort(nodes, edges);

    res.json({
      courseId,
      nodes: nodes.map((n) => ({
        ...n,
        level: topo.levels[n.id] ?? 0,
      })),
      edges,
      dagValid: validation.isValid,
      topologicalOrder: topo.order,
    });
  });

  router.post(
    '/graph/validate',
    requireAuth,
    requireRole('instructor'),
    (req: AuthenticatedRequest, res) => {
      const { courseId, prerequisiteConceptId, dependentConceptId } = req.body ?? {};
      const cid = parsePositiveInt(courseId);
      const prereqId = parsePositiveInt(prerequisiteConceptId);
      const depId = parsePositiveInt(dependentConceptId);
      if (!cid || !prereqId || !depId) {
        res.status(400).json({ error: 'Valid courseId, prerequisiteConceptId, and dependentConceptId are required.' });
        return;
      }
      const owned = assertCourseOwnership(db, cid, req.user!.id, res);
      if (!owned) return;

      const { nodes, edges } = loadCourseGraph(db, cid);
      const check = addPrerequisiteEdge({ nodes, edges }, prereqId, depId);
      res.json({
        valid: check.valid,
        cyclePath: check.cyclePath,
        cycleTitles: check.cycleTitles,
        message: check.reason,
      });
    }
  );

  router.post(
    '/graph/prerequisites',
    requireAuth,
    requireRole('instructor'),
    (req: AuthenticatedRequest, res) => {
      const { courseId, prerequisiteConceptId, dependentConceptId } = req.body ?? {};
      const cid = parsePositiveInt(courseId);
      const prereqId = parsePositiveInt(prerequisiteConceptId);
      const depId = parsePositiveInt(dependentConceptId);
      if (!cid || !prereqId || !depId) {
        res.status(400).json({ error: 'courseId, prerequisiteConceptId, and dependentConceptId are required.' });
        return;
      }
      const owned = assertCourseOwnership(db, cid, req.user!.id, res);
      if (!owned) return;

      const result = applyPrerequisiteAdd(db, cid, req.user!.id, prereqId, depId);

      if (!result.ok) {
        res.status(result.status).json({
          error: result.error,
          cyclePath: result.cyclePath,
          cycleTitles: result.cycleTitles,
        });
        return;
      }

      res.status(201).json(result);
    }
  );

  router.delete(
    '/graph/prerequisites/:id',
    requireAuth,
    requireRole('instructor'),
    (req: AuthenticatedRequest, res) => {
      const edgeId = parsePositiveInt(req.params.id);
      if (!edgeId) {
        res.status(400).json({ error: 'Invalid prerequisite edge ID.' });
        return;
      }
      const edgeRow = db
        .prepare('SELECT course_id FROM prerequisites WHERE id = ?')
        .get(edgeId) as { course_id: number } | undefined;
      if (!edgeRow) {
        res.status(404).json({ error: 'Prerequisite link not found.' });
        return;
      }
      const owned = assertCourseOwnership(db, edgeRow.course_id, req.user!.id, res);
      if (!owned) return;

      const result = applyPrerequisiteRemove(db, edgeId, req.user!.id);
      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      res.json(result);
    }
  );

  // ========================
  // ENROLLMENT & LEARNER PROGRESS
  // ========================
  router.post('/courses/:id/enroll', requireAuth, (req: AuthenticatedRequest, res) => {
    const courseId = parsePositiveInt(req.params.id);
    if (!courseId) {
      res.status(400).json({ error: 'Invalid course ID.' });
      return;
    }
    const course = db.prepare('SELECT id, title FROM courses WHERE id = ?').get(courseId) as
      | { id: number; title: string }
      | undefined;
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }

    const existing = db
      .prepare('SELECT * FROM enrollments WHERE learner_id = ? AND course_id = ?')
      .get(req.user!.id, courseId);
    if (existing) {
      res.json({ enrollment: existing, alreadyEnrolled: true });
      return;
    }

    const { nodes } = loadCourseGraph(db, courseId);
    const defaultTarget = nodes.length > 0 ? nodes[nodes.length - 1].id : null;

    const result = db
      .prepare(
        'INSERT INTO enrollments (learner_id, course_id, target_concept_id, status) VALUES (?, ?, ?, ?)'
      )
      .run(req.user!.id, courseId, defaultTarget, 'active');

    const enrollment = db
      .prepare('SELECT * FROM enrollments WHERE id = ?')
      .get(Number(result.lastInsertRowid));
    res.status(201).json({ enrollment });
  });

  router.get('/learner/courses', requireAuth, (req: AuthenticatedRequest, res) => {
    const enrollments = db
      .prepare(
        `SELECT e.*, c.title, c.description, c.category, c.status as course_status, u.name as instructor_name
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         JOIN users u ON u.id = c.instructor_id
         WHERE e.learner_id = ?
         ORDER BY e.enrolled_at DESC`
      )
      .all(req.user!.id) as Array<Record<string, unknown>>;

    const enriched = enrollments.map((enr) => {
      const progress = getLearnerProgressState(db, Number(enr.course_id), req.user!.id);
      const unlockedCount = progress.concepts.filter((c) => c.status === 'unlocked').length;
      const lockedCount = progress.concepts.filter((c) => c.status === 'locked').length;
      return {
        ...enr,
        masteredCount: progress.masteredCount,
        totalCount: progress.totalCount,
        unlockedCount,
        lockedCount,
        progressPercentage: progress.progressPercentage,
      };
    });

    res.json({ courses: enriched });
  });

  router.get('/courses/:id/progress', requireAuth, (req: AuthenticatedRequest, res) => {
    const courseId = parsePositiveInt(req.params.id);
    if (!courseId) {
      res.status(400).json({ error: 'Invalid course ID.' });
      return;
    }
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }

    const enrollment = db
      .prepare('SELECT * FROM enrollments WHERE learner_id = ? AND course_id = ?')
      .get(req.user!.id, courseId) as { id: number; target_concept_id: number | null } | undefined;

    const progress = getLearnerProgressState(db, courseId, req.user!.id);
    res.json({
      course,
      enrolled: Boolean(enrollment),
      targetConceptId: enrollment?.target_concept_id ?? null,
      ...progress,
    });
  });

  router.patch('/courses/:id/target', requireAuth, (req: AuthenticatedRequest, res) => {
    const courseId = parsePositiveInt(req.params.id);
    const targetId = parsePositiveInt(req.body?.targetConceptId);
    if (!courseId || !targetId) {
      res.status(400).json({ error: 'Valid course ID and targetConceptId are required.' });
      return;
    }
    const targetConcept = db
      .prepare("SELECT id FROM concepts WHERE id = ? AND course_id = ? AND status = 'active'")
      .get(targetId, courseId);
    if (!targetConcept) {
      res.status(404).json({ error: 'Target concept not found in this course.' });
      return;
    }
    db.prepare(
      'UPDATE enrollments SET target_concept_id = ? WHERE learner_id = ? AND course_id = ?'
    ).run(targetId, req.user!.id, courseId);
    res.json({ targetConceptId: targetId });
  });

  router.patch('/lessons/:id/complete', requireAuth, (req: AuthenticatedRequest, res) => {
    const conceptId = parsePositiveInt(req.params.id);
    if (!conceptId) {
      res.status(400).json({ error: 'Invalid concept ID.' });
      return;
    }
    const concept = db.prepare('SELECT id, course_id FROM concepts WHERE id = ?').get(conceptId) as
      | { id: number; course_id: number }
      | undefined;
    if (!concept) {
      res.status(404).json({ error: 'Concept not found.' });
      return;
    }

    // Check prerequisite unlock status on backend before completing lesson
    const { nodes, edges } = loadCourseGraph(db, concept.course_id);
    const masteredRows = db
      .prepare(
        `SELECT cm.concept_id FROM concept_mastery cm
         JOIN concepts c ON c.id = cm.concept_id
         WHERE cm.learner_id = ? AND c.course_id = ? AND cm.mastery_status = 'mastered'`
      )
      .all(req.user!.id, concept.course_id) as Array<{ concept_id: number }>;
    const masteredSet = new Set(masteredRows.map((m) => m.concept_id));
    const evalState = determineConceptUnlocking(conceptId, nodes, edges, masteredSet);

    if (!evalState.isUnlocked) {
      res.status(403).json({
        error: `This concept is locked until you master: ${evalState.missingPrerequisiteTitles.join(', ')}`,
        missingPrerequisites: evalState.missingPrerequisiteTitles,
      });
      return;
    }

    db.prepare(
      `INSERT INTO lessons_progress (learner_id, concept_id, completed, completed_at)
       VALUES (?, ?, 1, CURRENT_TIMESTAMP)
       ON CONFLICT(learner_id, concept_id) DO UPDATE SET completed = 1, completed_at = CURRENT_TIMESTAMP`
    ).run(req.user!.id, conceptId);

    // Ensure mastery stays not_started/in_progress — completing lesson alone NEVER grants mastery!
    db.prepare(
      `INSERT INTO concept_mastery (learner_id, concept_id, mastery_status, best_score)
       VALUES (?, ?, 'in_progress', 0)
       ON CONFLICT(learner_id, concept_id) DO NOTHING`
    ).run(req.user!.id, conceptId);

    res.json({ completed: true, conceptId, note: 'Lesson completed. Pass the quiz to achieve mastery.' });
  });

  // ========================
  // QUIZZES & MASTERY
  // ========================
  router.get('/concepts/:id/quiz', requireAuth, (req: AuthenticatedRequest, res) => {
    const conceptId = parsePositiveInt(req.params.id);
    if (!conceptId) {
      res.status(400).json({ error: 'Invalid concept ID.' });
      return;
    }
    const concept = db.prepare('SELECT * FROM concepts WHERE id = ?').get(conceptId) as
      | { id: number; course_id: number; title: string }
      | undefined;
    if (!concept) {
      res.status(404).json({ error: 'Concept not found.' });
      return;
    }

    const quiz = db
      .prepare('SELECT * FROM quizzes WHERE concept_id = ?')
      .get(conceptId) as { id: number; concept_id: number; title: string; mastery_threshold: number } | undefined;

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not configured for this concept.' });
      return;
    }

    const questions = db
      .prepare('SELECT id, quiz_id, question, options, correct_answer, explanation FROM quiz_questions WHERE quiz_id = ? ORDER BY id ASC')
      .all(quiz.id) as Array<{
      id: number;
      quiz_id: number;
      question: string;
      options: string;
      correct_answer: number;
      explanation: string;
    }>;

    const attempts = db
      .prepare(
        'SELECT id, score, passed, attempted_at FROM quiz_attempts WHERE learner_id = ? AND quiz_id = ? ORDER BY attempted_at DESC, id DESC'
      )
      .all(req.user!.id, quiz.id);

    const parsedQuestions = questions.map((q) => ({
      id: q.id,
      quiz_id: q.quiz_id,
      question: q.question,
      options: JSON.parse(q.options) as string[],
      ...(req.user!.role === 'instructor'
        ? { correct_answer: q.correct_answer, explanation: q.explanation }
        : {}),
    }));

    res.json({ quiz, questions: parsedQuestions, attempts });
  });

  router.put(
    '/concepts/:id/quiz',
    requireAuth,
    requireRole('instructor'),
    (req: AuthenticatedRequest, res) => {
      const conceptId = parsePositiveInt(req.params.id);
      if (!conceptId) {
        res.status(400).json({ error: 'Invalid concept ID.' });
        return;
      }
      const conceptRow = db
        .prepare('SELECT course_id FROM concepts WHERE id = ?')
        .get(conceptId) as { course_id: number } | undefined;
      if (!conceptRow) {
        res.status(404).json({ error: 'Concept not found.' });
        return;
      }
      const owned = assertCourseOwnership(db, conceptRow.course_id, req.user!.id, res);
      if (!owned) return;

      const { title, mastery_threshold, questions } = req.body ?? {};
      const quiz = db.prepare('SELECT id FROM quizzes WHERE concept_id = ?').get(conceptId) as
        | { id: number }
        | undefined;
      if (!quiz) {
        res.status(404).json({ error: 'Quiz not found for concept.' });
        return;
      }

      if (Array.isArray(questions)) {
        const validQuestions = questions.filter(
          (q) => q && typeof q.question === 'string' && q.question.trim().length > 0 && Array.isArray(q.options) && q.options.length >= 2
        );
        if (validQuestions.length === 0) {
          res.status(400).json({ error: 'At least one valid question with two options is required.' });
          return;
        }
      }

      const safeThreshold = Math.min(100, Math.max(40, Number(mastery_threshold) || 70));
      db.prepare('UPDATE quizzes SET title = COALESCE(?, title), mastery_threshold = ? WHERE id = ?').run(
        title?.trim() || null,
        safeThreshold,
        quiz.id
      );

      if (Array.isArray(questions) && questions.length > 0) {
        const updateTx = db.transaction(() => {
          db.prepare('DELETE FROM quiz_questions WHERE quiz_id = ?').run(quiz.id);
          const insertQ = db.prepare(
            'INSERT INTO quiz_questions (quiz_id, question, options, correct_answer, explanation) VALUES (?, ?, ?, ?, ?)'
          );
          for (const q of questions) {
            if (!q || typeof q.question !== 'string' || !q.question.trim() || !Array.isArray(q.options) || q.options.length < 2) continue;
            const cleanedOpts = q.options.map((o: unknown) => String(o).trim());
            const safeCorrect = Math.min(
              cleanedOpts.length - 1,
              Math.max(0, Number(q.correct_answer) || 0)
            );
            insertQ.run(
              quiz.id,
              q.question.trim(),
              JSON.stringify(cleanedOpts),
              safeCorrect,
              String(q.explanation || '').trim()
            );
          }
        });
        updateTx();
      }

      res.json({ updated: true, quizId: quiz.id, mastery_threshold: safeThreshold });
    }
  );

  router.post('/quizzes/:id/attempt', requireAuth, (req: AuthenticatedRequest, res) => {
    const quizId = parsePositiveInt(req.params.id);
    if (!quizId) {
      res.status(400).json({ error: 'Invalid quiz ID.' });
      return;
    }
    const { answers } = req.body ?? {};

    const quiz = db
      .prepare('SELECT q.*, c.course_id, c.title as concept_title FROM quizzes q JOIN concepts c ON c.id = q.concept_id WHERE q.id = ?')
      .get(quizId) as
      | { id: number; concept_id: number; course_id: number; concept_title: string; mastery_threshold: number }
      | undefined;

    if (!quiz) {
      res.status(404).json({ error: 'Quiz not found.' });
      return;
    }

    // Verify prerequisite unlocking on the backend
    const { nodes, edges } = loadCourseGraph(db, quiz.course_id);
    const masteredRows = db
      .prepare(
        `SELECT cm.concept_id FROM concept_mastery cm
         JOIN concepts c ON c.id = cm.concept_id
         WHERE cm.learner_id = ? AND c.course_id = ? AND cm.mastery_status = 'mastered'`
      )
      .all(req.user!.id, quiz.course_id) as Array<{ concept_id: number }>;
    const beforeMasteredSet = new Set(masteredRows.map((m) => m.concept_id));
    const unlockCheck = determineConceptUnlocking(quiz.concept_id, nodes, edges, beforeMasteredSet);

    if (!unlockCheck.isUnlocked) {
      res.status(403).json({
        error: `Cannot attempt quiz: "${quiz.concept_title}" is locked until you master ${unlockCheck.missingPrerequisiteTitles.join(', ')}.`,
        missingPrerequisites: unlockCheck.missingPrerequisiteTitles,
      });
      return;
    }

    const questions = db
      .prepare('SELECT id, question, options, correct_answer, explanation FROM quiz_questions WHERE quiz_id = ? ORDER BY id ASC')
      .all(quizId) as Array<{
      id: number;
      question: string;
      options: string;
      correct_answer: number;
      explanation: string;
    }>;

    if (questions.length === 0) {
      res.status(400).json({ error: 'Quiz has no questions configured.' });
      return;
    }

    const answerArray: number[] = Array.isArray(answers) ? answers.map((a) => Number(a)) : [];
    let correctCount = 0;
    const feedback = questions.map((q, idx) => {
      const selected = answerArray[idx] ?? -1;
      const isCorrect = selected === q.correct_answer;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        question: q.question,
        selectedOption: selected,
        correctOption: q.correct_answer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= quiz.mastery_threshold;

    db.prepare(
      'INSERT INTO quiz_attempts (learner_id, quiz_id, score, passed, answers_json) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user!.id, quizId, score, passed ? 1 : 0, JSON.stringify(answerArray));

    const prevMastery = db
      .prepare('SELECT mastery_status, best_score, mastered_at FROM concept_mastery WHERE learner_id = ? AND concept_id = ?')
      .get(req.user!.id, quiz.concept_id) as
      | { mastery_status: string; best_score: number; mastered_at: string | null }
      | undefined;

    const bestScore = Math.max(prevMastery?.best_score ?? 0, score);
    const newStatus =
      prevMastery?.mastery_status === 'mastered' || passed ? 'mastered' : 'in_progress';
    const masteredAt =
      prevMastery?.mastered_at ?? (passed ? new Date().toISOString() : null);

    db.prepare(
      `INSERT INTO concept_mastery (learner_id, concept_id, mastery_status, best_score, mastered_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(learner_id, concept_id) DO UPDATE SET
         mastery_status = ?,
         best_score = ?,
         mastered_at = COALESCE(concept_mastery.mastered_at, ?),
         updated_at = CURRENT_TIMESTAMP`
    ).run(req.user!.id, quiz.concept_id, newStatus, bestScore, masteredAt, newStatus, bestScore, masteredAt);

    // Determine newly unlocked concepts if mastered
    const afterMasteredSet = new Set(beforeMasteredSet);
    if (newStatus === 'mastered') {
      afterMasteredSet.add(quiz.concept_id);
    }

    const newlyUnlocked: Array<{ id: number; title: string }> = [];
    if (!beforeMasteredSet.has(quiz.concept_id) && afterMasteredSet.has(quiz.concept_id)) {
      for (const n of nodes) {
        if (n.id === quiz.concept_id) continue;
        const was = determineConceptUnlocking(n.id, nodes, edges, beforeMasteredSet);
        const now = determineConceptUnlocking(n.id, nodes, edges, afterMasteredSet);
        if (!was.isUnlocked && now.isUnlocked) {
          newlyUnlocked.push({ id: n.id, title: n.title });
        }
      }
    }

    res.json({
      score,
      correctCount,
      totalQuestions: questions.length,
      passed,
      masteryThreshold: quiz.mastery_threshold,
      masteryStatus: newStatus,
      bestScore,
      newlyUnlocked,
      feedback,
    });
  });

  router.get('/concepts/:id/mastery', requireAuth, (req: AuthenticatedRequest, res) => {
    const conceptId = parsePositiveInt(req.params.id);
    if (!conceptId) {
      res.status(400).json({ error: 'Invalid concept ID.' });
      return;
    }
    const concept = db.prepare('SELECT id, course_id, title FROM concepts WHERE id = ?').get(conceptId) as
      | { id: number; course_id: number; title: string }
      | undefined;
    if (!concept) {
      res.status(404).json({ error: 'Concept not found.' });
      return;
    }

    const mastery = db
      .prepare('SELECT * FROM concept_mastery WHERE learner_id = ? AND concept_id = ?')
      .get(req.user!.id, conceptId);
    const { nodes, edges } = loadCourseGraph(db, concept.course_id);
    const masteredRows = db
      .prepare(
        `SELECT cm.concept_id FROM concept_mastery cm
         JOIN concepts c ON c.id = cm.concept_id
         WHERE cm.learner_id = ? AND c.course_id = ? AND cm.mastery_status = 'mastered'`
      )
      .all(req.user!.id, concept.course_id) as Array<{ concept_id: number }>;
    const unlock = determineConceptUnlocking(
      conceptId,
      nodes,
      edges,
      new Set(masteredRows.map((m) => m.concept_id))
    );

    res.json({ mastery: mastery ?? null, unlock });
  });

  // ========================
  // PERSONALIZED LEARNING PATH
  // ========================
  router.get(
    '/courses/:id/learning-path/:targetConceptId',
    requireAuth,
    (req: AuthenticatedRequest, res) => {
      const courseId = parsePositiveInt(req.params.id);
      const targetConceptId = parsePositiveInt(req.params.targetConceptId);
      if (!courseId || !targetConceptId) {
        res.status(400).json({ error: 'Invalid course ID or target concept ID.' });
        return;
      }
      const { nodes, edges } = loadCourseGraph(db, courseId);

      if (!nodes.some((n) => n.id === targetConceptId)) {
        res.status(404).json({ error: 'Target concept not found in active course graph.' });
        return;
      }

      const masteredRows = db
        .prepare(
          `SELECT cm.concept_id FROM concept_mastery cm
           JOIN concepts c ON c.id = cm.concept_id
           WHERE cm.learner_id = ? AND c.course_id = ? AND cm.mastery_status = 'mastered'`
        )
        .all(req.user!.id, courseId) as Array<{ concept_id: number }>;
      const masteredSet = new Set(masteredRows.map((m) => m.concept_id));

      const pathResult = calculatePersonalizedLearningPath(
        targetConceptId,
        nodes,
        edges,
        masteredSet
      );

      // Persist selected target concept if learner is enrolled
      db.prepare(
        'UPDATE enrollments SET target_concept_id = ? WHERE learner_id = ? AND course_id = ?'
      ).run(targetConceptId, req.user!.id, courseId);

      res.json({ learningPath: pathResult });
    }
  );

  // ========================
  // CURRICULUM RESTRUCTURING & HISTORY
  // ========================
  router.post(
    '/curriculum/split-concept',
    requireAuth,
    requireRole('instructor'),
    (req: AuthenticatedRequest, res) => {
      const conceptId = parsePositiveInt(req.body?.conceptId);
      if (!conceptId) {
        res.status(400).json({ error: 'Valid conceptId is required.' });
        return;
      }
      const conceptRow = db
        .prepare('SELECT course_id FROM concepts WHERE id = ?')
        .get(conceptId) as { course_id: number } | undefined;
      if (!conceptRow) {
        res.status(404).json({ error: 'Concept not found.' });
        return;
      }
      const owned = assertCourseOwnership(db, conceptRow.course_id, req.user!.id, res);
      if (!owned) return;

      const result = splitConceptInCourse(db, req.user!.id, {
        ...(req.body ?? {}),
        conceptId,
      });
      if (!result.ok) {
        res.status(result.status).json({ error: result.error, cycleTitles: (result as { cycleTitles?: string[] }).cycleTitles });
        return;
      }
      res.status(201).json(result);
    }
  );

  router.get('/courses/:id/history', requireAuth, (req: AuthenticatedRequest, res) => {
    const courseId = parsePositiveInt(req.params.id);
    if (!courseId) {
      res.status(400).json({ error: 'Invalid course ID.' });
      return;
    }
    const history = db
      .prepare(
        `SELECT ch.*, u.name as instructor_name
         FROM curriculum_history ch
         JOIN users u ON u.id = ch.instructor_id
         WHERE ch.course_id = ?
         ORDER BY ch.created_at DESC, ch.id DESC`
      )
      .all(courseId);
    res.json({ history });
  });

  router.get(
    '/courses/:id/enrolled-learners',
    requireAuth,
    requireRole('instructor'),
    (req: AuthenticatedRequest, res) => {
      const courseId = parsePositiveInt(req.params.id);
      if (!courseId) {
        res.status(400).json({ error: 'Invalid course ID.' });
        return;
      }
      const owned = assertCourseOwnership(db, courseId, req.user!.id, res);
      if (!owned) return;

      const learners = db
        .prepare(
          `SELECT u.id, u.name, u.email, e.target_concept_id, e.enrolled_at,
            (SELECT title FROM concepts WHERE id = e.target_concept_id) as target_title
           FROM enrollments e
           JOIN users u ON u.id = e.learner_id
           WHERE e.course_id = ? AND e.status = 'active'`
        )
        .all(courseId) as Array<{
        id: number;
        name: string;
        email: string;
        target_concept_id: number | null;
        enrolled_at: string;
        target_title: string | null;
      }>;

      const enriched = learners.map((l) => {
        const prog = getLearnerProgressState(db, courseId, l.id);
        return {
          ...l,
          masteredCount: prog.masteredCount,
          totalCount: prog.totalCount,
          progressPercentage: prog.progressPercentage,
        };
      });

      res.json({ learners: enriched });
    }
  );

  router.post(
    '/curriculum/recalculate',
    requireAuth,
    requireRole('instructor'),
    (req: AuthenticatedRequest, res) => {
      const cid = parsePositiveInt(req.body?.courseId);
      if (!cid) {
        res.status(400).json({ error: 'Valid courseId is required.' });
        return;
      }
      const owned = assertCourseOwnership(db, cid, req.user!.id, res);
      if (!owned) return;

      const { nodes, edges } = loadCourseGraph(db, cid);
      const dagCheck = validateDAG(nodes, edges);
      const learnerStates = getEnrolledLearnerStates(db, cid);

      const recalculated = learnerStates.map((ls) => {
        const prog = getLearnerProgressState(db, cid, ls.learnerId);
        return {
          learnerId: ls.learnerId,
          masteredCount: prog.masteredCount,
          totalCount: prog.totalCount,
          progressPercentage: prog.progressPercentage,
        };
      });

      res.json({
        dagValid: dagCheck.isValid,
        message: dagCheck.message,
        learnersRecalculated: recalculated.length,
        summary: recalculated,
      });
    }
  );

  // ========================
  // NOTIFICATIONS
  // ========================
  router.get('/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
    const notifications = db
      .prepare(
        `SELECT n.*, c.title as course_title
         FROM notifications n
         LEFT JOIN courses c ON c.id = n.course_id
         WHERE n.user_id = ?
         ORDER BY n.created_at DESC, n.id DESC
         LIMIT 40`
      )
      .all(req.user!.id);

    const unreadCount = (
      db
        .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read_status = 0')
        .get(req.user!.id) as { count: number }
    ).count;

    res.json({ notifications, unreadCount });
  });

  router.patch('/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res) => {
    const notifId = parsePositiveInt(req.params.id);
    if (!notifId) {
      res.status(400).json({ error: 'Invalid notification ID.' });
      return;
    }
    db.prepare('UPDATE notifications SET read_status = 1 WHERE id = ? AND user_id = ?').run(
      notifId,
      req.user!.id
    );
    res.json({ read: true, id: notifId });
  });

  router.patch('/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res) => {
    db.prepare('UPDATE notifications SET read_status = 1 WHERE user_id = ?').run(req.user!.id);
    res.json({ readAll: true });
  });

  return router;
}
