/**
 * Verificação de paridade FRONT ↔ BACK: as rotas que o front chama existem no
 * backend?
 *
 *   node scripts/check-api-contract.mjs
 *
 * Lê os controllers do backend (`@Controller` + `@Get/@Post/@Put/@Patch/@Delete`)
 * e extrai as URLs chamadas pela camada de API do frontend
 * (`src/services/api/*.ts`). Cada URL do frontend é normalizada para
 * `/seg/param/seg` e comparada com o conjunto de rotas do backend.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const API_ROOT = 'D:/TCC/agendaqui-api/src'
const FE_ROOT = 'D:/TCC/Agendaqui/src/services/api'

/* ---------------- backend: coleta as rotas ---------------- */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (entry.endsWith('.controller.ts')) out.push(full)
  }
  return out
}

const METHOD_ALIASES = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  patch: 'PATCH',
  delete: 'DELETE',
}

const backendRoutes = new Set()

for (const file of walk(API_ROOT)) {
  const src = readFileSync(file, 'utf8')
  const controllerMatch = src.match(/@Controller\(\s*'([^']*)'\s*\)/)
  if (!controllerMatch) continue
  const prefix = controllerMatch[1].replace(/^\/+|\/+$/g, '')

  // Associa cada método HTTP ao path declarado mais próximo acima dele.
  const lines = src.split(/\r?\n/)
  let pendingPath = null
  for (let i = 0; i < lines.length; i += 1) {
    const verbMatch = lines[i].match(/@(Get|Post|Put|Patch|Delete)\(\s*(?:'([^']*)')?\s*\)/)
    if (verbMatch) {
      const method = METHOD_ALIASES[verbMatch[1].toLowerCase()]
      const path = (verbMatch[2] ?? '').replace(/^\/+|\/+$/g, '')
      const segments = [prefix, path].filter(Boolean).join('/')
      backendRoutes.add(`${method} /${segments}`)
      pendingPath = null
      continue
    }
    // @Controller() sem prefixo, ou rotas com parâmetro inline.
    const inlineMatch = lines[i].match(/@(Get|Post|Put|Patch|Delete)\(\s*`([^`]*)`\s*\)/)
    if (inlineMatch) {
      const method = METHOD_ALIASES[inlineMatch[1].toLowerCase()]
      const path = inlineMatch[2].replace(/^\/+|\/+$/g, '')
      backendRoutes.add(`${method} /${[prefix, path].filter(Boolean).join('/')}`)
    }
  }
}

/* ---------------- frontend: coleta as URLs chamadas ---------------- */
const feCalls = []

for (const entry of readdirSync(FE_ROOT)) {
  if (!entry.endsWith('.ts')) continue
  /* Arquivos de teste usam rotas INVENTADAS de propósito (casos negativos). */
  if (entry.includes('.test.')) continue
  const file = join(FE_ROOT, entry)
  const src = readFileSync(file, 'utf8')

  // apiClient.get/post/put/patch/delete(`...`)
  const callRegex = /apiClient\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*[`'"]([^`'"$]*)[`'"]/g
  let match
  while ((match = callRegex.exec(src)) !== null) {
    const method = METHOD_ALIASES[match[1]]
    const raw = match[2]
    const url = raw.split('?')[0].trim()
    feCalls.push({ file: relative('D:/TCC/Agendaqui', file), method, url, raw })
  }
}

/* ---------------- normalização ---------------- */
function normalize(pathname) {
  return (
    '/' +
    pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => {
        if (segment.startsWith(':') || segment.startsWith('${')) return ':param'
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
          return ':param'
        }
        return segment
      })
      .join('/')
  )
}

function normalizeBackend(route) {
  const [method, pathname] = route.split(' ')
  return `${method} ${normalize(pathname)}`
}

const backendNormalized = new Set([...backendRoutes].map(normalizeBackend))

/* também aceitamos as rotas do backend com prefixo '/api' eventual */
const missing = []
const seen = new Set()

for (const call of feCalls) {
  const key = `${call.method} ${normalize(call.url)}`
  if (seen.has(key)) continue
  seen.add(key)

  if (!backendNormalized.has(key)) {
    missing.push(call)
  }
}

/* ---------------- relatório ---------------- */
console.log(`Rotas no backend: ${backendRoutes.size}`)
console.log(`Chamadas distintas no frontend: ${seen.size}`)
console.log('')

if (missing.length === 0) {
  console.log('OK — toda rota chamada pelo frontend existe no backend.')
  process.exit(0)
}

console.log(`ROTA(S) DO FRONTEND SEM CORRESPONDENTE NO BACKEND (${missing.length}):`)
for (const call of missing) {
  console.log(`  ${call.method.padEnd(6)} ${call.url}`)
  console.log(`         ↳ ${call.file}`)
}
process.exit(1)
