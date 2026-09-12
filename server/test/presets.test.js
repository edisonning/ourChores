import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { addRewardPresets } from '../reward-presets.js'
import { addTaskPresets } from '../task-presets.js'

for (const [table, apply, title, valueColumn] of [
  ['rewards', addRewardPresets, '咖啡一杯', 'cost'],
  ['tasks', addTaskPresets, '擦餐桌', 'points'],
]) {
  test(`${table}：补充预设，保留旧数据，重跑不重复或恢复已删除项`, () => {
    const db = new DatabaseSync(':memory:')
    try {
      db.exec(`
        CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE ${table} (
          id INTEGER PRIMARY KEY, title TEXT, ${valueColumn} INTEGER,
          active INTEGER DEFAULT 1, assignee_id INTEGER,
          recurrence TEXT, due_date TEXT
        );
      `)
      db.prepare(`INSERT INTO ${table} (title, ${valueColumn}, active) VALUES (?, 99, 0)`).run(title)
      db.prepare(`INSERT INTO ${table} (title, ${valueColumn}) VALUES ('自定义内容', 7)`).run()
      apply(db)
      const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()
      assert.equal(rows.length, 13)
      assert.equal(rows[0].active, 0)
      assert.equal(rows[0][valueColumn], 99)
      assert.equal(rows[1].title, '自定义内容')
      assert.equal(rows[1][valueColumn], 7)
      if (table === 'tasks') {
        assert.ok(rows.slice(2).every(row => row.assignee_id === null && row.due_date === null))
        assert.ok(rows.some(row => row.recurrence === 'daily'))
        assert.ok(rows.some(row => row.recurrence === 'weekly:6'))
      }
      db.exec(`UPDATE ${table} SET active=0 WHERE id=3`)
      const afterDelete = db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()
      apply(db)
      assert.deepEqual(db.prepare(`SELECT * FROM ${table} ORDER BY id`).all(), afterDelete)
    } finally {
      db.close()
    }
  })
}
