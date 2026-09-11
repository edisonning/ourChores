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
