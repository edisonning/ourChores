import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const source = fs
  .readFileSync(new URL("../src/api.js", import.meta.url), "utf8")
  .replaceAll(
    "import.meta.env.VITE_API_BASE_URL",
    JSON.stringify("http://localhost/api"),
  );
const { api, saveSession, readSession } = await import(
  "data:text/javascript;base64," + Buffer.from(source).toString("base64")
);
let saved = null,
  pending = [],
  navigated = 0;
globalThis.uni = {
  getStorageSync: () => saved,
  setStorageSync: (_, v) => (saved = v),
  removeStorageSync: () => (saved = null),
  $emit() {},
  removeTabBarBadge() {},
  reLaunch() {
    navigated++;
  },
  request: (r) => pending.push(r),
};
test("登录 PIN 401 保留会话，业务 401 清除会话", async () => {
  saveSession({ token: "a" });
  let p = api("/login", { method: "POST" });
  pending.shift().success({ statusCode: 401, data: { error: "PIN 不正确" } });
  await assert.rejects(p, /PIN 不正确/);
  assert.ok(readSession());
  assert.equal(navigated, 0);
  p = api("/today");
  pending.shift().success({ statusCode: 401 });
  await assert.rejects(p, { stale: true });
  assert.equal(readSession(), null);
  assert.equal(navigated, 1);
});
test("身份切换后旧响应不能覆盖数据或清除新会话", async () => {
  saveSession({ token: "old" });
  const p = api("/today");
  const req = pending.shift();
  saveSession({ token: "new" });
  req.success({ statusCode: 401 });
  await assert.rejects(p, { stale: true });
  assert.equal(readSession().token, "new");
});
test("网络失败不自动重试写入；PUT、Bearer 与 204 正常", async () => {
  const p = api("/redeem", { method: "POST", body: { reward_id: 1 } });
  pending.shift().fail();
  await assert.rejects(p, /连接失败/);
  assert.equal(pending.length, 0);
  const q = api("/tasks/1", { method: "PUT", body: { title: "改名" } });
  const req = pending.shift();
  assert.equal(req.method, "PUT");
  assert.equal(req.header.Authorization, "Bearer new");
  req.success({ statusCode: 204 });
  assert.equal(await q, null);
});
