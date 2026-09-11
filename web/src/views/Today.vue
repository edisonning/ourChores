<script setup>
import { memberAvatar } from "../../../shared/member-avatar.mjs";
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Check, X, Clock, Candy, BadgeCheck } from 'lucide-vue-next'
import { api } from '../api.js'
import { useSession } from '../stores/session.js'
import Logo from '../components/Logo.vue'

const s = useSession()
const data = ref(null)
const DOW = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

async function load() {
  try {
    data.value = await api('/today')
    s.points = Object.fromEntries(data.value.users.map(u => [u.id, u.points]))
    s.pendingCount = data.value.pending_confirm.length
  } catch (e) {
    /* 401 已由 api.js 跳转登录处理 */
  }
}

async function complete(t) {
  try {
    await api('/completions', { method: 'POST', body: { task_id: t.id } })
    await load()
  } catch (e) { alert(e.message) }
}
async function confirmIt(c) {
  await api(`/completions/${c.id}/confirm`, { method: 'POST' })
  await load()
}
async function rejectIt(c) {
  if (!confirm('确定打回这个任务吗？')) return
  await api(`/completions/${c.id}/reject`, { method: 'POST' })
  await load()
}

const dateLine = computed(() => {
  if (!data.value) return ''
  const [y, m, d] = data.value.date.split('-').map(Number)
  const dow = DOW[(new Date(y, m - 1, d).getDay() + 6) % 7]
  return `${m}月${d}日 · ${dow}`
})

function recurLabel(t) {
  if (!t.recurrence) return '单次'
  if (t.recurrence === 'daily') return '每天'
  return t.recurrence.split(':')[1].split(',').map(n => DOW[n - 1]).join('·')
}
function assignLabel(t) {
  if (!t.assignee_id) return '都行'
  if (t.assignee_id === s.user.id) return '我做'
  return (s.partner?.name || 'TA') + '做'
}
function assignClass(t) {
  if (!t.assignee_id) return ''
  return t.assignee_id === s.user.id ? 'mine' : 'theirs'
}
const canDo = (t) =>
  (!t.completion || t.completion.status === 'rejected') &&
  (!t.assignee_id || t.assignee_id === s.user.id)

function onVisible() { if (!document.hidden) load() }
let timer
onMounted(() => {
  load()
  timer = setInterval(load, 30000)
  document.addEventListener('visibilitychange', onVisible)
})
onUnmounted(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<template>
  <div v-if="data">
    <h2 class="date-line">{{ dateLine }}</h2>
    <p class="date-sub">
      今天 {{ data.tasks.length }} 项任务<template v-if="s.pendingCount"> · 有 {{ s.pendingCount }} 件等你确认</template>
    </p>

    <!-- 待我确认 -->
    <section v-if="data.pending_confirm.length">
      <h2 class="sec-title"><BadgeCheck :size="17" /> 待我确认 <em>{{ data.pending_confirm.length }}</em></h2>
      <article v-for="c in data.pending_confirm" :key="c.id" class="card confirm-card fade-up">
        <span class="avatar" :class="'u' + c.user_id">{{ memberAvatar(c.user_id, c.user_name) }}</span>
        <div class="confirm-info">
          <b>{{ c.user_name }}</b> 完成了「{{ c.title }}」
          <span class="pts-badge"><Candy :size="13" /> +{{ c.points }}</span>
        </div>
        <div class="confirm-actions">
          <button class="btn btn-primary sm" @click="confirmIt(c)"><Check :size="15" /> 确认</button>
          <button class="btn btn-line sm" @click="rejectIt(c)"><X :size="15" /></button>
        </div>
      </article>
    </section>

    <!-- 今日任务 -->
    <h2 class="sec-title">今日任务</h2>
    <article
      v-for="(t, i) in data.tasks" :key="t.id"
      class="card task fade-up" :style="{ animationDelay: i * 50 + 'ms' }"
    >
      <div v-if="t.completion?.status === 'confirmed'" class="stamp">已完成</div>
      <div class="task-main">
        <div class="task-title-row">
          <h3>{{ t.title }}</h3>
          <span class="pts-badge"><Candy :size="14" /> +{{ t.points }}</span>
        </div>
        <div class="task-meta">
          <span class="tag" :class="assignClass(t)">{{ assignLabel(t) }}</span>
          <span class="tag">{{ recurLabel(t) }}</span>
          <span v-if="t.overdue" class="tag warn">已逾期</span>
          <span v-if="t.completion?.status === 'rejected'" class="tag warn">被打回了，再试一次</span>
        </div>
      </div>
      <div class="task-side">
        <template v-if="t.completion?.status === 'pending'">
          <span class="waiting"><Clock :size="14" /> 等确认</span>
        </template>
        <template v-else-if="t.completion?.status === 'confirmed'">
          <span class="pts-chip"><Candy :size="12" /> +{{ t.completion.points }}</span>
        </template>
        <template v-else-if="canDo(t)">
          <button class="btn btn-primary sm" @click="complete(t)">完成</button>
        </template>
        <template v-else>
          <span class="waiting" style="color: var(--ink-dim)">等{{ s.partner?.name || 'TA' }}</span>
        </template>
      </div>
    </article>

    <div v-if="!data.tasks.length" class="empty">
      <Logo :size="72" />
      <p>今天没有任务，好好休息</p>
    </div>
  </div>
</template>
