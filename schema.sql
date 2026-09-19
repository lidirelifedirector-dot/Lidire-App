-- ============================================================
-- LiDire MVP 1.0
-- Banco de dados comercial
-- Cloudflare D1 / SQLite
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- USUÁRIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    age INTEGER,
    phone TEXT,
    avatar_url TEXT,
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);


-- ============================================================
-- SESSÕES DE LOGIN
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token
ON sessions(token_hash);

CREATE INDEX IF NOT EXISTS idx_sessions_user
ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expiration
ON sessions(expires_at);


-- ============================================================
-- COMPROMISSOS / AGENDA
-- ============================================================

CREATE TABLE IF NOT EXISTS commitments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    location TEXT,
    category TEXT,
    color TEXT,
    shared_family INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_commitments_user_date
ON commitments(user_id, date);


-- ============================================================
-- TAREFAS
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT,
    due_time TEXT,
    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK(priority IN ('baixa','normal','alta')),
    done INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    shared_family INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_date
ON tasks(user_id, due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_user_done
ON tasks(user_id, done);


-- ============================================================
-- LEMBRETES
-- ============================================================

CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT,
    time TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_date
ON reminders(user_id, date);


-- ============================================================
-- LISTAS DE COMPRAS
-- ============================================================

CREATE TABLE IF NOT EXISTS shopping_lists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    spending_limit REAL,
    best_day TEXT,
    shared_family INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_user
ON shopping_lists(user_id);


CREATE TABLE IF NOT EXISTS shopping_items (
    id TEXT PRIMARY KEY,
    list_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity REAL,
    unit TEXT,
    estimated_price REAL,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(list_id)
        REFERENCES shopping_lists(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shopping_items_list
ON shopping_items(list_id);


-- ============================================================
-- HIDRATAÇÃO
-- ============================================================

CREATE TABLE IF NOT EXISTS hydration_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    daily_goal_ml INTEGER NOT NULL DEFAULT 2000,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS hydration_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    ml INTEGER NOT NULL CHECK(ml > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hydration_user_date
ON hydration_records(user_id, date);


-- ============================================================
-- ESTUDOS
-- ============================================================

CREATE TABLE IF NOT EXISTS study_disciplines (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_study_disciplines_user
ON study_disciplines(user_id);


CREATE TABLE IF NOT EXISTS study_activities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    discipline_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_date TEXT,
    scheduled_time TEXT,
    duration_minutes INTEGER,
    notes TEXT,
    bibliography TEXT,
    search_url TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    FOREIGN KEY(discipline_id)
        REFERENCES study_disciplines(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_study_activities_user_date
ON study_activities(user_id, scheduled_date);


-- ============================================================
-- TREINOS
-- ============================================================

CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    scheduled_date TEXT,
    scheduled_time TEXT,
    duration_minutes INTEGER,
    shared_family INTEGER NOT NULL DEFAULT 0,
    done INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date
ON workouts(user_id, scheduled_date);


CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    workout_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sets INTEGER,
    target_reps INTEGER,
    performed_reps INTEGER,
    load REAL,
    rest_seconds INTEGER,
    video_url TEXT,
    notes TEXT,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(workout_id)
        REFERENCES workouts(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_exercises_workout
ON exercises(workout_id);


-- ============================================================
-- FINANÇAS
-- ============================================================

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL
        CHECK(type IN ('receita','despesa')),
    category TEXT,
    description TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    date TEXT NOT NULL,
    payment_method TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date
ON transactions(user_id, date);


CREATE TABLE IF NOT EXISTS fixed_expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL CHECK(amount >= 0),
    due_day INTEGER CHECK(due_day BETWEEN 1 AND 31),
    category TEXT,
    paid INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user
ON fixed_expenses(user_id);


-- ============================================================
-- OBJETIVOS
-- ============================================================

CREATE TABLE IF NOT EXISTS objectives (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    deadline TEXT,
    financial_target REAL,
    accumulated_value REAL NOT NULL DEFAULT 0,
    progress REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ativo'
        CHECK(status IN ('ativo','concluido','pausado')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_objectives_user
ON objectives(user_id);


CREATE TABLE IF NOT EXISTS objective_tasks (
    id TEXT PRIMARY KEY,
    objective_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(objective_id)
        REFERENCES objectives(id)
        ON DELETE CASCADE,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_objective_tasks_objective
ON objective_tasks(objective_id);


-- ============================================================
-- CICLO MENSTRUAL
-- ============================================================

CREATE TABLE IF NOT EXISTS cycle_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    average_cycle_days INTEGER DEFAULT 28,
    average_period_days INTEGER DEFAULT 5,
    last_period_start TEXT,
    notifications_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS cycle_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    period_start TEXT,
    period_end TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cycle_records_user
ON cycle_records(user_id);


-- ============================================================
-- FAMÍLIA
-- ============================================================

CREATE TABLE IF NOT EXISTS family_groups (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(owner_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS family_members (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL,
    user_id TEXT,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member'
        CHECK(role IN ('owner','admin','member')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','active','declined','removed')),
    permissions TEXT,
    invited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    joined_at TEXT,

    FOREIGN KEY(family_id)
        REFERENCES family_groups(id)
        ON DELETE CASCADE,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_family_members_family
ON family_members(family_id);

CREATE INDEX IF NOT EXISTS idx_family_members_user
ON family_members(user_id);

CREATE INDEX IF NOT EXISTS idx_family_members_email
ON family_members(email);


-- ============================================================
-- RESUMOS SEMANAIS
-- ============================================================

CREATE TABLE IF NOT EXISTS weekly_summaries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    week_start TEXT NOT NULL,
    tasks_completion REAL DEFAULT 0,
    workouts_count INTEGER DEFAULT 0,
    study_minutes INTEGER DEFAULT 0,
    hydration_goal_percent REAL DEFAULT 0,
    income_total REAL DEFAULT 0,
    expense_total REAL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_summary_user_week
ON weekly_summaries(user_id, week_start);


-- ============================================================
-- NOTIFICAÇÕES
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
ON notifications(user_id, read);


-- ============================================================
-- LOG DE ATIVIDADES
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user
ON activity_log(user_id, created_at);


-- ============================================================
-- CONTROLE BÁSICO DE TENTATIVAS DE LOGIN
-- ============================================================

CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY,
    email TEXT,
    ip_hash TEXT,
    successful INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email
ON login_attempts(email, created_at);


-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
