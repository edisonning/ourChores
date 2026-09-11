#!/usr/bin/env python3
"""Run interactively on the server. PINs are never printed or stored as plaintext."""
import getpass
import hashlib
import os
from pathlib import Path
import re
import secrets
import sqlite3

if not os.isatty(0):
    raise SystemExit('请在交互终端运行，避免 PIN 被记录到日志。')
database = Path(os.environ.get('DB_PATH', Path(__file__).with_name('data.db')))
connection = sqlite3.connect(database)
updates = []
for user_id, name in connection.execute('SELECT id, name FROM users ORDER BY id'):
    while True:
        pin = getpass.getpass(f'{name}的新四位 PIN（输入不显示）：')
        if not re.fullmatch(r'[0-9]{4}', pin) or len(set(pin)) == 1 or pin in {'1234', '4321', '0123', '2345', '3456', '4567', '5678', '6789', '9876', '8765'}:
            print('请使用四位数字，避免默认 PIN、连续数字和全部相同的数字。')
            continue
        if getpass.getpass('再输入一次：') != pin:
            print('两次输入不一致，请重试。')
            continue
        salt = secrets.token_hex(16)
        hashed = hashlib.scrypt(pin.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=64).hex()
        updates.append((f'scrypt${salt}${hashed}', user_id))
        break
with connection:
    connection.executemany('UPDATE users SET pin_hash=? WHERE id=?', updates)
    connection.execute('DELETE FROM sessions')
    connection.execute('DELETE FROM login_failures')
connection.close()
print('两位成员 PIN 已更新。请在网页和小程序重新登录；无需把 PIN 发给任何人。')
