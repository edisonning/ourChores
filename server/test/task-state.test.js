import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createTaskState } from "../task-state.js";
function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT);INSERT INTO users VALUES(1,'老公'),(2,'老婆');
 CREATE TABLE tasks(id INTEGER PRIMARY KEY,title TEXT,points INTEGER,assignee_id INTEGER,recurrence TEXT,due_date TEXT,active INTEGER DEFAULT 1,created_at TEXT DEFAULT '2026-09-10 12:00:00');
 CREATE TABLE completions(id INTEGER PRIMARY KEY,task_id INTEGER,user_id INTEGER,date_key TEXT,points INTEGER,status TEXT,confirmed_by INTEGER,created_at TEXT,UNIQUE(task_id,date_key));`);
  const state = createTaskState(db);
  const task = (id, recurrence = null, due = null, owner = 1) =>
    db
      .prepare(
        "INSERT INTO tasks(id,title,points,assignee_id,recurrence,due_date) VALUES (?,?,?,?,?,?)",
      )
      .run(id, "家务" + id, 3, owner, recurrence, due);
  const complete = (id, date, status = "pending", by = 1) =>
    db
      .prepare(
        "INSERT INTO completions(task_id,user_id,date_key,points,status,task_title,assignee_id) VALUES (?,?,?,?,?,?,?)",
      )
      .run(id, by, date, 3, status, "家务" + id, 1);
  return { db, state, task, complete };
}
test("单次任务截止前可见；待确认不归档；打回跨日仍待重做；确认后归档", () => {
  const { db, state, task, complete } = setup();
  task(1, null, "2026-10-01");
  assert.equal(state.list("2026-09-10")[0].status, "todo");
  complete(1, "2026-09-10");
  assert.equal(state.list("2026-09-10")[0].done, false);
  assert.equal(state.list("2026-09-11")[0].status, "pending");
  db.exec("UPDATE completions SET status='rejected'");
  assert.equal(state.list("2026-09-11")[0].status, "rejected");
  db.exec(
    "UPDATE completions SET status='confirmed',confirmed_at='2026-09-11 09:00:00'",
  );
  assert.equal(state.list("2026-09-11")[0].done, true);
  assert.equal(state.completed("2026-09-11").length, 1);
  assert.equal(state.completed("2026-09-12").length, 0);
  assert.equal(state.list("2026-09-12")[0].completion.user_name, "老公");
  db.close();
});
test("周期跨天独立，昨日未完成留下记录，不自动加入今天；编辑不改写历史归属", () => {
  const { db, state, task } = setup();
  task(1, "daily");
  assert.equal(state.list("2026-09-11")[0].status, "todo");
  assert.deepEqual(
    state.history(1, "2026-09-11").map((r) => r.status),
    ["todo", "missed"],
  );
  db.exec("UPDATE tasks SET assignee_id=2,title='新家务' WHERE id=1");
  state.afterEdit(
    db.prepare("SELECT * FROM tasks WHERE id=1").get(),
    "2026-09-11",
  );
  const records = state.history(1, "2026-09-12");
  assert.equal(records.find((r) => r.date_key === "2026-09-10").assignee_id, 1);
  assert.equal(records.find((r) => r.date_key === "2026-09-11").assignee_id, 2);
  assert.equal(records.find((r) => r.date_key === "2026-09-10").title, "家务1");
  assert.equal(state.list("2026-09-12").length, 1);
  db.close();
});
test("昨天待确认不会阻止今日周期任务；共享任务显示实际完成人；周任务非执行日有明确状态", () => {
  const { db, state, task, complete } = setup();
  task(1, "daily", null, null);
  complete(1, "2026-09-10", "pending", 2);
  assert.equal(state.list("2026-09-11")[0].status, "todo");
  assert.equal(state.pending(1)[0].user_name, "老婆");
  assert.equal(state.pending(2, true)[0].date_key, "2026-09-10");
  complete(1, "2026-09-11", "confirmed", 1);
  assert.equal(state.list("2026-09-11")[0].status, "confirmed");
  assert.equal(state.list("2026-09-11")[0].done, false);
  task(2, "weekly:7");
  assert.equal(
    state.list("2026-09-11").find((t) => t.id === 2).status,
    "not_scheduled",
  );
  assert.equal(state.list("2026-09-13").find((t) => t.id === 2).status, "todo");
  db.close();
});
test("迁移已有数据库不改打卡积分与状态，旧完成时间仍标为未知，重复启动安全", () => {
  const { db, state, task, complete } = setup();
  task(1);
  complete(1, "2026-09-10", "confirmed");
  db.exec("UPDATE completions SET task_title=NULL,assignee_id=NULL");
  createTaskState(db);
  createTaskState(db);
  const record = state.list("2026-09-11")[0].completion;
  assert.equal(record.points, 3);
  assert.equal(record.status, "confirmed");
  assert.equal(record.confirmed_at, null);
  assert.equal(record.assignee_id, 1);
  db.close();
});
