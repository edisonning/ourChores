import { defineStore } from 'pinia'
import { api } from '../api.js'

export const useSession = defineStore('session', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    users: [],   // 两位家庭成员 [{id, name}]
    points: {},  // id -> 糖果余额
    pendingCount: 0,
  }),
  getters: {
    myPoints: (s) => s.points[s.user?.id] ?? 0,
    partner: (s) => s.users.find((u) => u.id !== s.user?.id) || null,
  },
  actions: {
    async login(id, pin) {
      const { token, user } = await api('/login', { method: 'POST', body: { id, pin } })
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      this.user = user
    },
    async fetchUsers() {
      if (this.users.length) return
      this.users = await api('/users')
    },
    logout() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      location.href = '/login'
    },
  },
})
