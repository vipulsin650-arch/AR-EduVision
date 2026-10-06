// Vercel serverless catch-all that mirrors the EduVision backend API.
// It exists so the React app works on Vercel TODAY (login + AR content +
// models) before the Java jar is deployed anywhere. GLB models themselves
// are fetched by the browser from jsdelivr, so they just work.
//
// Route: /api/*  (file location: api/[...all].js)
const seed = require('./seed.json')

const USERS = {
  'student1@eduvision.com':  { id: 3, name: 'Ravi Sharma',        role: 'STUDENT',   grade: '10', pw: 'Student@123' },
  'teacher@eduvision.com':   { id: 1, name: 'Ms. Elena Fischer',  role: 'TEACHER',   grade: '10', pw: 'Teacher@123' },
  'developer@eduvision.com': { id: 2, name: 'Dev Arjun Mehta',    role: 'DEVELOPER', grade: '',   pw: 'Developer@123' },
}

function send(res, code, obj) {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.end(JSON.stringify(obj))
}

function body(req) {
  try {
    if (req.body && typeof req.body === 'object') return req.body
    if (typeof req.body === 'string') return JSON.parse(req.body)
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8'))
  } catch { /* fall through */ }
  return {}
}

function detailByMarker(markerId) {
  for (const key of Object.keys(seed.details)) {
    const d = seed.details[key]
    if (String(d.markerId) === String(markerId)) return d
  }
  return null
}

module.exports = (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {})

  const path = (req.url || '').split('?')[0].replace(/^\/api/, '') || '/'
  const seg = path.split('/').filter(Boolean)
  const m = req.method

  if (m === 'GET' && path === '/health') return send(res, 200, { status: 'ok' })

  // ---- auth
  if (m === 'POST' && path === '/auth/login') {
    const b = body(req)
    const email = String(b.email || '').toLowerCase()
    const u = USERS[email]
    if (!u || u.pw !== String(b.password || '')) {
      return send(res, 401, { message: 'Invalid email or password.' })
    }
    return send(res, 200, { token: `demo-token-${u.role}`, expiresInSeconds: 43200,
      user: { id: u.id, name: u.name, email, role: u.role, grade: u.grade } })
  }
  if (m === 'POST' && path === '/auth/register') {
    const b = body(req)
    const role = b.role || 'STUDENT'
    return send(res, 200, { token: `demo-token-${role}`, expiresInSeconds: 43200,
      user: { id: 99, name: b.name || 'Student', email: String(b.email || '').toLowerCase(), role, grade: b.grade || '' } })
  }
  if (m === 'GET' && path === '/auth/me') return send(res, 200, seed.me)

  // ---- ar content
  if (m === 'GET' && seg[0] === 'ar-content') {
    if (seg.length === 1) return send(res, 200, seed.contents)
    if (seg[1] === 'marker' && seg[2]) {
      const d = detailByMarker(seg[2])
      return d ? send(res, 200, d) : send(res, 404, { message: `No lesson for marker ${seg[2]}` })
    }
    const d = seed.details[String(seg[1])]
    return d ? send(res, 200, d) : send(res, 404, { message: 'Content not found' })
  }

  // ---- classes
  if (m === 'GET' && seg[0] === 'classes') return send(res, 200, seed.classes)

  // ---- assignments
  if (m === 'GET' && seg[0] === 'assignments' && seg[1] === 'student') return send(res, 200, seed.assignments)

  // ---- progress / quiz
  if (m === 'GET' && path === '/progress/me') return send(res, 200, seed.progress)
  if (m === 'GET' && path === '/quiz/results/me') return send(res, 200, seed.quizResults)
  if (m === 'POST' && path === '/quiz/submit') {
    return send(res, 200, { score: 0, totalQuestions: 0, percentage: 0, attempts: 1, bestScore: 0, relatedContentTitle: '', results: [] })
  }

  // ---- live sessions (minimal stubs)
  if (m === 'POST' && path === '/live/sessions') return send(res, 200, { sessionId: 1, code: 'EDU1' })
  if (m === 'GET' && seg[0] === 'live') return send(res, 200, [])
  if (m === 'POST' && seg[0] === 'live') return send(res, 200, { ok: true })

  return send(res, 404, { message: `No API route for ${m} /api${path}` })
}
