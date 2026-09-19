/**
 * ============================================================
 * LiDire MVP 1.0
 * Backend / Cloudflare Worker
 * ============================================================
 *
 * Arquitetura:
 * - Cloudflare Workers
 * - Cloudflare D1
 * - Web Crypto API
 * - Sessões por cookie HttpOnly
 * - Dados isolados por usuário
 *
 * Binding esperado:
 *   DB    -> banco D1
 *   ASSETS -> arquivos estáticos
 *
 * ============================================================
 */

const SESSION_DAYS = 30;
const PASSWORD_ITERATIONS = 120000;
const MAX_LOGIN_ATTEMPTS = 8;
const LOGIN_WINDOW_MINUTES = 15;

/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=UTF-8",
  "Cache-Control": "no-store"
};

const TEXT_HEADERS = {
  "Content-Type": "text/plain; charset=UTF-8",
  "Cache-Control": "no-store"
};

/* ============================================================
   RESPOSTAS
   ============================================================ */

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders
    }
  });
}

function error(message, status = 400, code = "BAD_REQUEST") {
  return json(
    {
      success: false,
      error: message,
      code
    },
    status
  );
}

function success(data = {}, status = 200) {
  return json({
    success: true,
    ...data
  }, status);
}

/* ============================================================
   UTILITÁRIOS
   ============================================================ */

function uuid() {
  return crypto.randomUUID();
}

function nowISO() {
  return new Date().toISOString();
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return typeof password === "string" && password.length >= 8;
}

function cleanString(value, max = 5000) {
  if (value === null || value === undefined) return null;

  const str = String(value).trim();

  if (!str) return null;

  return str.slice(0, max);
}

function intOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isInteger(number)) {
    return null;
  }

  return number;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

/* ============================================================
   BASE64 / CRYPTO
   ============================================================ */

function bytesToBase64(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function base64Url(bytes) {
  return bytesToBase64(bytes)
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
  const data = new TextEncoder().encode(value);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return base64Url(new Uint8Array(hash));
}

/* ============================================================
   SENHA
   ============================================================ */

async function hashPassword(password, saltBase64 = null) {
  const salt = saltBase64
    ? base64ToBytes(saltBase64)
    : randomBytes(16);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PASSWORD_ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  const hash = new Uint8Array(bits);

  return {
    salt: bytesToBase64(salt),
    hash: bytesToBase64(hash)
  };
}

async function verifyPassword(password, storedHash, storedSalt) {
  const result = await hashPassword(
    password,
    storedSalt
  );

  return result.hash === storedHash;
}

/* ============================================================
   COOKIES
   ============================================================ */

function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";

  const cookies = {};

  for (const part of header.split(";")) {
    const index = part.indexOf("=");

    if (index === -1) continue;

    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    cookies[name] = decodeURIComponent(value);
  }

  return cookies;
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

/* ============================================================
   AUTENTICAÇÃO
   ============================================================ */

async function createSession(env, userId) {
  const tokenBytes = randomBytes(32);
  const token = base64Url(tokenBytes);
  const tokenHash = await sha256(token);

  const expiresAt = addDays(
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

  return {
    token,
    expiresAt
  };
}

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request);
  const token = cookies.lidire_session;

  if (!token) {
    return null;
  }

  const tokenHash = await sha256(token);

  const result = await env.DB.prepare(`
    SELECT
      s.id AS session_id,
      s.user_id,
      s.expires_at,
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
    INNER JOIN users u
      ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND u.active = 1
      AND s.expires_at > ?
    LIMIT 1
  `)
    .bind(tokenHash, nowISO())
    .first();

  if (!result) {
    return null;
  }

  await env.DB.prepare(`
    UPDATE sessions
    SET last_seen_at = ?
    WHERE id = ?
  `)
    .bind(nowISO(), result.session_id)
    .run();

  return result;
}

async function requireAuth(request, env) {
  const user = await getAuthenticatedUser(
    request,
    env
  );

  if (!user) {
    throw new AuthError(
      "Sua sessão expirou. Faça login novamente."
    );
  }

  return user;
}

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthError";
  }
}

/* ============================================================
   LOGIN RATE LIMIT
   ============================================================ */

async function getClientIPHash(request) {
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown";

  return sha256(ip);
}

async function loginBlocked(request, env, email) {
  const ipHash = await getClientIPHash(request);

  const since = new Date(
    Date.now() -
      LOGIN_WINDOW_MINUTES * 60 * 1000
  ).toISOString();

  const result = await env.DB.prepare(`
    SELECT COUNT(*) AS attempts
    FROM login_attempts
    WHERE email = ?
      AND ip_hash = ?
      AND successful = 0
      AND created_at >= ?
  `)
    .bind(email, ipHash, since)
    .first();

  return Number(result?.attempts || 0) >= MAX_LOGIN_ATTEMPTS;
}

async function registerLoginAttempt(
  request,
  env,
  email,
  successful
) {
  const ipHash = await getClientIPHash(request);

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
   REQUEST BODY
   ============================================================ */

async function readJSON(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("JSON inválido.");
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
  } catch {
    // O log não deve impedir uma operação válida.
  }
}

/* ============================================================
   ROUTER
   ============================================================ */

function route(pathname, method) {
  return {
    pathname,
    method
  };
}

/* ============================================================
   HEALTH
   ============================================================ */

async function health(env) {
  let database = false;

  try {
    await env.DB.prepare(
      "SELECT 1 AS ok"
    ).first();

    database = true;
  } catch {
    database = false;
  }

  return success({
    service: "LiDire",
    status: database ? "online" : "degraded",
    database,
    timestamp: nowISO(),
    version: "1.0.0"
  });
}

/* ============================================================
   AUTH — REGISTER
   ============================================================ */

async function register(request, env) {
  const body = await readJSON(request);

  const name = cleanString(body.name, 120);
  const email = normalizeEmail(body.email);
  const password = body.password;

  if (!name) {
    return error(
      "Informe seu nome.",
      422,
      "INVALID_NAME"
    );
  }

  if (!isValidEmail(email)) {
    return error(
      "Informe um e-mail válido.",
      422,
      "INVALID_EMAIL"
    );
  }

  if (!isValidPassword(password)) {
    return error(
      "A senha deve ter pelo menos 8 caracteres.",
      422,
      "INVALID_PASSWORD"
    );
  }

  const existing = await env.DB.prepare(`
    SELECT id
    FROM users
    WHERE email = ?
    LIMIT 1
  `)
    .bind(email)
    .first();

  if (existing) {
    return error(
      "Já existe uma conta com este e-mail.",
      409,
      "EMAIL_EXISTS"
    );
  }

  const passwordData =
    await hashPassword(password);

  const userId = uuid();
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
      userId,
      name,
      email,
      passwordData.hash,
      passwordData.salt,
      "America/Sao_Paulo",
      0,
      1,
      now,
      now
    )
    .run();

  await logActivity(
    env,
    userId,
    "account_created"
  );

  const session =
    await createSession(env, userId);

  return success(
    {
      user: {
        id: userId,
        name,
        email
      }
    },
    201,
    {
      "Set-Cookie": sessionCookie(
        session.token,
        SESSION_DAYS * 24 * 60 * 60
      )
    }
  );
}

/* ============================================================
   AUTH — LOGIN
   ============================================================ */

async function login(request, env) {
  const body = await readJSON(request);

  const email = normalizeEmail(body.email);
  const password = body.password;

  if (!isValidEmail(email) || !password) {
    return error(
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
    return error(
      "Muitas tentativas de login. Tente novamente mais tarde.",
      429,
      "TOO_MANY_ATTEMPTS"
    );
  }

  const user = await env.DB.prepare(`
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

  if (!user) {
    await registerLoginAttempt(
      request,
      env,
      email,
      false
    );

    return error(
      "E-mail ou senha incorretos.",
      401,
      "INVALID_CREDENTIALS"
    );
  }

  const valid =
    await verifyPassword(
      password,
      user.password_hash,
      user.password_salt
    );

  if (!valid) {
    await registerLoginAttempt(
      request,
      env,
      email,
      false
    );

    return error(
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

  const session =
    await createSession(
      env,
      user.id
    );

  await logActivity(
    env,
    user.id,
    "login"
  );

  return success(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        phone: user.phone,
        avatar_url: user.avatar_url,
        timezone: user.timezone,
        onboarding_completed:
          Boolean(user.onboarding_completed)
      }
    },
    200,
    {
      "Set-Cookie": sessionCookie(
        session.token,
        SESSION_DAYS * 24 * 60 * 60
      )
    }
  );
}

/* ============================================================
   AUTH — LOGOUT
   ============================================================ */

async function logout(request, env) {
  const cookies = parseCookies(request);
  const token = cookies.lidire_session;

  if (token) {
    const tokenHash = await sha256(token);

    await env.DB.prepare(`
      DELETE FROM sessions
      WHERE token_hash = ?
    `)
      .bind(tokenHash)
      .run();
  }

  return success(
    {
      message: "Sessão encerrada."
    },
    200,
    {
      "Set-Cookie": clearSessionCookie()
    }
  );
}

/* ============================================================
   AUTH — ME
   ============================================================ */

async function me(request, env) {
  const user =
    await requireAuth(request, env);

  return success({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age,
      phone: user.phone,
      avatar_url: user.avatar_url,
      timezone: user.timezone,
      onboarding_completed:
        Boolean(user.onboarding_completed),
      created_at: user.created_at
    }
  });
}

/* ============================================================
   PERFIL
   ============================================================ */

async function updateProfile(
  request,
  env,
  user
) {
  const body = await readJSON(request);

  const name = cleanString(body.name, 120);
  const age = intOrNull(body.age);
  const phone = cleanString(body.phone, 40);
  const avatarUrl = cleanString(
    body.avatar_url,
    1000
  );
  const timezone =
    cleanString(
      body.timezone,
      100
    ) || "America/Sao_Paulo";

  if (!name) {
    return error(
      "O nome é obrigatório.",
      422
    );
  }

  if (
    age !== null &&
    (age < 13 || age > 120)
  ) {
    return error(
      "Idade inválida.",
      422
    );
  }

  await env.DB.prepare(`
    UPDATE users
    SET
      name = ?,
      age = ?,
      phone = ?,
      avatar_url = ?,
      timezone = ?,
      updated_at = ?
    WHERE id = ?
  `)
    .bind(
      name,
      age,
      phone,
      avatarUrl,
      timezone,
      nowISO(),
      user.id
    )
    .run();

  await logActivity(
    env,
    user.id,
    "profile_updated"
  );

  return success({
    message: "Perfil atualizado."
  });
}

/* ============================================================
   GENERIC CRUD
   ============================================================ */

const ENTITY_CONFIG = {
  commitments: {
    table: "commitments",
    userField: "user_id",
    fields: [
      "title",
      "description",
      "date",
      "start_time",
      "end_time",
      "location",
      "category",
      "color",
      "shared_family"
    ],
    order: "date ASC, start_time ASC"
  },

  tasks: {
    table: "tasks",
    userField: "user_id",
    fields: [
      "title",
      "description",
      "due_date",
      "due_time",
      "priority",
      "done",
      "completed_at",
      "shared_family"
    ],
    order: "done ASC, due_date ASC, due_time ASC"
  },

  reminders: {
    table: "reminders",
    userField: "user_id",
    fields: [
      "title",
      "description",
      "date",
      "time",
      "done"
    ],
    order: "date ASC, time ASC"
  },

  hydration: {
    table: "hydration_records",
    userField: "user_id",
    fields: [
      "date",
      "time",
      "ml"
    ],
    order: "date DESC, time DESC"
  },

  study_activities: {
    table: "study_activities",
    userField: "user_id",
    fields: [
      "discipline_id",
      "title",
      "description",
      "scheduled_date",
      "scheduled_time",
      "duration_minutes",
      "notes",
      "bibliography",
      "search_url",
      "done",
      "completed_at"
    ],
    order: "scheduled_date ASC, scheduled_time ASC"
  },

  workouts: {
    table: "workouts",
    userField: "user_id",
    fields: [
      "name",
      "description",
      "scheduled_date",
      "scheduled_time",
      "duration_minutes",
      "shared_family",
      "done",
      "completed_at"
    ],
    order: "scheduled_date ASC, scheduled_time ASC"
  },

  transactions: {
    table: "transactions",
    userField: "user_id",
    fields: [
      "type",
      "category",
      "description",
      "amount",
      "date",
      "payment_method"
    ],
    order: "date DESC, created_at DESC"
  },

  fixed_expenses: {
    table: "fixed_expenses",
    userField: "user_id",
    fields: [
      "name",
      "amount",
      "due_day",
      "category",
      "paid"
    ],
    order: "due_day ASC"
  },

  objectives: {
    table: "objectives",
    userField: "user_id",
    fields: [
      "title",
      "description",
      "deadline",
      "financial_target",
      "accumulated_value",
      "progress",
      "status"
    ],
    order: "deadline ASC"
  },

  notifications: {
    table: "notifications",
    userField: "user_id",
    fields: [
      "type",
      "title",
      "message",
      "read"
    ],
    order: "created_at DESC"
  }
};

/* ============================================================
   LISTAR ENTIDADE
   ============================================================ */

async function listEntity(
  request,
  env,
  user,
  entity
) {
  const config =
    ENTITY_CONFIG[entity];

  if (!config) {
    return error(
      "Recurso não encontrado.",
      404,
      "NOT_FOUND"
    );
  }

  const url = new URL(request.url);

  const limitRaw =
    Number(url.searchParams.get("limit") || 100);

  const limit = Math.min(
    Math.max(limitRaw, 1),
    200
  );

  const offsetRaw =
    Number(url.searchParams.get("offset") || 0);

  const offset = Math.max(
    offsetRaw,
    0
  );

  let sql = `
    SELECT *
    FROM ${config.table}
    WHERE ${config.userField} = ?
  `;

  const bindings = [user.id];

  const date =
    url.searchParams.get("date");

  if (date) {
    const dateFields = [
      "date",
      "due_date",
      "scheduled_date"
    ];

    const field =
      dateFields.find(
        f => config.fields.includes(f)
      );

    if (field) {
      sql += ` AND ${field} = ?`;
      bindings.push(date);
    }
  }

  sql += `
    ORDER BY ${config.order}
    LIMIT ? OFFSET ?
  `;

  bindings.push(
    limit,
    offset
  );

  const result =
