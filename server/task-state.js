// Execution snapshots keep yesterday's owner and schedule intact after task edits.
export function createTaskState(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS task_occurrences (
    task_id INTEGER NOT NULL, date_key TEXT NOT NULL, title TEXT NOT NULL,
    assignee_id INTEGER, points INTEGER NOT NULL, PRIMARY KEY(task_id,date_key)
  );
  CREATE TABLE IF NOT EXISTS task_schedule_cursor (task_id INTEGER PRIMARY KEY, last_date TEXT NOT NULL);`);
  const columns = db
    .prepare("PRAGMA table_info(completions)")
    .all()
    .map((c) => c.name);
  for (const [name, type] of [
    ["confirmed_at", "TEXT"],
    ["task_title", "TEXT"],
    ["assignee_id", "INTEGER"],
  ]) {
    if (!columns.includes(name))
      db.exec(`ALTER TABLE completions ADD COLUMN ${name} ${type}`);
  }
  // Older records have no confirmation timestamp. Keep that unknown rather than inventing one.
  db.exec(`UPDATE completions SET task_title=(SELECT title FROM tasks WHERE id=task_id),
    assignee_id=(SELECT assignee_id FROM tasks WHERE id=task_id) WHERE task_title IS NULL`);
  const nextDay = (day) => {
    const d = new Date(day + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };
  const scheduled = (task, day) => {
    if (!task.recurrence) return true;
    if (task.recurrence === "daily") return true;
    const dow = ((new Date(day + "T12:00:00Z").getUTCDay() + 6) % 7) + 1;
    return task.recurrence.split(":")[1].split(",").map(Number).includes(dow);
  };
  function sync(day) {
    const insert = db.prepare(
      "INSERT OR IGNORE INTO task_occurrences VALUES (?,?,?,?,?)",
    );
    for (const task of db
      .prepare("SELECT * FROM tasks WHERE active=1 AND recurrence IS NOT NULL")
      .all()) {
      const cursor = db
        .prepare("SELECT last_date FROM task_schedule_cursor WHERE task_id=?")
        .get(task.id);
      let date = cursor
        ? nextDay(cursor.last_date)
        : task.created_at.slice(0, 10);
      for (; date <= day; date = nextDay(date))
        if (scheduled(task, date))
          insert.run(task.id, date, task.title, task.assignee_id, task.points);
      db.prepare(
        "INSERT INTO task_schedule_cursor VALUES (?,?) ON CONFLICT(task_id) DO UPDATE SET last_date=max(last_date,excluded.last_date)",
      ).run(task.id, day);
    }
  }
  function afterEdit(task, day) {
    // Repeating schedules changed today apply to today's unstarted execution and future dates.
    if (
      !db
        .prepare(
          "SELECT 1 FROM completions WHERE task_id=? AND date_key=? AND status!='rejected'",
        )
        .get(task.id, day)
    ) {
      db.prepare(
        "DELETE FROM task_occurrences WHERE task_id=? AND date_key=?",
      ).run(task.id, day);
      if (task.recurrence && scheduled(task, day))
        db.prepare("INSERT INTO task_occurrences VALUES (?,?,?,?,?)").run(
          task.id,
          day,
          task.title,
          task.assignee_id,
          task.points,
        );
    }
    db.prepare(
      "INSERT INTO task_schedule_cursor VALUES (?,?) ON CONFLICT(task_id) DO UPDATE SET last_date=excluded.last_date",
    ).run(task.id, day);
  }
  const completionQuery = `SELECT c.*, u.name AS user_name, a.name AS assignee_name
    FROM completions c JOIN users u ON u.id=c.user_id LEFT JOIN users a ON a.id=c.assignee_id`;
  const decorate = (task, day) => {
    const completion = task.recurrence
      ? db
          .prepare(completionQuery + " WHERE c.task_id=? AND c.date_key=?")
          .get(task.id, day)
      : db
          .prepare(
            completionQuery +
              " WHERE c.task_id=? ORDER BY CASE WHEN c.status='rejected' THEN 1 ELSE 0 END, c.id DESC LIMIT 1",
          )
          .get(task.id);
    const occurrence = task.recurrence
      ? db
          .prepare(
            "SELECT * FROM task_occurrences WHERE task_id=? AND date_key=?",
          )
          .get(task.id, day)
      : null;
    const status =
      completion?.status ||
      (task.recurrence && !occurrence ? "not_scheduled" : "todo");
    const owner =
      completion && status !== "rejected"
        ? completion.assignee_id
        : occurrence
          ? occurrence.assignee_id
          : task.assignee_id;
    return {
      ...task,
      assignee_id: owner,
      assignee_name: owner
        ? db.prepare("SELECT name FROM users WHERE id=?").get(owner)?.name
        : null,
      status,
      completion: completion || null,
      execution_date: task.recurrence ? day : completion?.date_key || null,
      done: !task.recurrence && status === "confirmed",
      overdue:
        !task.recurrence &&
        !!task.due_date &&
        task.due_date < day &&
        ["todo", "rejected"].includes(status),
    };
  };
  function list(day) {
    sync(day);
    return db
      .prepare("SELECT * FROM tasks WHERE active=1 ORDER BY id DESC")
      .all()
      .map((t) => decorate(t, day));
  }
  function pending(userId, mine = false) {
    return db
      .prepare(
        completionQuery +
          ` JOIN tasks t ON t.id=c.task_id WHERE c.status='pending' AND c.user_id ${mine ? "=" : "!="} ? ORDER BY c.date_key,c.id`,
      )
      .all(userId)
      .map((c) => ({ ...c, title: c.task_title }));
  }
  function completed(day) {
    return db
      .prepare(
        completionQuery +
          ` WHERE c.status='confirmed' AND (c.date_key=? OR substr(c.confirmed_at,1,10)=?) ORDER BY c.id DESC`,
      )
      .all(day, day)
      .map((c) => ({
        id: c.task_id,
        title: c.task_title,
        points: c.points,
        assignee_id: c.assignee_id,
        assignee_name: c.assignee_name,
        status: "confirmed",
        completion: c,
        execution_date: c.date_key,
        overdue: false,
      }));
  }
  function history(taskId, day) {
    sync(day);
    const records = db
      .prepare(
        `SELECT o.*, c.id AS completion_id,c.user_id,u.name AS user_name,c.status,c.created_at,c.confirmed_at,a.name AS assignee_name
      FROM task_occurrences o LEFT JOIN completions c ON c.task_id=o.task_id AND c.date_key=o.date_key
      LEFT JOIN users u ON u.id=c.user_id LEFT JOIN users a ON a.id=o.assignee_id WHERE o.task_id=? ORDER BY o.date_key DESC`,
      )
      .all(taskId)
      .map((r) => ({
        ...r,
        status: r.status || (r.date_key < day ? "missed" : "todo"),
      }));
    for (const c of db
      .prepare(completionQuery + " WHERE c.task_id=? ORDER BY c.date_key DESC")
      .all(taskId)) {
      if (!records.some((r) => r.date_key === c.date_key))
        records.push({ ...c, title: c.task_title, completion_id: c.id });
    }
    return records
      .sort((a, b) => b.date_key.localeCompare(a.date_key))
      .slice(0, 30);
  }
  return { sync, afterEdit, list, pending, completed, history, scheduled };
}
