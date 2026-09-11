import crypto from 'node:crypto'

export function createAuth(db, legacySecret) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS login_failures (
      user_id INTEGER NOT NULL,
      attempted_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS login_failures_user_time ON login_failures(user_id, attempted_at);
  `)
  const hashToken = token => crypto.createHash('sha256').update(token).digest('hex')
  const safeEqual = (a, b) => {
    const left = Buffer.from(a), right = Buffer.from(b)
    return left.length === right.length && crypto.timingSafeEqual(left, right)
  }
  const hashPin = pin => {
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.scryptSync(String(pin), salt, 64).toString('hex')
    return `scrypt$${salt}$${hash}`
  }
  const verifyPin = (pin, stored) => {
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin) || typeof stored !== 'string') return false
    if (stored.startsWith('scrypt$')) {
      const [,salt,hash] = stored.split('$')
      if (!/^[0-9a-f]{32}$/.test(salt || '') || !/^[0-9a-f]{128}$/.test(hash || '')) return false
      return safeEqual(crypto.scryptSync(pin, salt, 64).toString('hex'), hash)
    }
    return safeEqual(crypto.createHash('sha256').update(pin + legacySecret).digest('hex'), stored)
  }
  const tokenFor = (userId, now = Date.now()) => {
    db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now)
    const token = crypto.randomBytes(32).toString('hex')
    db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hashToken(token), userId, now + 7 * 86400000)
    return token
  }
  const userIdFromToken = (token, now = Date.now()) => {
    if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return null
    return db.prepare('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?')
      .get(hashToken(token), now)?.user_id || null
  }
  const loginBlockedUntil = (userId, now = Date.now()) => {
    db.prepare('DELETE FROM login_failures WHERE attempted_at<=?').run(now - 86400000)
    const times = db.prepare('SELECT attempted_at FROM login_failures WHERE user_id=? ORDER BY attempted_at DESC').all(userId)
    return Math.max(now, times.length >= 5 ? times[4].attempted_at + 900000 : now,
      times.length >= 10 ? times[9].attempted_at + 86400000 : now)
  }
  const recordLoginFailure = (userId, now = Date.now()) =>
    db.prepare('INSERT INTO login_failures VALUES (?,?)').run(userId, now)
  const clearLoginFailures = userId => db.prepare('DELETE FROM login_failures WHERE user_id=?').run(userId)
  return {hashPin, verifyPin, tokenFor, userIdFromToken, loginBlockedUntil, recordLoginFailure, clearLoginFailures}
}
