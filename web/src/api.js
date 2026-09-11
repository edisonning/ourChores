export async function api(path, opts = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch('/api' + path, {
    method: opts.method || 'GET',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: 'Bearer ' + token } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  // 401 跳登录重新认证——但登录接口自身的 401（PIN 错误）要交给调用方展示
  if (res.status === 401 && !path.startsWith('/login')) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    location.href = '/login'
    throw new Error('登录已过期')
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `请求失败 (${res.status})`)
  }
  return res.status === 204 ? null : res.json()
}
