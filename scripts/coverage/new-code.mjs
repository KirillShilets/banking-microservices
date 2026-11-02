#!/usr/bin/env node
// Measures the Sonar "coverage on new code" metric from an lcov report.
//
//   node scripts/coverage/new-code.mjs [--lcov <path>] [--base <ref>] [--json]
//
// Metric: (LH + BRH) / (LF + BRF) across the files touched by the branch diff,
// which is how SonarCloud aggregates line and branch hits. Files outside
// sonar.sources, tests and coverage exclusions are ignored.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const args = process.argv.slice(2)
const readArg = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

const repoRoot = process.cwd()
const lcovPath = path.resolve(repoRoot, readArg('--lcov', 'frontend/coverage/lcov.info'))
const baseRef = readArg('--base', 'origin/main')
const asJson = args.includes('--json')

/** Paths excluded in vitest.config.ts coverage.exclude and sonar.coverage.exclusions. */
const COVERAGE_EXCLUSIONS = [
  /^src\/main\.tsx$/,
  /^src\/test\//,
  /\.d\.ts$/,
  /^src\/vite-env\.d\.ts$/,
]

function gitDiffFiles() {
  const refs = [baseRef, 'main', 'HEAD~1']
  for (const ref of refs) {
    try {
      const out = execFileSync(
        'git',
        ['diff', '--name-only', `${ref}...HEAD`, '--', 'frontend/src'],
        { encoding: 'utf8', cwd: repoRoot },
      )
      if (out.trim()) return { ref, files: out.trim().split(/\r?\n/) }
    } catch {
      // Try the next reference.
    }
  }
  return { ref: null, files: [] }
}

/** lcov SF entries are relative to the frontend project dir. */
function normalize(file) {
  return file.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^frontend\//, '')
}

function parseLcov(text) {
  const records = new Map()
  let current = null

  const flush = () => {
    if (current?.file) records.set(current.file, current)
    current = null
  }

  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('SF:')) {
      flush()
      current = { file: normalize(line.slice(3).trim()), lf: 0, lh: 0, brf: 0, brh: 0 }
    } else if (!current) {
      continue
    } else if (line.startsWith('LF:')) {
      current.lf = Number(line.slice(3))
    } else if (line.startsWith('LH:')) {
      current.lh = Number(line.slice(3))
    } else if (line.startsWith('BRDA:')) {
      // Vitest writes BRDA records but leaves BRF/BRH at 0, so count them here.
      const taken = line.slice(5).split(',')[3]
      current.brf += 1
      if (taken !== '0' && taken !== '-' && taken !== '') current.brh += 1
    }
  }
  flush()
  return records
}

function pct(covered, total) {
  return total === 0 ? 100 : (covered / total) * 100
}

if (!existsSync(lcovPath)) {
  console.error(`lcov report not found: ${lcovPath}\nRun: cd frontend && npm run test:coverage`)
  process.exit(2)
}

const records = parseLcov(readFileSync(lcovPath, 'utf8'))
const { ref, files } = gitDiffFiles()

const changed = new Set(
  files
    .map((file) => normalize(file))
    .filter((file) => /\.(ts|tsx)$/.test(file))
    .filter((file) => !/\.test\.(ts|tsx)$/.test(file))
    .filter((file) => !COVERAGE_EXCLUSIONS.some((pattern) => pattern.test(file))),
)

const rows = []
for (const file of changed) {
  const record = records.get(file)
  rows.push({
    file,
    lf: record?.lf ?? 0,
    lh: record?.lh ?? 0,
    brf: record?.brf ?? 0,
    brh: record?.brh ?? 0,
    measured: Boolean(record),
  })
}

const totals = rows.reduce(
  (acc, row) => ({
    lf: acc.lf + row.lf,
    lh: acc.lh + row.lh,
    brf: acc.brf + row.brf,
    brh: acc.brh + row.brh,
  }),
  { lf: 0, lh: 0, brf: 0, brh: 0 },
)

const summary = {
  baseRef: ref,
  filesInDiff: files.length,
  measuredFiles: rows.filter((row) => row.measured).length,
  lines: { covered: totals.lh, total: totals.lf, pct: pct(totals.lh, totals.lf) },
  branches: { covered: totals.brh, total: totals.brf, pct: pct(totals.brh, totals.brf) },
  sonarMetric: pct(totals.lh + totals.brh, totals.lf + totals.brf),
  worst: rows
    .filter((row) => row.measured)
    .sort((a, b) => b.lf - b.lh - (a.lf - a.lh))
    .slice(0, 10)
    .map((row) => ({
      file: row.file,
      lines: `${row.lh}/${row.lf}`,
      linesPct: Number(pct(row.lh, row.lf).toFixed(1)),
      branches: `${row.brh}/${row.brf}`,
      branchesPct: Number(pct(row.brh, row.brf).toFixed(1)),
    })),
}

if (asJson) {
  console.log(JSON.stringify(summary, null, 2))
} else {
  console.log(`base ref: ${ref ?? 'не найден'} | файлов в диффе: ${files.length}`)
  console.log(`измерено файлов: ${summary.measuredFiles}\n`)
  console.log('файл | строки | ветки')
  for (const row of summary.worst) {
    console.log(`${row.file} | ${row.lines} (${row.linesPct}%) | ${row.branches} (${row.branchesPct}%)`)
  }
  console.log('')
  console.log(
    `Sonar new code: ${summary.sonarMetric.toFixed(1)}% ` +
      `(строки ${summary.lines.pct.toFixed(1)}%, ветки ${summary.branches.pct.toFixed(1)}%)`,
  )
}
