// 已发布的批次保持不变；新增任务另建批次，尊重用户删除和修改。
const batchKey = 'task_presets_20260911'
const presets = [
  ['擦餐桌', 1, 'daily'],
  ['清理厨房台面', 2, 'daily'],
  ['整理客厅', 2, 'daily'],
  ['扫地或吸尘', 3, 'weekly:2,5'],
  ['拖地', 5, 'weekly:6'],
  ['清洁马桶和洗手台', 5, 'weekly:6'],
  ['更换床单被套', 5, 'weekly:7'],
  ['整理冰箱并检查食物保质期', 5, 'weekly:7'],
  ['采购日用品', 3, null],
  ['晾晒衣物', 3, null],
  ['叠衣服并归位', 3, null],
  ['清洁微波炉', 3, null],
]

export function addTaskPresets(db) {
  db.exec('BEGIN IMMEDIATE')
  try {
    if (!db.prepare('SELECT 1 FROM meta WHERE key=?').get(batchKey)) {
      const insert = db.prepare(`
        INSERT INTO tasks (title, points, assignee_id, recurrence, due_date)
        SELECT ?, ?, NULL, ?, NULL
        WHERE NOT EXISTS (SELECT 1 FROM tasks WHERE title=?)
      `)
      for (const [title, points, recurrence] of presets) {
        insert.run(title, points, recurrence, title)
      }
      db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run(batchKey, 'done')
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
