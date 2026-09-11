<script setup>
import { memberAvatar } from "../../shared/member-avatar.mjs";
import { onMounted } from 'vue'
import { Sun, Sparkles, Gift, ChartBar, LogOut, Candy } from 'lucide-vue-next'
import { useSession } from './stores/session.js'

const s = useSession()

onMounted(() => {
  if (s.user) s.fetchUsers()
})

function switchUser() {
  if (confirm('切换身份？')) s.logout()
}
</script>

<template>
  <div class="shell">
    <header v-if="s.user" class="topbar">
      <div class="me">
        <span class="avatar" :class="'u' + s.user.id">{{ memberAvatar(s.user.id, s.user.name) }}</span>
        <div class="me-details">
          <b class="me-name">{{ s.user.name }}</b>
          <span class="pts-chip"><Candy :size="13" /> {{ s.myPoints }}</span>
        </div>
      </div>
      <div class="topbar-right">
        <span v-if="s.partner" class="partner-chip">
          <span class="avatar xs" :class="'u' + s.partner.id">{{ memberAvatar(s.partner.id, s.partner.name) }}</span>
          <span>{{ s.partner.name }}</span>
          <span class="partner-points"><Candy :size="13" /> {{ s.points[s.partner.id] ?? 0 }}</span>
        </span>
        <button class="icon-btn" title="切换身份" @click="switchUser"><LogOut :size="19" /></button>
      </div>
    </header>

    <main><RouterView /></main>

    <nav v-if="s.user" class="tabbar">
      <RouterLink to="/" class="tab">
        <Sun :size="21" /><span>今日</span>
        <em v-if="s.pendingCount" class="dot">{{ s.pendingCount }}</em>
      </RouterLink>
      <RouterLink to="/tasks" class="tab"><Sparkles :size="21" /><span>任务</span></RouterLink>
      <RouterLink to="/rewards" class="tab"><Gift :size="21" /><span>心愿</span></RouterLink>
      <RouterLink to="/stats" class="tab"><ChartBar :size="21" /><span>统计</span></RouterLink>
    </nav>
  </div>
</template>
