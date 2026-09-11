import { test } from "node:test";
import assert from "node:assert/strict";
import { publicConfig } from "../scripts/public-config.mjs";
test("仅提取公开配置，兼容中文 AppID、冒号与等号，不读取 Secret", () => {
  assert.deepEqual(
    publicConfig(
      "小程序appid: wx0123456789abcdef\nAppSecret: never-export\nVITE_API_BASE_URL=http://192.168.1.2:3000/api",
    ),
    { appid: "wx0123456789abcdef", api: "http://192.168.1.2:3000/api" },
  );
  assert.deepEqual(
    publicConfig('AppID="wx0123456789abcdef"\nWECHAT_APPSECRET=never-export'),
    { appid: "wx0123456789abcdef" },
  );
});
