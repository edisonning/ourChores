import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../../", import.meta.url));
// Only allowlisted public settings are read. Secrets never enter Vite's environment.
import { publicConfig } from "./public-config.mjs";

const config = publicConfig(
  fs.existsSync(path.join(root, ".env"))
    ? fs.readFileSync(path.join(root, ".env"), "utf8")
    : "",
);
const appid = process.env.WECHAT_APPID || config.appid || "touristappid";
if (appid !== "touristappid" && !/^wx[0-9a-f]{16}$/i.test(appid))
  throw new Error("AppID 格式不正确");
fs.writeFileSync(
  path.join(root, "miniapp/src/manifest.json"),
  JSON.stringify(
    {
      name: "甜甜家务",
      appid: "",
      versionName: "1.0.0",
      versionCode: "100",
      uniStatistics: { enable: false },
      "mp-weixin": {
        appid,
        setting: { urlCheck: false },
        usingComponents: true,
      },
    },
    null,
    2,
  ),
);
