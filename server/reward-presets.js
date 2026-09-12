// 已发布的批次保持不变；新增预设使用新的批次键，避免重启后恢复已删除的心愿。
const batchKey = 'reward_presets_20260911'
const presets = [
  ['睡前故事或朗读十五分钟', 10],
  ['最爱的小零食一份', 10],
  ['咖啡一杯', 15],
  ['饭后散步半小时', 15],
  ['专属水果拼盘一份', 20],
  ['一起玩游戏一小时', 25],
  ['今晚的菜单我来定', 25],
  ['爱心早餐一份', 30],
  ['甜品店约会一次', 40],
  ['独享一小时自由时间（对方包办家务）', 40],
  ['对方安排一次惊喜约会', 80],
  ['周末近郊出游一次', 100],
]

export function addRewardPresets(db) {
  db.exec('BEGIN IMMEDIATE')
  try {
    if (!db.prepare('SELECT 1 FROM meta WHERE key=?').get(batchKey)) {
      const insert = db.prepare(`
        INSERT INTO rewards (title, cost)
        SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM rewards WHERE title=?)
      `)
      for (const [title, cost] of presets) insert.run(title, cost, title)
      db.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run(batchKey, 'done')
    }
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
