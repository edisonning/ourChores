import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Login from './views/Login.vue'
import Today from './views/Today.vue'
import Tasks from './views/Tasks.vue'
import Rewards from './views/Rewards.vue'
import Stats from './views/Stats.vue'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login },
    { path: '/', component: Today },
    { path: '/tasks', component: Tasks },
    { path: '/rewards', component: Rewards },
    { path: '/stats', component: Stats },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  if (!token && to.path !== '/login') return '/login'
  if (token && to.path === '/login') return '/'
})

createApp(App).use(createPinia()).use(router).mount('#app')
