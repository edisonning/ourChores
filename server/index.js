import express from 'express'
import { createTaskState } from './task-state.js'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db, hashPin, verifyPin, tokenFor, userIdFromToken, dateKey, isoDow, loginBlockedUntil, recordLoginFailure, clearLoginFailures } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const taskState = createTaskState(db)
const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '16kb' }))
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next() })

// ---- auth 中间件（公开端点：GET /users、POST /login）----
app.use('/api', (req, res, next) => {
  if (req.path === '/users' || (req.path === '/login' && req.method === 'POST')) return next()
  const userId = userIdFromToken((req.headers.authorization || '').replace(/^Bearer /, ''))
  if (!userId || !db.prepare('SELECT id FROM users WHERE id=?').get(userId)) {
    return res.status(401).json({ error: '请先登录' })
  }
  req.userId = userId
  next()
})

// ---- 工具 ----
const balanceOf = (userId) =>
  db.prepare(`SELECT COALESCE(SUM(points),0) n FROM completions WHERE user_id=? AND status='confirmed'`).get(userId).n -
  db.prepare(`SELECT COALESCE(SUM(cost),0) n FROM redemptions WHERE user_id=?`).get(userId).n

// 某任务在某天是否到期（读时计算，无 cron）
const dueOnDay = (t, day, dow) => {
  if (t.recurrence === 'daily') return true
  if (t.recurrence?.startsWith('weekly:'))
    return t.recurrence.split(':')[1].split(',').map(Number).includes(dow)
  return !t.due_date || t.due_date <= day // 一次性：无截止日或已到期
}

const redemptionWithJoins = (id) => db.prepare(`
  SELECT r.*, t.title, u.name AS user_name
  FROM redemptions r JOIN rewards t ON t.id=r.reward_id JOIN users u ON u.id=r.user_id
  WHERE r.id=?`).get(id)

// ---- 登录 ----
app.get('/api/users', (req, res) => {
  res.json(db.prepare('SELECT id, name FROM users ORDER BY id').all())
})

app.post('/api/login', (req, res) => {
  const { id, pin } = req.body || {}
  const user = Number.isInteger(id) ? db.prepare('SELECT * FROM users WHERE id=?').get(id) : null
  // Account-wide limits also work behind Funnel and cannot be bypassed with forged proxy headers.
  const bucket = user?.id || 0
  const now = Date.now(), blockedUntil = loginBlockedUntil(bucket, now)
  if (blockedUntil > now) {
    const seconds = Math.ceil((blockedUntil - now) / 1000)
    res.set('Retry-After', String(seconds))
    return res.status(429).json({ error: `PIN 尝试过多，请在 ${Math.ceil(seconds / 60)} 分钟后重试` })
  }
  if (!user || !verifyPin(pin, user.pin_hash)) {
    recordLoginFailure(bucket, now)
    return res.status(401).json({ error: 'PIN 不正确' })
  }
  clearLoginFailures(bucket)
  if (!user.pin_hash.startsWith('scrypt$')) {
    db.prepare('UPDATE users SET pin_hash=? WHERE id=?').run(hashPin(pin), user.id)
  }
  res.json({ token: tokenFor(user.id), user: { id: user.id, name: user.name } })
})

// ---- 今日视图 ----
app.get('/api/today', (req, res) => {
  const today = dateKey()
  const tasks = taskState.list(today).filter(t => t.recurrence
    ? t.status !== 'not_scheduled'
    : t.status !== 'confirmed' || t.completion.date_key === today || t.completion.confirmed_at?.startsWith(today))
  res.json({date:today,
    users:db.prepare('SELECT id,name FROM users ORDER BY id').all().map(u=>({...u,points:balanceOf(u.id)})),
    tasks, completed:taskState.completed(today),
    pending_confirm:taskState.pending(req.userId), pending_mine:taskState.pending(req.userId,true),
  })
})

// ---- 任务 CRUD ----
const validTask = (b) => {
  if (typeof b.title !== 'string' || !b.title.trim()) return '请填写任务名'
  if (b.assignee_id != null && (!Number.isInteger(b.assignee_id) || !db.prepare('SELECT id FROM users WHERE id=?').get(b.assignee_id))) return '请选择有效成员'
  if (b.due_date && (!/^\d{4}-\d{2}-\d{2}$/.test(b.due_date) || Number.isNaN(Date.parse(b.due_date)) || new Date(b.due_date).toISOString().slice(0,10)!==b.due_date)) return '截止日期不合法'
  if (!(Number.isInteger(b.points) && b.points >= 0)) return '积分需为非负整数'
  if (b.recurrence && b.recurrence !== 'daily' && !/^weekly:[1-7](,[1-7])*$/.test(b.recurrence))
    return '重复规则不合法'
  return null
}

app.get('/api/tasks', (req, res) => {
  res.json({date:dateKey(),users:db.prepare('SELECT id,name FROM users ORDER BY id').all(),tasks:taskState.list(dateKey())})
})
app.get('/api/tasks/:id/history', (req,res) => {
  if(!db.prepare('SELECT id FROM tasks WHERE id=?').get(req.params.id)) return res.status(404).json({error:'任务不存在'})
  res.json({records:taskState.history(Number(req.params.id),dateKey())})
})

app.post('/api/tasks', (req, res) => {
  const err = validTask(req.body || {})
  if (err) return res.status(400).json({ error: err })
  const { title, points, recurrence, due_date } = req.body
  const assignee_id = req.body.assignee_id === undefined ? req.userId : req.body.assignee_id
  const info = db.prepare(
    'INSERT INTO tasks (title, points, assignee_id, recurrence, due_date) VALUES (?,?,?,?,?)'
  ).run(title.trim(), points, assignee_id || null, recurrence || null, due_date || null)
  res.json({ task: db.prepare('SELECT * FROM tasks WHERE id=?').get(info.lastInsertRowid) })
})

app.route('/api/tasks/:id').put(updateTask).patch(updateTask)
function updateTask(req, res) {
  const t = db.prepare('SELECT * FROM tasks WHERE id=? AND active=1').get(req.params.id)
  if (!t) return res.status(404).json({ error: '任务不存在' })
  taskState.sync(dateKey())
  const next = { ...t, ...req.body, id: t.id }
  if (!!next.recurrence !== !!t.recurrence && db.prepare('SELECT 1 FROM completions WHERE task_id=?').get(t.id)) return res.status(409).json({error:'已有打卡记录的任务不能改为另一种任务类型，请新建任务；原记录会保留'})
  const err = validTask(next)
  if (err) return res.status(400).json({ error: err })
  db.prepare('UPDATE tasks SET title=?, points=?, assignee_id=?, recurrence=?, due_date=? WHERE id=?')
    .run(next.title.trim(), next.points, next.assignee_id || null, next.recurrence || null, next.due_date || null, t.id)
  const updated = db.prepare('SELECT * FROM tasks WHERE id=?').get(t.id)
  taskState.afterEdit(updated,dateKey())
  res.json({ task: updated })
}

app.delete('/api/tasks/:id', (req, res) => {
  taskState.sync(dateKey())
  db.prepare('UPDATE tasks SET active=0 WHERE id=?').run(req.params.id)
  res.status(204).end()
})

// ---- 打卡（幂等）----
app.post('/api/completions', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id=? AND active=1').get(req.body?.task_id)
  if (!task) return res.status(404).json({ error: '任务不存在' })
  if (task.assignee_id && task.assignee_id !== req.userId)
    return res.status(403).json({ error: '这个任务不是分配给你的' })

  // 一次性任务：一旦有未打回的完成记录（哪怕还在待确认），不再接受新打卡
  if (!task.recurrence) {
    const closed = db.prepare(
      `SELECT * FROM completions WHERE task_id=? AND status!='rejected' ORDER BY id DESC LIMIT 1`
    ).get(task.id)
    if (closed) return res.json(closed)
  }

  const today = dateKey()
  taskState.sync(today)
  if (task.recurrence && !taskState.scheduled(task,today) && !db.prepare('SELECT 1 FROM completions WHERE task_id=? AND date_key=?').get(task.id,today)) return res.status(400).json({error:'今天无需执行这个周期任务'})
  const existing = db.prepare('SELECT * FROM completions WHERE task_id=? AND date_key=?').get(task.id, today)
  if (existing) {
    if (existing.status === 'rejected') {
      db.prepare(`UPDATE completions SET user_id=?, points=?, status='pending', confirmed_by=NULL,confirmed_at=NULL,task_title=?,assignee_id=?,
        created_at=datetime('now','localtime') WHERE id=?`).run(req.userId, task.points, task.title,task.assignee_id,existing.id)
      return res.json(db.prepare('SELECT * FROM completions WHERE id=?').get(existing.id))
    }
    return res.json(existing) // pending/confirmed → 原样返回
  }

  const info = db.prepare(
    'INSERT INTO completions (task_id, user_id, date_key, points,task_title,assignee_id) VALUES (?,?,?,?,?,?)'
  ).run(task.id, req.userId, today, task.points,task.title,task.assignee_id)
  res.json(db.prepare('SELECT * FROM completions WHERE id=?').get(info.lastInsertRowid))
})

// ---- 确认 / 打回（完成人 ≠ 确认人，防作弊核心规则）----
const verdict = (status) => (req, res) => {
  const c = db.prepare('SELECT * FROM completions WHERE id=?').get(req.params.id)
  if (!c) return res.status(404).json({ error: '记录不存在' })
  if (c.user_id === req.userId)
    return res.status(403).json({ error: status === 'confirmed' ? '不能确认自己完成的任务' : '不能打回自己完成的任务' })
  if (c.status !== 'pending') return res.status(409).json({ error: '该记录已处理过' })
  db.prepare("UPDATE completions SET status=?, confirmed_by=?,confirmed_at=CASE WHEN ?='confirmed' THEN datetime('now','localtime') ELSE NULL END WHERE id=?").run(status, req.userId,status,c.id)
  res.json(db.prepare('SELECT * FROM completions WHERE id=?').get(c.id))
}
app.post('/api/completions/:id/confirm', verdict('confirmed'))
app.post('/api/completions/:id/reject', verdict('rejected'))

// ---- 心愿与兑换 ----
app.get('/api/rewards', (req, res) => {
  res.json({
    rewards: db.prepare('SELECT * FROM rewards WHERE active=1 ORDER BY id DESC').all(),
    redemptions: db.prepare(`
      SELECT r.*, t.title, u.name AS user_name
      FROM redemptions r JOIN rewards t ON t.id=r.reward_id JOIN users u ON u.id=r.user_id
      ORDER BY r.id DESC LIMIT 50`).all(),
    users: db.prepare('SELECT id, name FROM users ORDER BY id').all()
      .map(u => ({ ...u, points: balanceOf(u.id) })),
    points: balanceOf(req.userId),
  })
})

app.post('/api/rewards', (req, res) => {
  const { title, cost } = req.body || {}
  if (!title?.trim()) return res.status(400).json({ error: '请填写心愿名' })
  if (!(Number.isInteger(cost) && cost > 0)) return res.status(400).json({ error: '兑换积分需为正整数' })
  const info = db.prepare('INSERT INTO rewards (title, cost) VALUES (?,?)').run(title.trim(), cost)
  res.json({ reward: db.prepare('SELECT * FROM rewards WHERE id=?').get(info.lastInsertRowid) })
})

app.delete('/api/rewards/:id', (req, res) => {
  db.prepare('UPDATE rewards SET active=0 WHERE id=?').run(req.params.id)
  res.status(204).end()
})

app.post('/api/redeem', (req, res) => {
  const reward = db.prepare('SELECT * FROM rewards WHERE id=? AND active=1').get(req.body?.reward_id)
  if (!reward) return res.status(404).json({ error: '心愿不存在' })
  const bal = balanceOf(req.userId)
  if (bal < reward.cost) return res.status(400).json({ error: `积分不足，还差 ${reward.cost - bal} 分` })
  const info = db.prepare('INSERT INTO redemptions (reward_id, user_id, cost) VALUES (?,?,?)')
    .run(reward.id, req.userId, reward.cost)
  res.json({ redemption: redemptionWithJoins(info.lastInsertRowid), points: balanceOf(req.userId) })
})

app.post('/api/redemptions/:id/fulfill', (req, res) => {
  const r = db.prepare('SELECT * FROM redemptions WHERE id=?').get(req.params.id)
  if (!r) return res.status(404).json({ error: '兑换记录不存在' })
  if (r.fulfilled) return res.status(409).json({ error: '已兑现过' })
  if (r.user_id === req.userId) return res.status(403).json({ error: '需要对方来兑现' })
  db.prepare('UPDATE redemptions SET fulfilled=1 WHERE id=?').run(r.id)
  res.json(redemptionWithJoins(r.id))
})

// ---- 统计 ----
app.get('/api/stats', (req, res) => {
  const period = req.query.period === 'month' ? 'month' : 'week'
  const now = new Date()
  let from, to
  if (period === 'month') {
    from = new Date(now.getFullYear(), now.getMonth(), 1)
    to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  } else {
    from = new Date(now)
    from.setDate(now.getDate() - (isoDow(now) - 1)) // 周一起
    to = new Date(from)
    to.setDate(from.getDate() + 6)
  }
  const fromKey = dateKey(from), toKey = dateKey(to)

  const users = db.prepare('SELECT id, name FROM users ORDER BY id').all()
  const tasks = db.prepare('SELECT * FROM tasks WHERE active=1').all()

  // ponytail: 分母用当前任务定义回算，删除/改分配会让完成率轻微失真——夫妻对比够用，非审计
  const due = Object.fromEntries(users.map(u => [u.id, 0]))
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const day = dateKey(d), dow = isoDow(d)
    for (const t of tasks) {
      if (t.created_at > day + ' 23:59:59') continue
      if (!dueOnDay(t, day, dow)) continue
      if (t.assignee_id) due[t.assignee_id]++
      else users.forEach(u => due[u.id]++)
    }
  }

  res.json({
    period, from: fromKey, to: toKey,
    users: users.map(u => {
      const r = db.prepare(`SELECT COUNT(*) n, COALESCE(SUM(points),0) pts FROM completions
        WHERE user_id=? AND status='confirmed' AND date_key BETWEEN ? AND ?`).get(u.id, fromKey, toKey)
      return { id: u.id, name: u.name, completed: r.n, points: r.pts, due: due[u.id],
               rate: due[u.id] ? Math.round((r.n / due[u.id]) * 100) / 100 : null }
    }),
  })
})

// ---- 静态托管 web/dist + SPA fallback ----
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))
const dist = path.join(__dirname, '../web/dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  const urls = []
  for (const list of Object.values(os.networkInterfaces()))
    for (const n of list || []) if (n.family === 'IPv4' && !n.internal) urls.push(`http://${n.address}:${PORT}`)
  console.log(`甜甜家务已启动 → ${urls.join('  ,  ') || `http://localhost:${PORT}`}`)
})
