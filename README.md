# 甜甜家务

给夫妻二人的家庭任务 App：一起打理家务、打卡攒糖果、兑换心愿。

- 手机浏览器打开，添加到主屏幕像原生 App 一样用
- 周期家务（每天/每周几）自动出现在「今日」
- 完成任务 → 对方确认 → 攒糖果积分（不能自己确认自己，防刷分）
- 心愿清单：用糖果兑换，对方兑现
- 统计看板：本周/本月谁干得多、完成率

## 启动

需要 Node.js 20+ 和 [pnpm](https://pnpm.io)。

```bash
pnpm install
pnpm build     # 构建前端
pnpm start     # 启动服务（端口 3000）
```

启动后会打印局域网地址，例如：

```
甜甜家务已启动 → http://192.168.1.5:3000
```

两台手机连同一个 WiFi，浏览器打开上面的地址即可。

> 首次启动会在 `server/data.db` 创建数据库，默认用户 **老公 / 老婆，PIN 均为 1234**。
> PIN 只用来区分身份，防刷分靠「完成人 ≠ 确认人」的服务端规则。

## 手机上怎么像 App 一样用

- **iPhone**：Safari 打开 → 分享 → 添加到主屏幕
- **Android**：Chrome 打开 → 菜单 → 添加到主屏幕 / 安装应用

## 开发

```bash
pnpm dev       # 前端 Vite(5173, 代理 /api) + 后端 node --watch(3000)
```

## 常见问题

- **手机打不开**：确认手机和 Mac 在同一 WiFi；首次启动 macOS 防火墙弹窗要点「允许」；查 Mac IP：`ipconfig getifaddr en0`
- **Mac 合盖后服务断了**：用 `caffeinate -i pnpm start` 启动，或系统设置里调高不休眠时间
- **Mac 时区/时间不对会导致「今天」算错**：检查系统日期时间设置
- **想改名字或 PIN**：目前名字在 `server/db.js` 种子里，改完删掉 `server/data.db` 重启即可（会清空数据）
- **想部署到云服务器**：整个目录拷过去 `pnpm i && pnpm build && pnpm start`，或用 Docker 跑一个 Node 镜像，代码零改动

## 技术栈

Vue 3 + Vite + Pinia + vue-router + lucide 图标 ｜ Express 5 + better-sqlite3（单文件 SQLite，无余额列，积分从流水推导）

## 微信小程序

已新增独立 `miniapp` 工程，网页版保持可用，两端共用后端数据。

```sh
corepack pnpm dev:mp-weixin
corepack pnpm build:mp-weixin
corepack pnpm test
```

导入目录、AppID／局域网 API 配置和手机调试步骤见 [小程序启动说明](miniapp/README.md)。

## 公网访问

网页版：https://tiantian-chores.taild02971.ts.net/

通过 Ubuntu 上的 Tailscale Funnel 提供 HTTPS，使用个人免费方案。新 PIN 由成员自行设置，登录会话有效期 7 天。维护与停用方法见 [部署说明](deploy/README.md)。
