PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('instructor', 'learner')),
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'kn', 'hi')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instructor_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Computer Science',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'archived')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS concepts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  lesson_content TEXT NOT NULL,
  video_url TEXT DEFAULT '',
  estimated_duration INTEGER NOT NULL DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired', 'draft')),
  retired_into_ids TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prerequisites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  prerequisite_concept_id INTEGER NOT NULL,
  dependent_concept_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (prerequisite_concept_id) REFERENCES concepts(id) ON DELETE CASCADE,
  FOREIGN KEY (dependent_concept_id) REFERENCES concepts(id) ON DELETE CASCADE,
  UNIQUE (course_id, prerequisite_concept_id, dependent_concept_id)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  target_concept_id INTEGER DEFAULT NULL,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
  FOREIGN KEY (learner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (target_concept_id) REFERENCES concepts(id) ON DELETE SET NULL,
  UNIQUE (learner_id, course_id)
);

CREATE TABLE IF NOT EXISTS lessons_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id INTEGER NOT NULL,
  concept_id INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at DATETIME DEFAULT NULL,
  FOREIGN KEY (learner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE,
  UNIQUE (learner_id, concept_id)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  concept_id INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  mastery_threshold INTEGER NOT NULL DEFAULT 70,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id INTEGER NOT NULL,
  quiz_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  passed INTEGER NOT NULL DEFAULT 0,
  answers_json TEXT DEFAULT NULL,
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (learner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS concept_mastery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id INTEGER NOT NULL,
  concept_id INTEGER NOT NULL,
  mastery_status TEXT NOT NULL DEFAULT 'not_started' CHECK (mastery_status IN ('not_started', 'in_progress', 'mastered')),
  best_score INTEGER NOT NULL DEFAULT 0,
  mastered_at DATETIME DEFAULT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (learner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (concept_id) REFERENCES concepts(id) ON DELETE CASCADE,
  UNIQUE (learner_id, concept_id)
);

CREATE TABLE IF NOT EXISTS curriculum_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  instructor_id INTEGER NOT NULL,
  change_type TEXT NOT NULL,
  previous_structure TEXT NOT NULL,
  updated_structure TEXT NOT NULL,
  change_description TEXT NOT NULL,
  affected_concepts TEXT DEFAULT '[]',
  affected_learners_count INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  course_id INTEGER DEFAULT NULL,
  message TEXT NOT NULL,
  message_key TEXT DEFAULT NULL,
  message_params TEXT DEFAULT NULL,
  read_status INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_concepts_course ON concepts(course_id, status);
CREATE INDEX IF NOT EXISTS idx_prereq_course ON prerequisites(course_id);
CREATE INDEX IF NOT EXISTS idx_prereq_dep ON prerequisites(dependent_concept_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_learner ON enrollments(learner_id);
CREATE INDEX IF NOT EXISTS idx_mastery_learner ON concept_mastery(learner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_status);
CREATE INDEX IF NOT EXISTS idx_history_course ON curriculum_history(course_id);
