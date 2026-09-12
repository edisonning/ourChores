import { test } from 'node:test'
import assert from 'node:assert/strict'
import { householdBalance } from '../../shared/balance.mjs'
const pair = (a, b, completed = 1) => [
  { id: 1, name: '阿波', points: a, completed },
  { id: 2, name: '阿群', points: b, completed },
]
test('天平按积分占比倾斜，多付出的一侧下沉，最大18度', () => {
  assert.equal(householdBalance(pair(30, 10)).angle, -9)
  assert.equal(householdBalance(pair(0, 30)).angle, 18)
  assert.equal(householdBalance(pair(30, 0)).angle, -18)
  assert.equal(householdBalance(pair(30, 10)).difference, 20)
  assert.equal(householdBalance(pair(30, 10).reverse()).angle, -9)
  assert.match(householdBalance(pair(30, 10), 'month').message, /这个月阿波/)
})
test('天平区分空记录、平衡和零分任务；缺少成员时不误报均衡', () => {
  assert.match(householdBalance(pair(0, 0, 0)).message, /还没有记录/)
  assert.match(householdBalance(pair(10, 10)).message, /一样多/)
  assert.equal(householdBalance(pair(10, 10)).angle, 0)
  assert.match(householdBalance(pair(0, 0, 1)).message, /一样多/)
  assert.equal(householdBalance([]).ready, false)
  assert.equal(householdBalance(pair(5, 0).slice(0, 1)).angle, 0)
})
