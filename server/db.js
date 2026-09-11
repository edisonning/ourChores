// ponytail: 用 Node 22.13+ 内置 node:sqlite（同步 API 与 better-sqlite3 等价），
// 免掉原生模块编译/prebuild 下载；若未来部署到 Node <22.13 再换回 better-sqlite3
import { DatabaseSync } from 'node:sqlite'
import crypto from 'node:crypto'
import { createAuth } from './auth.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const db = new DatabaseSync(process.env.DB_PATH || path.join(__dirname, 'data.db'))
db.exec('PRAGMA journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id       INTEGER PRIMARY KEY,
  name     TEXT NOT NULL,
  pin_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY,
  title       TEXT NOT NULL,
  points      INTEGER NOT NULL DEFAULT 1 CHECK (points >= 0),
  assignee_id INTEGER REFERENCES users(id),
  recurrence  TEXT,
  due_date    TEXT,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS completions (
  id           INTEGER PRIMARY KEY,
  task_id      INTEGER NOT NULL REFERENCES tasks(id),
  user_id      INTEGER NOT NULL REFERENCES users(id),
  date_key     TEXT NOT NULL,
  points       INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  confirmed_by INTEGER REFERENCES users(id),
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  UNIQUE (task_id, date_key)
);
CREATE TABLE IF NOT EXISTS rewards (
  id     INTEGER PRIMARY KEY,
  title  TEXT NOT NULL,
  cost   INTEGER NOT NULL CHECK (cost > 0),
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS redemptions (
  id         INTEGER PRIMARY KEY,
  reward_id  INTEGER NOT NULL REFERENCES rewards(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  cost       INTEGER NOT NULL,
  fulfilled  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
`)

// auth secret: 生成一次存库，重启后 token 仍有效
export const authSecret = (() => {
  const row = db.prepare(`SELECT value FROM meta WHERE key='auth_secret'`).get()
  if (row) return row.value
  const secret = crypto.randomBytes(32).toString('hex')
  db.prepare(`INSERT INTO meta (key, value) VALUES ('auth_secret', ?)`).run(secret)
  return secret
})()

export const { hashPin, verifyPin, tokenFor, userIdFromToken,
  loginBlockedUntil, recordLoginFailure, clearLoginFailures } = createAuth(db, authSecret)

// "今天" = 服务端本地日期（家庭场景 Mac 与手机同时区）
export const dateKey = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export const isoDow = (d = new Date()) => (d.getDay() + 6) % 7 + 1 // 1=周一…7=周日

// 首次启动种子（users 为空时）
if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n === 0) {
  const pinHash = hashPin('1234')
  db.prepare('INSERT INTO users (name, pin_hash) VALUES (?, ?)').run('老公', pinHash)
  db.prepare('INSERT INTO users (name, pin_hash) VALUES (?, ?)').run('老婆', pinHash)

  const insTask = db.prepare(
    'INSERT INTO tasks (title, points, assignee_id, recurrence, due_date) VALUES (?, ?, ?, ?, ?)'
  )
  insTask.run('倒垃圾', 2, null, 'daily', null)
  insTask.run('做晚饭', 3, null, 'daily', null)
  insTask.run('洗碗', 2, null, 'daily', null)
  insTask.run('大扫除', 10, null, 'weekly:6', null)
  insTask.run('洗衣服', 5, null, 'weekly:7', null)
  insTask.run('整理衣柜', 5, null, null, null)

  const insReward = db.prepare('INSERT INTO rewards (title, cost) VALUES (?, ?)')
  insReward.run('奶茶一杯', 15)
  insReward.run('按摩十分钟', 20)
  insReward.run('电影选片权', 30)
  insReward.run('周末睡懒觉(对方做早饭)', 50)
  console.log('首次启动：已创建默认用户(老公/老婆, PIN 1234)与示例任务、心愿')
}
