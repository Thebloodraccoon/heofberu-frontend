import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'seed-data')

const API_URL = process.env.API_URL || 'http://localhost:8000'
const EMAIL = process.argv[2] || process.env.HEOFBERU_EMAIL
const PASSWORD = process.argv[3] || process.env.HEOFBERU_PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error('Использование: node scripts/seed.mjs <email> <password>')
  console.error('Или переменные окружения HEOFBERU_EMAIL / HEOFBERU_PASSWORD')
  process.exit(1)
}

const load = (name) => JSON.parse(fs.readFileSync(path.join(dataDir, `${name}.json`), 'utf8'))
const headers = (token) => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) })
const SIZE = 100

async function api(token, method, url, body) {
  const res = await fetch(`${API_URL}${url}`, {
    method,
    headers: headers(token),
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const detail = data?.detail ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : res.status
    throw new Error(`${method} ${url} -> ${res.status}: ${detail}`)
  }
  return data
}

async function login() {
  const res = await api(null, 'POST', '/api/auth/login', { email: EMAIL, password: PASSWORD })
  console.log('Вход выполнен.')
  return res.access_token
}

async function ensureByIds(token, resource, items, refMap, idRefs, idMap = refMap) {
  const created = []
  const page = await api(token, 'GET', `/api/${resource}/?size=${SIZE}`)
  const existing = new Map()
  for (const i of page.items || []) existing.set(i.name.toLowerCase(), i)

  if (existing.size > 0 && !items.some((it) => existing.has(it.name.toLowerCase()))) {
    console.log(`  (раздел уже наполнен, совпадений по именам нет — пропущен)`)
    return created
  }

  for (const item of items) {
    const exist = existing.get(item.name.toLowerCase())
    if (exist) {
      idMap[item.name] = exist.id
      if (item.key) idMap[item.key] = exist.id
      console.log(`  - ${item.name} (уже есть)`)
      continue
    }
    const body = { ...item }
    delete body.key
    for (const key of idRefs) {
      if (Array.isArray(body[key])) {
        body[key] = body[key].map((ref) => refMap[ref]).filter(Boolean)
      }
    }
    try {
      const createdItem = await api(token, 'POST', `/api/${resource}/`, body)
      idMap[item.name] = createdItem.id
      if (item.key) idMap[item.key] = createdItem.id
      created.push(item.name)
      console.log(`  + ${item.name}`)
    } catch (e) {
      console.error(`  ! ${item.name}: ${e.message}`)
    }
  }
  return created
}

try {
  const token = await login()

  const skillId = {}
  const skills = load('skills')
  const skillPage = await api(token, 'GET', `/api/skills/?size=${SIZE}`)
  for (const s of skillPage.items || []) {
    skillId[(s.key || '').toLowerCase()] = s.id
    skillId[s.name] = s.id
  }
  console.log('Навыки:')
  for (const skill of skills) {
    if (skillId[skill.key.toLowerCase()]) {
      console.log(`  - ${skill.name} (уже есть)`)
      continue
    }
    try {
      const created = await api(token, 'POST', '/api/skills/', skill)
      skillId[skill.key.toLowerCase()] = created.id
      skillId[created.name] = created.id
      console.log(`  + ${skill.name}`)
    } catch (e) {
      console.error(`  ! ${skill.name}: ${e.message}`)
    }
  }

  console.log('Расы:')
  await ensureByIds(token, 'races', load('races'), skillId, ['granted_skills'])

  const classId = {}
  console.log('Классы:')
  await ensureByIds(token, 'classes', load('classes'), skillId, ['available_skills'], classId)

  console.log('Предыстории:')
  await ensureByIds(token, 'backgrounds', load('backgrounds'), skillId, ['granted_skills'])

  console.log('Черты:')
  await ensureByIds(token, 'feats', load('feats'), {}, [])

  console.log('Заклинания:')
  await ensureByIds(token, 'spells', load('spells'), classId, ['available_classes'])

  console.log('Предметы:')
  await ensureByIds(token, 'items', load('items'), {}, [])

  console.log('\nГотово. Справочник наполнен.')
} catch (e) {
  console.error('Ошибка:', e.message)
  process.exit(1)
}
