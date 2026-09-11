import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
test("隔离数据库：任务兼容接口与双人家务、心愿闭环", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "chores-test-"));
  const child = spawn(process.execPath, ["--no-warnings", "server/index.js"], {
    env: { ...process.env, DB_PATH: path.join(dir, "test.db"), PORT: "31987" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        child.stdout.on("data", (d) => {
          if (d.toString().includes("已启动")) resolve();
        });
        child.on("exit", () => reject(new Error("server exited")));
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("startup timeout")), 10000).unref(),
      ),
    ]);
    const request = async (
      route,
      method = "GET",
      body,
      token,
      status = 200,
    ) => {
      const r = await fetch("http://127.0.0.1:31987/api" + route, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      assert.equal(r.status, status, route);
      return status === 204 ? null : r.json();
    };
    await request("/login", "POST", { id: 1, pin: "0000" }, null, 401);
    const a = (await request("/login", "POST", { id: 1, pin: "1234" })).token,
      b = (await request("/login", "POST", { id: 2, pin: "1234" })).token;
    await request("/today", "GET", null, null, 401);
    const task = (
      await request(
        "/tasks",
        "POST",
        { title: "隔离闭环", points: 30, assignee_id: 1 },
        a,
      )
    ).task;
    const patch = {
      title: "修改完成",
      points: 40,
      recurrence: "weekly:1,3",
      due_date: null,
    };
    const p = await request("/tasks/" + task.id, "PATCH", patch, a),
      u = await request("/tasks/" + task.id, "PUT", patch, a);
    assert.deepEqual(p, u);
    for (const method of ["PATCH", "PUT"]) {
      await request("/tasks/" + task.id, method, { points: -1 }, a, 400);
      await request("/tasks/999999", method, patch, a, 404);
    }
    await request("/tasks/" + task.id, "PUT", { recurrence: null }, a);
    await request("/completions", "POST", { task_id: task.id }, b, 403);
    let c = await request("/completions", "POST", { task_id: task.id }, a);
    await request(`/completions/${c.id}/confirm`, "POST", {}, a, 403);
    await request(`/completions/${c.id}/reject`, "POST", {}, b);
    const redo = await request("/completions", "POST", { task_id: task.id }, a);
    assert.equal(redo.id, c.id);
    assert.equal(redo.status, "pending");
    await request(`/completions/${c.id}/confirm`, "POST", {}, b);
    await request(`/completions/${c.id}/confirm`, "POST", {}, b, 409);
    assert.equal((await request("/rewards", "GET", null, a)).points, 40);
    const reward = (
      await request("/rewards", "POST", { title: "测试心愿", cost: 30 }, a)
    ).reward;
    const redemption = (
      await request("/redeem", "POST", { reward_id: reward.id }, a)
    ).redemption;
    assert.equal((await request("/rewards", "GET", null, a)).points, 10);
    await request("/redeem", "POST", { reward_id: reward.id }, a, 400);
    await request(`/redemptions/${redemption.id}/fulfill`, "POST", {}, a, 403);
    await request(`/redemptions/${redemption.id}/fulfill`, "POST", {}, b);
    await request(`/redemptions/${redemption.id}/fulfill`, "POST", {}, b, 409);
    const other = (
      await request(
        "/tasks",
        "POST",
        { title: "对方家务", points: 3, assignee_id: 2 },
        b,
      )
    ).task;
    c = await request("/completions", "POST", { task_id: other.id }, b);
    await request(`/completions/${c.id}/confirm`, "POST", {}, a);
    for (const period of ["week", "month"]) {
      const stats = await request("/stats?period=" + period, "GET", null, a);
      assert.equal(stats.users[0].completed, 1);
      assert.equal(stats.users[1].completed, 1);
      assert.equal(stats.users[0].points, 40);
    }
    await request("/tasks/" + task.id, "DELETE", null, a, 204);
    await request("/rewards/" + reward.id, "DELETE", null, a, 204);
    assert.equal(
      (await request("/rewards", "GET", null, a)).redemptions[0].title,
      "测试心愿",
    );
  } finally {
    child.kill();
    await once(child, "exit");
    rmSync(dir, { recursive: true, force: true });
  }
});
