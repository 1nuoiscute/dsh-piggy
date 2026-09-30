// @ts-check
/**
 * 存档的读写：原子写、损坏时保留现场。这一层不含任何业务规则。
 *
 * @module dsh-pig/store/state-file
 */
import { closeSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync, writeSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { STATE_VERSION, migrate } from '../core.js'

/** The harness home, matching the launcher's own resolution. */
export function dshHome() {
  const configured = process.env.DSH_HOME
  return configured !== undefined && configured.trim() !== ''
    ? resolve(configured.trim())
    : join(homedir(), '.dsh')
}

/** Default save location. */
export function defaultStatePath() {
  return join(dshHome(), 'dsh-pig', 'state.json')
}

/** Copy an unusable save next to the original, then complain loudly. */
function preserveUnusableSave(filePath, raw, reason, nowMs) {
  const backup = `${filePath}.corrupt-${new Date(nowMs).toISOString().replace(/[:.]/g, '-')}`
  try {
    writeFileSync(backup, raw)
  } catch (error) {
    console.warn(`[dsh-pig] save unusable (${reason}) and the backup failed: path="${filePath}" reason="${error instanceof Error ? error.message : String(error)}"`)
    return
  }
  console.warn(`[dsh-pig] save unusable (${reason}); kept a copy at "${backup}" and left the original untouched`)
}

/**
 * Keep a copy of a save before it is upgraded to a newer version.
 *
 * An upgrade rewrites the file on the next save; if a step turns out to be
 * wrong, this copy is the only way back to the pig as it was.
 */
function keepPreUpgradeCopy(filePath, raw, fromVersion, nowMs) {
  const backup = `${filePath}.v${fromVersion}-backup-${new Date(nowMs).toISOString().replace(/[:.]/g, '-')}`
  try {
    writeFileSync(backup, raw)
    console.warn(`[dsh-pig] upgrading save v${fromVersion} -> v${STATE_VERSION}; kept a copy at "${backup}"`)
  } catch (error) {
    console.warn(`[dsh-pig] upgrading save v${fromVersion} -> v${STATE_VERSION} without a backup: path="${filePath}" reason="${error instanceof Error ? error.message : String(error)}"`)
  }
}

/**
 * Read the save, keeping the evidence when it cannot be used.
 *
 * A bare `catch { return null }` used to turn a corrupt or unreadable save into
 * "no pig" — the pig silently vanished and the next write would have buried the
 * old file.
 *
 * @returns {{ state: object|null, needsSave: boolean }} the migrated state (or
 *   null) and whether the file was on an older version and wants a rewrite.
 */
export function readStateFile(filePath, nowMs) {
  let raw
  try {
    raw = readFileSync(filePath, 'utf8')
  } catch (error) {
    // A missing save is the normal first run; anything else is worth saying.
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
    if (code !== 'ENOENT') {
      console.warn(`[dsh-pig] could not read save: path="${filePath}" reason="${error instanceof Error ? error.message : String(error)}"`)
    }
    return { state: null, needsSave: false }
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    preserveUnusableSave(filePath, raw, `invalid JSON: ${error instanceof Error ? error.message : String(error)}`, nowMs)
    return { state: null, needsSave: false }
  }

  const upgraded = migrate(parsed, nowMs)
  if (upgraded === null) {
    preserveUnusableSave(filePath, raw, 'migrate() rejected the shape', nowMs)
    return { state: null, needsSave: false }
  }
  const onDisk = parsed?.version
  if (typeof onDisk === 'number' && onDisk < STATE_VERSION) keepPreUpgradeCopy(filePath, raw, onDisk, nowMs)
  return { state: upgraded, needsSave: parsed?.version !== upgraded.version }
}

/** Atomic write: temp file → fsync → rename. */
export function writeStateFile(filePath, state) {
  mkdirSync(dirname(filePath), { recursive: true })
  const tmp = `${filePath}.tmp`
  const fd = openSync(tmp, 'w')
  try {
    writeSync(fd, JSON.stringify(state, null, 2))
    fsyncSync(fd)
  } finally {
    closeSync(fd)
  }
  renameSync(tmp, filePath)
}
