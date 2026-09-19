/**
 * LiDire MVP 1.0 — Cloudflare Worker + D1
 * Arquivo: index.js (na raiz do repositório)
 *
 * Binding esperado no wrangler.toml:
 *   DB     -> D1
 *   ASSETS -> arquivos estáticos
 */

const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 120000;
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_MINUTES = 15;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extra }
  });
}

function ok(data = {}, status = 200, extra = {}) {
  return json({ success: true, ...data }, status, extra);
}

function fail(message, status = 400, code = "BAD_REQUEST") {
  return json(
    {
      success: false,
      error: message,
      code
    },
    status
  );
}

function uuid() {
  return crypto.randomUUID();
}

function nowISO() {
  return new Date().toISOString();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function clean(value, max = 5000) {
  if (value === null || value === undefined) return null;

  const s = String(value).trim();

  return s ? s.slice(0, max) : null;
}

function integer(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const n = Number(value);

  return Number.isInteger(n) ? n : null;
}

function number(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const n = Number(value);

  return Number.isFinite(n) ? n : null;
}

function bool(value, fallback = 0) {
  if (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true"
  ) {
    return 1;
  }

  if (
    value === false ||
    value === 0 ||
    value === "0" ||
    value === "false"
  ) {
    return 0;
  }

  return fallback;
}

function parseCookies(request) {
  const out = {};

  const header =
    request.headers.get("Cookie") || "";

  for (const part of header.split(";")) {
    const i = part.indexOf("=");

    if (i < 0) continue;

    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();

    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }

  return out;
}

function sessionCookie(token, maxAge) {
  return [
    `lidire_session=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`
  ].join("; ");
}

function clearSessionCookie() {
  return [
    "lidire_session=",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0"
  ].join("; ");
}

function bytesToB64(bytes) {
  let s = "";

  for (const b of bytes) {
    s += String.fromCharCode(b);
  }

  return btoa(s);
}

function b64ToBytes(value) {
  const s = atob(value);

  const bytes = new Uint8Array(
    s.length
  );

  for (let i = 0; i < s.length; i++) {
    bytes[i] = s.charCodeAt(i);
  }

  return bytes;
}

function b64url(bytes) {
  return bytesToB64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomBytes(length = 32) {
  const bytes = new Uint8Array(length);

  crypto.getRandomValues(bytes);

  return bytes;
}

async function sha256(value) {
  const data =
    new TextEncoder().encode(
      String(value)
    );

  const hash =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return b64url(
    new Uint8Array(hash)
  );
}

async function hashPassword(
  password,
  saltB64 = null
) {
  const salt = saltB64
    ? b64ToBytes(saltB64)
    : randomBytes(16);

  const material =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(
        password
      ),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

  const bits =
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations:
          PASSWORD_ITERATIONS,
        hash: "SHA-256"
      },
      material,
      256
    );

  return {
    salt: bytesToB64(salt),
    hash: bytesToB64(
      new Uint8Array(bits)
    )
  };
}

async function verifyPassword(
  password,
  storedHash,
  storedSalt
) {
  const result =
    await hashPassword(
      password,
      storedSalt
    );

  return result.hash === storedHash;
}

async function readJSON(request) {
  try {
    return await request.json();
  } catch {
    throw new Error(
      "JSON inválido."
    );
  }
}

function addDays(date, days) {
  const d = new Date(date);

  d.setUTCDate(
    d.getUTCDate() + days
  );

  return d;
}

/* ============================================================
   BANCO D1
   ============================================================ */

async function ensureDatabase(env) {
  if (!env.DB) {
    throw new Error(
      "Binding DB não configurado."
    );
  }

  const statements = [

    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
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
    )`,

    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS login_attempts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      successful INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS commitments (
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
    )`,

    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      due_time TEXT,
      priority TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      shared_family INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS reminders (
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
    )`,

    `CREATE TABLE IF NOT EXISTS shopping_lists (
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
    )`,

    `CREATE TABLE IF NOT EXISTS shopping_items (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity REAL,
      unit TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(list_id)
        REFERENCES shopping_lists(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS hydration_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      ml INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS study_disciplines (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS study_activities (
      id TEXT PRIMARY KEY,
      discipline_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      scheduled_date TEXT,
      scheduled_time TEXT,
      duration_minutes INTEGER,
      schedule TEXT,
      notes TEXT,
      bibliography TEXT,
      search_url TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(discipline_id)
        REFERENCES study_disciplines(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      scheduled_date TEXT,
      scheduled_time TEXT,
      scheduled_at TEXT,
      duration_minutes INTEGER,
      shared_family INTEGER NOT NULL DEFAULT 0,
      done INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sets INTEGER,
      target_reps INTEGER,
      performed_reps INTEGER,
      load REAL,
      video_url TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(workout_id)
        REFERENCES workouts(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL
        CHECK(type IN ('receita','despesa')),
      category TEXT,
      description TEXT,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      payment_method TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS fixed_expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      due_day INTEGER,
      category TEXT,
      paid INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS objectives (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      deadline TEXT,
      financial_target REAL,
      accumulated_value REAL NOT NULL DEFAULT 0,
      progress REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS objective_tasks (
      id TEXT PRIMARY KEY,
      objective_id TEXT NOT NULL,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(objective_id)
        REFERENCES objectives(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT,
      title TEXT NOT NULL,
      message TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS family_groups (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      user_id TEXT,
      email TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(family_id)
        REFERENCES family_groups(id)
        ON DELETE CASCADE,
      FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
    )`,

    `CREATE TABLE IF NOT EXISTS weekly_summaries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      week_start TEXT NOT NULL,
      tasks_completion REAL,
      workouts_count INTEGER,
      study_minutes INTEGER,
      hydration_goal_percent REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )`
  ];

  for (const sql of statements) {
    await env.DB.prepare(sql).run();
  }
}

/* ============================================================
   AUDITORIA
   ============================================================ */

async function logActivity(
  env,
  userId,
  action,
  entityType = null,
  entityId = null
) {
  try {
    await env.DB.prepare(`
      INSERT INTO activity_log (
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `)
      .bind(
        uuid(),
        userId,
        action,
        entityType,
        entityId,
        nowISO()
      )
      .run();
  } catch (_) {}
}

/* ============================================================
   LOGIN RATE LIMIT
   ============================================================ */

async function getClientIPHash(
  request
) {
  return sha256(
    request.headers.get(
      "CF-Connecting-IP"
    ) ||
    request.headers.get(
      "X-Forwarded-For"
    ) ||
    "unknown"
  );
}

async function loginBlocked(
  request,
  env,
  email
) {
  const ipHash =
    await getClientIPHash(request);

  const since =
    new Date(
      Date.now() -
        LOGIN_WINDOW_MINUTES *
          60000
    ).toISOString();

  const row =
    await env.DB.prepare(`
      SELECT COUNT(*) AS attempts
      FROM login_attempts
      WHERE email = ?
        AND ip_hash = ?
        AND successful = 0
        AND created_at >= ?
    `)
      .bind(
        email,
        ipHash,
        since
      )
      .first();

  return (
    Number(
      row?.attempts || 0
    ) >= MAX_LOGIN_ATTEMPTS
  );
}

async function registerLoginAttempt(
  request,
  env,
  email,
  successful
) {
  const ipHash =
    await getClientIPHash(request);

  await env.DB.prepare(`
    INSERT INTO login_attempts (
      id,
      email,
      ip_hash,
      successful,
      created_at
    )
    VALUES (?, ?, ?, ?, ?)
  `)
    .bind(
      uuid(),
      email,
      ipHash,
      successful ? 1 : 0,
      nowISO()
    )
    .run();
}

/* ============================================================
   SESSÕES
   ============================================================ */

async function createSession(
  env,
  userId
) {
  const token =
    b64url(
      randomBytes(32)
    );

  const tokenHash =
    await sha256(token);

  const expiresAt =
    addDays(
      new Date(),
      SESSION_DAYS
    ).toISOString();

  await env.DB.prepare(`
    INSERT INTO sessions (
      id,
      user_id,
      token_hash,
      expires_at,
      created_at,
      last_seen_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `)
    .bind(
      uuid(),
      userId,
      tokenHash,
      expiresAt,
      nowISO(),
      nowISO()
    )
    .run();

  return token;
}

async function currentUser(
  request,
  env
) {
  const token =
    parseCookies(
      request
    ).lidire_session;

  if (!token) {
    return null;
  }

  const tokenHash =
    await sha256(token);

  const row =
    await env.DB.prepare(`
      SELECT
        s.id AS session_id,
        u.id,
        u.name,
        u.email,
        u.age,
        u.phone,
        u.avatar_url,
        u.timezone,
        u.onboarding_completed,
        u.active,
        u.created_at,
        u.updated_at
      FROM sessions s
      JOIN users u
        ON u.id = s.user_id
      WHERE s.token_hash = ?
        AND s.expires_at > ?
        AND u.active = 1
      LIMIT 1
    `)
      .bind(
        tokenHash,
        nowISO()
      )
      .first();

  if (!row) {
    return null;
  }

  await env.DB.prepare(`
    UPDATE sessions
    SET last_seen_at = ?
    WHERE id = ?
  `)
    .bind(
      nowISO(),
      row.session_id
    )
    .run();

  return row;
}

async function authUser(
  request,
  env
) {
  const user =
    await currentUser(
      request,
      env
    );

  if (!user) {
    throw new Error(
      "AUTH_REQUIRED"
    );
  }

  return user;
}

/* ============================================================
   AUTH — CADASTRO
   ============================================================ */

async function register(
  request,
  env
) {
  const body =
    await readJSON(request);

  const name =
    clean(
      body.name,
      120
    );

  const email =
    normalizeEmail(
      body.email
    );

  const password =
    body.password;

  if (!name) {
    return fail(
      "Informe seu nome.",
      422,
      "INVALID_NAME"
    );
  }

  if (!validEmail(email)) {
    return fail(
      "Informe um e-mail válido.",
      422,
      "INVALID_EMAIL"
    );
  }

  if (
    typeof password !==
      "string" ||
    password.length < 8
  ) {
    return fail(
      "A senha deve ter pelo menos 8 caracteres.",
      422,
      "INVALID_PASSWORD"
    );
  }

  const exists =
    await env.DB.prepare(`
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
    `)
      .bind(email)
      .first();

  if (exists) {
    return fail(
      "Já existe uma conta com este e-mail.",
      409,
      "EMAIL_EXISTS"
    );
  }

  const pw =
    await hashPassword(
      password
    );

  const id = uuid();
  const now = nowISO();

  await env.DB.prepare(`
    INSERT INTO users (
      id,
      name,
      email,
      password_hash,
      password_salt,
      timezone,
      onboarding_completed,
      active,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      id,
      name,
      email,
      pw.hash,
      pw.salt,
      "America/Sao_Paulo",
      0,
      1,
      now,
      now
    )
    .run();

  const token =
    await createSession(
      env,
      id
    );

  await logActivity(
    env,
    id,
    "account_created"
  );

  return ok(
    {
      user: {
        id,
        name,
        email
      }
    },
    201,
    {
      "Set-Cookie":
        sessionCookie(
          token,
          SESSION_DAYS *
            86400
        )
    }
  );
}

/* ============================================================
   AUTH — LOGIN
   ============================================================ */

async function login(
  request,
  env
) {
  const body =
    await readJSON(request);

  const email =
    normalizeEmail(
      body.email
    );

  const password =
    body.password;

  if (
    !validEmail(email) ||
    !password
  ) {
    return fail(
      "Informe e-mail e senha.",
      422,
      "INVALID_LOGIN"
    );
  }

  if (
    await loginBlocked(
      request,
      env,
      email
    )
  ) {
    return fail(
      "Muitas tentativas de login. Tente novamente mais tarde.",
      429,
      "TOO_MANY_ATTEMPTS"
    );
  }

  const user =
    await env.DB.prepare(`
      SELECT
        id,
        name,
        email,
        password_hash,
        password_salt,
        age,
        phone,
        avatar_url,
        timezone,
        onboarding_completed
      FROM users
      WHERE email = ?
        AND active = 1
      LIMIT 1
    `)
      .bind(email)
      .first();

  if (
    !user ||
    !(await verifyPassword(
      password,
      user?.password_hash,
      user?.password_salt
    ))
  ) {
    await registerLoginAttempt(
      request,
      env,
      email,
      false
    );

    return fail(
      "E-mail ou senha incorretos.",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  await registerLoginAttempt(
    request,
    env,
    email,
    true
  );

  const token =
    await createSession(
      env,
      user.id
    );

  await logActivity(
    env,
    user.id,
    "login"
  );

  return ok(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        phone: user.phone,
        avatar_url:
          user.avatar_url,
        timezone:
          user.timezone,
        onboarding_completed:
          !!user.onboarding_completed
      }
    },
    200,
    {
      "Set-Cookie":
        sessionCookie(
          token,
          SESSION_DAYS *
            86400
        )
    }
  );
}

/* ============================================================
   AUTH — LOGOUT
   ============================================================ */

async function logout(
  request,
  env
) {
  const token =
    parseCookies(
      request
    ).lidire_session;

  if (token) {
    await env.DB.prepare(`
      DELETE FROM sessions
      WHERE token_hash = ?
    `)
      .bind(
        await sha256(token)
      )
      .run();
  }

  return ok(
    {
      message:
        "Sessão encerrada."
    },
    200,
    {
      "Set-Cookie":
        clearSessionCookie()
    }
  );
}

/* ============================================================
   AUTH — ME
   ============================================================ */

async function me(
  request,
  env
) {
  const u =
    await authUser(
      request,
      env
    );

  return ok({
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
      age: u.age,
      phone: u.phone,
      avatar_url:
        u.avatar_url,
      timezone:
        u.time
