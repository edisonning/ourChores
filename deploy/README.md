# Ubuntu 后端部署

当前目标：`edison@192.168.2.123`，Ubuntu 22.04.5 LTS。

- API：`http://192.168.2.123:3000/api`
- 网页：`http://192.168.2.123:3000`
- 程序：`/home/edison/our-chores/server`
- 数据库：`/home/edison/our-chores/server/data.db`
- 网页产物：`/home/edison/our-chores/web/dist`
- Node：复用现有 `/home/edison/.local/share/pi-node/node-v22.22.3-linux-x64/bin/node`
- systemd：`our-chores.service`，以 edison 运行，开机自启、异常退出自动重启，时区 Asia/Shanghai。

## 常用维护命令（Ubuntu 上执行）

```sh
systemctl status our-chores
journalctl -u our-chores -n 100 --no-pager
sudo systemctl restart our-chores
curl http://127.0.0.1:3000/api/users
```

更新时只替换 `index.js`、`db.js`、依赖及 `web/dist`，**不要用旧电脑的数据库覆盖线上数据库**。服务端运行中的 SQLite 使用 WAL；备份使用 SQLite backup API，不要只复制正在写入的 data.db 文件。

仓库中的 `our-chores.service` 保存了当前服务配置。若现有 pi-node 路径迁移，需同步更新 `ExecStart` 并执行 `sudo systemctl daemon-reload`、`sudo systemctl restart our-chores`。

## 本次迁移验证（2026-09-10）

- 本地数据、SQLite 一致性备份和远端数据库的 SQL dump SHA-256 一致。
- 保留 2 位成员、10 个任务、4 条打卡记录、5 个心愿、1 条兑换记录，以及 PIN 哈希和登录签名密钥。
- 数据库 `PRAGMA integrity_check` 返回 `ok`。
- systemd 状态为 active / enabled，远端网页返回 HTTP 200，电脑通过 Wi-Fi 访问远端成员接口成功。
- 根目录 `.env`、小程序开发与生产产物改为新 API 地址。本机旧后端停止，避免两个数据库继续分别写入；本地原数据库保留作为切换时备份。

当前电脑代理会接管部分局域网流量。如普通 SSH 在握手前断开，可仅为这次连接指定 Wi-Fi：

```sh
ssh -o 'ProxyCommand=nc -b en0 -G 8 %h %p' edison@192.168.2.123
```

手机仍需能访问 `192.168.2.123` 所在局域网；更改后需要重新生成预览／真机调试包，已打开的旧包不会自动更新接口地址。未上传审核或正式发布。

## 公网接入准备：Tailscale Funnel（2026-09-11）

已安装官方 stable Tailscale，使用设备名 `tiantian-chores`；未启用子网路由、出口节点或 Tailscale SSH，登录时设置 `--accept-dns=false --accept-routes=false`。账号授权、新 PIN 设置和 Funnel 开通已完成。公网地址为 https://tiantian-chores.taild02971.ts.net/ 。

已部署的登录保护：

- 会话是独立的随机令牌，数据库只存摘要，7 天过期；旧版永久令牌失效，需要重新登录。
- PIN 使用随机盐的 scrypt 哈希；历史 SHA-256 记录在成功登录时升级，不改变原 PIN。
- 同账户 15 分钟内 5 次失败、24 小时内 10 次失败后拒绝尝试，返回 429 与 Retry-After。成功登录清除失败记录；计数存在数据库中，重启不清零，也不依赖可伪造的转发 IP 请求头。
- API 响应禁用缓存，JSON 请求上限 16 KiB。
- 以 Ubuntu 上 `python3 /home/edison/our-chores/server/set-pin.py` 在交互终端设置两位成员的新 PIN。输入不显示，只保存哈希，并撤销旧会话。
- 开放前备份位于 Ubuntu `/home/edison/our-chores/backups/pre-public/`；后续回滚只恢复代码，不以备份覆盖新业务数据。

已以 `sudo tailscale funnel --bg http://127.0.0.1:3000` 发布，仅代理甜甜家务服务。公网 HTTPS 证书验证通过，主页 HTTP 200，未登录的 /api/today 返回 401；Edge 浏览器已显示阿波／阿群成员选择。新 PIN 登录后的操作和手机移动网络速度由用户实测，未代填用户的新 PIN。停止公网入口可运行 `sudo tailscale funnel reset`，不会停止局域网后端。

2026-09-11 公网验收：首次启用等待 ACME 证书签发与转发状态生效后访问成功。Tailscale 后台运行，tailscaled 和 our-chores 均已开机自启。保持设备名和 tailnet 名不变以保留网址。用户已自行设置两位成员 PIN（两条均为 scrypt，默认 PIN 数量为 0）。小程序仍使用原局域网 API，本次只开放网页版。
