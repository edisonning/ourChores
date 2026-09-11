import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import crypto from 'node:crypto'
import {createAuth} from '../auth.js'

test('会话独立随机、只存摘要、七天过期，拒绝旧令牌和篡改值',()=>{
 const db=new DatabaseSync(':memory:'),auth=createAuth(db,'legacy-secret'),now=1700000000000
 const first=auth.tokenFor(1,now),second=auth.tokenFor(1,now)
 assert.notEqual(first,second)
 assert.equal(auth.userIdFromToken(first,now),1)
 assert.notEqual(db.prepare('SELECT token_hash FROM sessions LIMIT 1').get().token_hash,first)
 assert.equal(auth.userIdFromToken(first,now+7*86400000),null)
 assert.equal(auth.userIdFromToken(first.slice(0,-1)+'z',now),null)
 assert.equal(auth.userIdFromToken('1.'+crypto.createHmac('sha256','legacy-secret').update('1').digest('hex'),now),null)
 db.close()
})
test('PIN 加盐慢哈希，兼容历史记录，拒绝非四位输入',()=>{
 const db=new DatabaseSync(':memory:'),auth=createAuth(db,'legacy-secret')
 const hash=auth.hashPin('5678')
 assert.notEqual(hash,auth.hashPin('5678'))
 assert.equal(auth.verifyPin('5678',hash),true)
 assert.equal(auth.verifyPin('5679',hash),false)
 const old=crypto.createHash('sha256').update('5678legacy-secret').digest('hex')
 assert.equal(auth.verifyPin('5678',old),true)
 for(const pin of [null,5678,'56789',{},'abcd'])assert.equal(auth.verifyPin(pin,hash),false)
 db.close()
})
test('每账户五次失败锁定15分钟、十次锁定24小时，重建控制器仍生效',()=>{
 const db=new DatabaseSync(':memory:'),auth=createAuth(db,'secret'),now=1700000000000
 for(let i=0;i<5;i++)auth.recordLoginFailure(1,now)
 assert.equal(auth.loginBlockedUntil(1,now+1),now+900000)
 assert.equal(auth.loginBlockedUntil(2,now+1),now+1)
 const restart=createAuth(db,'secret')
 assert.equal(restart.loginBlockedUntil(1,now+1),now+900000)
 for(let i=0;i<5;i++)restart.recordLoginFailure(1,now+900001)
 assert.equal(restart.loginBlockedUntil(1,now+900002),now+86400000)
 assert.equal(restart.loginBlockedUntil(1,now+86400001),now+86400001)
 restart.clearLoginFailures(1)
 assert.equal(restart.loginBlockedUntil(1,now+86400002),now+86400002)
 db.close()
})
