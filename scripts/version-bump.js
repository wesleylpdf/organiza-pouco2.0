/**
 * Script de versionamento de build.
 *
 * Formato da versão: 2.X.X (sempre mantém o 2 fixo).
 *   - grande (major): incrementa o primeiro X (2.2.0 → 2.3.0) e zera o segundo X.
 *   - pequena (minor): incrementa o segundo X (2.2.0 → 2.2.1).
 *
 * Atualiza package.json e src/components/Header.ts (Versão: 2.X.X).
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const ROOT = resolve(process.cwd())
const PKG_PATH = resolve(ROOT, 'package.json')
const HEADER_PATH = resolve(ROOT, 'src/components/Header.ts')
const HEADER_PATTERN = /Versão:\s*2\.\d+\.\d+/

function parseVersion(versao) {
  const [major, minor, patch] = String(versao).split('.').map(Number)
  return { major, minor, patch }
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`
}

export async function bump(tipo) {
  const pkg = JSON.parse(await readFile(PKG_PATH, 'utf-8'))
  const { major, minor, patch } = parseVersion(pkg.version)

  let proximo
  if (tipo === 'grande' || tipo === 'major') {
    proximo = { major: 2, minor: minor + 1, patch: 0 }
  } else {
    // pequena / minor (padrão)
    proximo = { major: 2, minor, patch: patch + 1 }
  }

  const novaVersao = formatVersion(proximo)

  pkg.version = novaVersao
  await writeFile(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8')

  let header = await readFile(HEADER_PATH, 'utf-8')
  if (!HEADER_PATTERN.test(header)) {
    throw new Error(`Não foi possível encontrar o padrão "Versão: 2.X.X" em ${HEADER_PATH}`)
  }
  header = header.replace(HEADER_PATTERN, `Versão: ${novaVersao}`)
  await writeFile(HEADER_PATH, header, 'utf-8')

  console.log(`Versão atualizada para ${novaVersao}`)
  console.log(`  - package.json: version = ${novaVersao}`)
  console.log(`  - src/components/Header.ts: Versão: ${novaVersao}`)
}

const tipo = process.argv[2]
if (!tipo || !['grande', 'major', 'pequena', 'minor'].includes(tipo)) {
  console.error('Uso: node scripts/version-bump.js <grande|major|pequena|minor>')
  process.exit(1)
}

bump(tipo).catch((err) => {
  console.error(err)
  process.exit(1)
})
