<script setup>
import { memberAvatar } from "../../../shared/member-avatar.mjs";
import { ref, computed, onMounted } from 'vue'
import { Trophy, Candy } from 'lucide-vue-next'
import { api } from '../api.js'

const period = ref('week')
const data = ref(null)

async function load() {
  data.value = await api(`/stats?period=${period.value}`)
}

const rangeLine = computed(() => {
  if (!data.value) return ''
  const [, fm, fd] = data.value.from.split('-').map(Number)
  const [, tm, td] = data.value.to.split('-').map(Number)
  return `${fm}月${fd}日 — ${fm === tm ? '' : tm + '月'}${td}日`
})

const leader = computed(() => {
  if (!data.value || data.value.users.length < 2) return null
  const [a, b] = data.value.users
  if (a.points === b.points) return null
  return a.points > b.points ? a : b
})

function setPeriod(p) {
  period.value = p
  load()
}

onMounted(load)
</script>

<template>
  <div v-if="data">
    <h2 class="date-line">家务统计</h2>

    <div class="chips" style="margin: 12px 2px 4px">
      <button :class="{ on: period === 'week' }" @click="setPeriod('week')">本周</button>
      <button :class="{ on: period === 'month' }" @click="setPeriod('month')">本月</button>
    </div>
    <p class="range-line">{{ rangeLine }}</p>

    <div v-if="leader" class="card fade-up" style="display: flex; align-items: center; gap: 10px; margin-bottom: 13px; background: linear-gradient(135deg, #FFF3E2, #FFE9D6)">
      <Trophy :size="20" style="color: var(--gold); flex: none" />
      <span style="font-size: 14px"><b>{{ leader.name }}</b> 本{{ period === 'week' ? '周' : '月' }}攒了最多糖果，夸夸 TA</span>
    </div>

    <article v-for="u in data.users" :key="u.id" class="card stat-card fade-up">
      <div class="stat-head">
        <span class="avatar" :class="'u' + u.id">{{ memberAvatar(u.id, u.name) }}</span>
        <b>{{ u.name }}</b>
        <span class="pts-chip"><Candy :size="13" /> {{ u.points }}</span>
      </div>
      <div class="stat-nums">
        <div>
          <p class="n">{{ u.completed }}</p>
          <p class="l">完成件数</p>
        </div>
        <div>
          <p class="n">{{ u.points }}</p>
          <p class="l">获得糖果</p>
        </div>
        <div>
          <p class="n">{{ u.rate === null ? '—' : Math.round(u.rate * 100) + '%' }}</p>
          <p class="l">任务完成率</p>
        </div>
      </div>
      <div class="bar-track">
        <div class="bar-fill" :class="'t' + u.id" :style="{ width: (u.rate ?? 0) * 100 + '%' }" />
      </div>
      <p class="rate-line"><span>应做 {{ u.due }} 件</span><span>完成了 {{ u.completed }} 件</span></p>
    </article>
  </div>
</template>
