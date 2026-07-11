const DEFAULT_TIMEOUT_MS = Number(process.env.LOAD_TEST_TIMEOUT_MS || 15000);
const DEFAULT_ITERATIONS = Math.max(1, Number(process.env.LOAD_TEST_ITERATIONS || 5));
const DEFAULT_CONCURRENCY = Math.max(1, Number(process.env.LOAD_TEST_CONCURRENCY || 1));
const BASE_URL = String(process.env.LOAD_TEST_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/+$/, '');
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();

function getTargetMonth() {
  const raw = String(process.env.LOAD_TEST_MONTH || '').trim();
  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [year, month] = raw.split('-').map((v) => Number(v));
    return { year, month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}

function summarizeResults(name, results) {
  const durations = results.map((item) => item.duration_ms);
  const statuses = {};
  for (const item of results) {
    const key = String(item.statusCode || item.error || 'unknown');
    statuses[key] = (statuses[key] || 0) + 1;
  }
  const successCount = results.filter((item) => item.ok).length;
  const total = results.length;
  const average = durations.reduce((sum, value) => sum + value, 0) / Math.max(1, total);
  return {
    name,
    total,
    success: successCount,
    failure: total - successCount,
    success_rate: Number(((successCount / Math.max(1, total)) * 100).toFixed(2)),
    avg_ms: Math.round(average),
    min_ms: durations.length ? Math.min(...durations) : 0,
    p95_ms: percentile(durations, 0.95),
    max_ms: durations.length ? Math.max(...durations) : 0,
    statuses
  };
}

async function requestJson(path, { method = 'GET', body, token, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
  const headers = { Accept: 'application/json' };
  if (body != null) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const started = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return {
      ok: res.ok,
      statusCode: res.status,
      duration_ms: Date.now() - started,
      body: json,
      rawBody: text
    };
  } finally {
    clearTimeout(timer);
  }
}

async function loginAsAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return null;
  const res = await requestJson('/api/auth/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
  });
  if (!res.ok || !res.body?.accessToken) {
    throw new Error(`Admin login failed (${res.statusCode}): ${res.rawBody || 'no response body'}`);
  }
  return res.body.accessToken;
}

async function resolveUserId(token) {
  const explicit = Number(process.env.LOAD_TEST_USER_ID || 0);
  if (explicit > 0) return explicit;
  if (!token) return null;
  const usersRes = await requestJson('/api/admin/users?limit=50&offset=0', { token });
  const rows = Array.isArray(usersRes.body) ? usersRes.body : ((usersRes.body && usersRes.body.rows) || []);
  const first = Array.isArray(rows) ? rows.find((row) => Number(row?.id || 0) > 0) : null;
  return first ? Number(first.id) : null;
}

function buildScenarios(context) {
  const month = getTargetMonth();
  const userIdQuery = context.userId ? `&userId=${encodeURIComponent(String(context.userId))}` : '';
  return [
    {
      name: 'healthz',
      auth: false,
      acceptedStatuses: [200],
      path: () => '/healthz'
    },
    {
      name: 'readyz',
      auth: false,
      acceptedStatuses: [200, 503],
      path: () => '/readyz'
    },
    {
      name: 'admin_users',
      auth: true,
      acceptedStatuses: [200],
      path: () => '/api/admin/users?limit=2000&offset=0'
    },
    {
      name: 'leave_summary',
      auth: true,
      acceptedStatuses: [200],
      path: () => '/api/leave/summary'
    },
    {
      name: 'leave_user_balance',
      auth: true,
      acceptedStatuses: [200],
      path: () => context.userId ? `/api/leave/user-balance?userId=${encodeURIComponent(String(context.userId))}` : null
    },
    {
      name: 'attendance_today_roster',
      auth: true,
      acceptedStatuses: [200],
      path: () => '/api/attendance/today-roster'
    },
    {
      name: 'attendance_month',
      auth: true,
      acceptedStatuses: [200],
      path: () => `/api/attendance/month?year=${month.year}&month=${month.month}${userIdQuery}`
    },
    {
      name: 'attendance_month_detail',
      auth: true,
      acceptedStatuses: [200],
      path: () => `/api/attendance/month/detail?year=${month.year}&month=${month.month}${userIdQuery}`
    }
  ];
}

function filterScenarios(allScenarios, hasToken) {
  const requested = String(process.env.LOAD_TEST_SCENARIOS || '').trim();
  const names = requested ? new Set(requested.split(',').map((item) => item.trim()).filter(Boolean)) : null;
  return allScenarios.filter((scenario) => {
    if (scenario.auth && !hasToken) return false;
    const path = scenario.path();
    if (!path) return false;
    return !names || names.has(scenario.name);
  });
}

async function runScenario(scenario, context) {
  const results = [];
  let completed = 0;
  while (completed < DEFAULT_ITERATIONS) {
    const batchSize = Math.min(DEFAULT_CONCURRENCY, DEFAULT_ITERATIONS - completed);
    const batch = [];
    for (let i = 0; i < batchSize; i += 1) {
      batch.push((async () => {
        const path = scenario.path();
        const started = Date.now();
        try {
          const res = await requestJson(path, { token: scenario.auth ? context.token : null });
          return {
            ok: scenario.acceptedStatuses.includes(res.statusCode),
            statusCode: res.statusCode,
            duration_ms: res.duration_ms,
            sample: typeof res.rawBody === 'string' ? res.rawBody.slice(0, 200) : ''
          };
        } catch (error) {
          return {
            ok: false,
            duration_ms: Date.now() - started,
            error: error.message
          };
        }
      })());
    }
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    completed += batchResults.length;
  }
  return summarizeResults(scenario.name, results);
}

async function main() {
  const token = await loginAsAdmin();
  const userId = await resolveUserId(token);
  const scenarios = filterScenarios(buildScenarios({ token, userId }), Boolean(token));
  if (!scenarios.length) {
    throw new Error('No scenarios selected. Provide ADMIN_EMAIL/ADMIN_PASSWORD for authenticated scenarios or set LOAD_TEST_SCENARIOS.');
  }

  const summaries = [];
  for (const scenario of scenarios) {
    const summary = await runScenario(scenario, { token, userId });
    summaries.push(summary);
  }

  const failed = summaries.filter((item) => item.failure > 0).map((item) => item.name);
  const output = {
    baseUrl: BASE_URL,
    iterations: DEFAULT_ITERATIONS,
    concurrency: DEFAULT_CONCURRENCY,
    month: getTargetMonth(),
    userId,
    authenticated: Boolean(token),
    scenarios: summaries
  };

  console.log(JSON.stringify(output, null, 2));
  if (failed.length) {
    console.error(`Smoke/load check completed with failures in: ${failed.join(', ')}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[load-test-smoke] ${error.message}`);
  process.exitCode = 1;
});
