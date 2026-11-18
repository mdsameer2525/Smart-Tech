import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../server/app.ts';
import { seedDatabaseIfEmpty } from '../server/database/seed.ts';

let db: Database.Database;
let serverUrl = '';
let closeServer: () => Promise<void>;

async function api(pathname: string, options: RequestInit = {}, token?: string) {
  const res = await fetch(`${serverUrl}/api${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    },
  });
  const data = await res.json();
  return { status: res.status, data };
}

beforeAll(async () => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.resolve(process.cwd(), 'server/database/schema.sql'), 'utf-8');
  db.exec(schema);
  seedDatabaseIfEmpty(db);

  const app = createApp(db);
  await new Promise<void>((resolve) => {
    const srv = app.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        serverUrl = `http://127.0.0.1:${addr.port}`;
      }
      closeServer = () => new Promise<void>((resClose) => srv.close(() => resClose()));
      resolve();
    });
  });
});

afterAll(async () => {
  await closeServer();
  db.close();
});

describe('Smart-Tech Backend API Integration', () => {
  it('supports seeded login, 15-concept graph validation, and personalized learning paths', async () => {
    const loginRes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'aarav@smarttech.edu', password: 'demo123' }),
    });
    expect(loginRes.status).toBe(200);
    const learnerToken = loginRes.data.token as string;

    const progressRes = await api('/courses/1/progress', {}, learnerToken);
    expect(progressRes.status).toBe(200);
    expect(progressRes.data.concepts.length).toBeGreaterThanOrEqual(15);

    const loops = progressRes.data.concepts.find((c: { title: string }) => c.title === 'Loops');
    const functions = progressRes.data.concepts.find(
      (c: { title: string }) => c.title === 'Functions'
    );
    const algorithms = progressRes.data.concepts.find(
      (c: { title: string }) => c.title === 'Algorithms'
    );

    expect(loops.status).toBe('unlocked');
    expect(functions.status).toBe('unlocked'); // Variables + Data Types mastered!
    const recursion = progressRes.data.concepts.find(
      (c: { title: string }) => c.title === 'Recursion'
    );
    expect(recursion.status).toBe('locked');
    expect(recursion.missingPrerequisiteTitles).toContain('Loops');

    // Trying to submit quiz on locked Recursion must return 403
    const quizMeta = await api(`/concepts/${recursion.id}/quiz`, {}, learnerToken);
    const lockedAttempt = await api(
      `/quizzes/${quizMeta.data.quiz.id}/attempt`,
      { method: 'POST', body: JSON.stringify({ answers: [0, 0, 0] }) },
      learnerToken
    );
    expect(lockedAttempt.status).toBe(403);

    // Personalized learning path to Algorithms skips mastered concepts
    const pathRes = await api(`/courses/1/learning-path/${algorithms.id}`, {}, learnerToken);
    expect(pathRes.status).toBe(200);
    const stepTitles = pathRes.data.learningPath.remainingSteps.map(
      (s: { title: string }) => s.title
    );
    expect(stepTitles).not.toContain('Variables');
    expect(stepTitles).toContain('Loops');
    expect(stepTitles[stepTitles.length - 1]).toBe('Algorithms');
  });

  it('enforces backend cycle detection and preserves learner history on concept split', async () => {
    const instRes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'instructor@smarttech.edu', password: 'demo123' }),
    });
    expect(instRes.status).toBe(200);
    const instToken = instRes.data.token as string;

    const graphRes = await api('/courses/1/graph', {}, instToken);
    const intro = graphRes.data.nodes.find(
      (n: { title: string }) => n.title === 'Introduction to Programming'
    );
    const algorithms = graphRes.data.nodes.find((n: { title: string }) => n.title === 'Algorithms');

    // Attempt cycle: Algorithms -> Introduction to Programming
    const cycleAttempt = await api(
      '/graph/prerequisites',
      {
        method: 'POST',
        body: JSON.stringify({
          courseId: 1,
          prerequisiteConceptId: algorithms.id,
          dependentConceptId: intro.id,
        }),
      },
      instToken
    );
    expect(cycleAttempt.status).toBe(400);
    expect(cycleAttempt.data.cyclePath.length).toBeGreaterThan(2);

    // Split "Strings" into two concepts and verify history + notifications
    const stringsNode = graphRes.data.nodes.find((n: { title: string }) => n.title === 'Strings');
    const splitRes = await api(
      '/curriculum/split-concept',
      {
        method: 'POST',
        body: JSON.stringify({
          conceptId: stringsNode.id,
          newConcepts: [
            { title: 'String Indexing', description: 'Access characters by index', estimated_duration: 12 },
            { title: 'String Manipulation', description: 'Slice and split strings', estimated_duration: 15 },
          ],
          internalLinks: [{ fromIndex: 0, toIndex: 1 }],
          incomingTargetIndices: [0],
          outgoingSourceIndices: [1],
          migrationPolicy: 'Preserve original quiz records; verify split modules independently.',
        }),
      },
      instToken
    );
    expect(splitRes.status).toBe(201);
    expect(splitRes.data.createdConceptIds).toHaveLength(2);
    expect(splitRes.data.affectedLearnersCount).toBeGreaterThanOrEqual(3);

    // Verify curriculum history recorded the split
    const histRes = await api('/courses/1/history', {}, instToken);
    expect(histRes.data.history[0].change_type).toBe('split_concept');

    // Verify Aarav received notification
    const aaravLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'aarav@smarttech.edu', password: 'demo123' }),
    });
    const notifRes = await api('/notifications', {}, aaravLogin.data.token);
    expect(
      notifRes.data.notifications.some((n: { message_key: string }) => n.message_key === 'notif.concept_split')
    ).toBe(true);
  });

  it('enforces security headers, URL validation, ID checks, and instructor course ownership', async () => {
    const healthRes = await fetch(`${serverUrl}/api/health`);
    expect(healthRes.status).toBe(200);
    expect(healthRes.headers.get('x-content-type-options')).toBe('nosniff');
    expect(healthRes.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(healthRes.headers.get('x-powered-by')).toBeNull();

    // Invalid IDs return 400 rather than 500 or blank lookups
    const invalidCourse = await api('/courses/not-a-number');
    expect(invalidCourse.status).toBe(400);

    // Unknown API route returns JSON 404
    const missingApi = await api('/does-not-exist');
    expect(missingApi.status).toBe(404);

    // Register a second instructor and verify they CANNOT modify Dr. Rao's course #1
    const inst2Res = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Second Instructor',
        email: 'instructor2@smarttech.edu',
        password: 'password123',
        role: 'instructor',
      }),
    });
    expect(inst2Res.status).toBe(201);
    const inst2Token = inst2Res.data.token as string;

    const hijackCourse = await api(
      '/courses/1',
      { method: 'PUT', body: JSON.stringify({ title: 'Unauthorized Rename' }) },
      inst2Token
    );
    expect(hijackCourse.status).toBe(403);

    const hijackConcept = await api(
      '/courses/1/concepts',
      { method: 'POST', body: JSON.stringify({ title: 'Injected Node' }) },
      inst2Token
    );
    expect(hijackConcept.status).toBe(403);

    // Second instructor creates their own course, rejects unsafe javascript: URL, then updates & deletes
    const ownCourse = await api(
      '/courses',
      { method: 'POST', body: JSON.stringify({ title: 'Systems Design', category: 'Architecture' }) },
      inst2Token
    );
    expect(ownCourse.status).toBe(201);
    const ownCourseId = ownCourse.data.course.id as number;

    const unsafeUrl = await api(
      `/courses/${ownCourseId}/concepts`,
      {
        method: 'POST',
        body: JSON.stringify({
          title: 'Load Balancing',
          video_url: 'javascript:alert(1)',
        }),
      },
      inst2Token
    );
    expect(unsafeUrl.status).toBe(400);

    const renameOwn = await api(
      `/courses/${ownCourseId}`,
      { method: 'PUT', body: JSON.stringify({ title: 'Distributed Systems Design' }) },
      inst2Token
    );
    expect(renameOwn.status).toBe(200);
    expect(renameOwn.data.course.title).toBe('Distributed Systems Design');

    const deleteOwn = await api(`/courses/${ownCourseId}`, { method: 'DELETE' }, inst2Token);
    expect(deleteOwn.status).toBe(200);
  });
});

