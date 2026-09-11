<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Candy, ChevronRight, Check } from 'lucide-vue-next'
import { api } from '../api.js'
import { useSession } from '../stores/session.js'

const s = useSession()
const DOW = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const tasks = ref([])
const editing = ref(false)
const editingId = ref(null) // null = 新建
const form = reactive({ title: '', points: 1, assignee_id: null, type: 'daily', dows: [], due_date: '' })
const error = ref('')

async function load() {
  tasks.value = (await api('/tasks')).tasks
}

function openNew() {
  Object.assign(form, { title: '', points: 1, assignee_id: null, type: 'daily', dows: [], due_date: '' })
  editingId.value = null
  editing.value = true
  error.value = ''
}
function openEdit(t) {
  Object.assign(form, {
    title: t.title,
    points: t.points,
    assignee_id: t.assignee_id,
    type: t.recurrence === 'daily' ? 'daily' : t.recurrence ? 'weekly' : 'once',
    dows: t.recurrence?.startsWith('weekly:') ? t.recurrence.split(':')[1].split(',').map(Number) : [],
    due_date: t.due_date || '',
  })
  editingId.value = t.id
  editing.value = true
  error.value = ''
}

function toggleDow(n) {
  const i = form.dows.indexOf(n)
  i >= 0 ? form.dows.splice(i, 1) : form.dows.push(n)
}

async function save() {
  if (!form.title.trim()) { error.value = '先写上要做的事吧'; return }
  if (form.type === 'weekly' && !form.dows.length) { error.value = '选一下每周哪几天'; return }
  const body = {
    title: form.title.trim(),
    points: form.points,
    assignee_id: form.assignee_id,
    recurrence: form.type === 'daily' ? 'daily' : form.type === 'weekly' ? 'weekly:' + [...form.dows].sort().join(',') : null,
    due_date: form.type === 'once' ? form.due_date || null : null,
  }
  try {
    if (editingId.value) await api(`/tasks/${editingId.value}`, { method: 'PATCH', body })
    else await api('/tasks', { method: 'POST', body })
    editing.value = false
    await load()
  } catch (e) { error.value = e.message }
}

async function del() {
  if (!confirm('删除这个任务？历史记录会保留')) return
  await api(`/tasks/${editingId.value}`, { method: 'DELETE' })
  editing.value = false
  await load()
}

const partner = computed(() => s.partner)

function recurLabel(t) {
  if (!t.recurrence) return t.due_date ? '截止 ' + t.due_date.replace(/-/g, '/') : '单次'
  if (t.recurrence === 'daily') return '每天'
  return '每 ' + t.recurrence.split(':')[1].split(',').map(n => DOW[n - 1]).join('·')
}
function assignLabel(t) {
  if (!t.assignee_id) return '都行'
  if (t.assignee_id === s.user?.id) return '我做'
  return (partner.value?.name || 'TA') + '做'
}
function assignClass(t) {
  if (!t.assignee_id) return ''
  return t.assignee_id === s.user?.id ? 'mine' : 'theirs'
}

onMounted(load)
</script>

<template>
  <div>
    <h2 class="date-line">任务管理</h2>
    <p class="date-sub">打理我们的家务清单</p>

    <button v-if="!editing" class="btn btn-primary" style="width: 100%; margin-bottom: 18px" @click="openNew">
      <Plus :size="17" /> 新建任务
    </button>

    <!-- 新建 / 编辑表单 -->
    <div v-if="editing" class="card fade-up" style="margin-bottom: 18px">
      <input v-model="form.title" class="input" placeholder="要做什么家务？" maxlength="30">
      <div class="form-row">
        <label>糖果</label>
        <div class="stepper">
          <button @click="form.points = Math.max(0, form.points - 1)">−</button>
          <b>{{ form.points }}</b>
          <button @click="form.points = Math.min(99, form.points + 1)">+</button>
        </div>
      </div>
      <div class="form-row">
        <label>分配</label>
        <div class="chips">
          <button :class="{ on: !form.assignee_id }" @click="form.assignee_id = null">都行</button>
          <button v-if="s.user" :class="{ on: form.assignee_id === s.user.id }" @click="form.assignee_id = s.user.id">我</button>
          <button v-if="partner" :class="{ on: form.assignee_id === partner.id }" @click="form.assignee_id = partner.id">{{ partner.name }}</button>
        </div>
      </div>
      <div class="form-row">
        <label>重复</label>
        <div class="chips">
          <button :class="{ on: form.type === 'daily' }" @click="form.type = 'daily'">每天</button>
          <button :class="{ on: form.type === 'weekly' }" @click="form.type = 'weekly'">每周</button>
          <button :class="{ on: form.type === 'once' }" @click="form.type = 'once'">单次</button>
        </div>
      </div>
      <div v-if="form.type === 'weekly'" class="form-row">
        <label>周几</label>
        <div class="chips">
          <button v-for="(d, i) in DOW" :key="d" :class="{ on: form.dows.includes(i + 1) }" @click="toggleDow(i + 1)">{{ d }}</button>
        </div>
      </div>
      <div v-if="form.type === 'once'" class="form-row">
        <label>截止</label>
        <input v-model="form.due_date" type="date" class="input" style="flex: 1">
      </div>
      <p v-if="error" class="err" style="margin-top: 10px">{{ error }}</p>
      <div class="form-actions">
        <button class="btn btn-primary" @click="save">保存</button>
        <button class="btn btn-line" @click="editing = false">取消</button>
        <button v-if="editingId" class="btn danger" @click="del">删除</button>
      </div>
    </div>

    <template v-if="!editing">
      <h2 class="sec-title">周期任务</h2>
      <article v-for="t in tasks.filter(t => t.recurrence)" :key="t.id" class="card task" @click="openEdit(t)">
        <div class="task-main">
          <div class="task-title-row">
            <h3>{{ t.title }}</h3>
            <span class="pts-badge"><Candy :size="14" /> {{ t.points }}</span>
          </div>
          <div class="task-meta">
            <span class="tag" :class="assignClass(t)">{{ assignLabel(t) }}</span>
            <span class="tag">{{ recurLabel(t) }}</span>
          </div>
        </div>
        <ChevronRight :size="18" style="color: var(--ink-dim); flex: none" />
      </article>

      <h2 class="sec-title">一次性任务</h2>
      <article v-for="t in tasks.filter(t => !t.recurrence)" :key="t.id" class="card task" :style="t.done ? 'opacity:.55' : ''" @click="openEdit(t)">
        <div class="task-main">
          <div class="task-title-row">
            <h3>{{ t.title }}</h3>
            <span class="pts-badge"><Candy :size="14" /> {{ t.points }}</span>
          </div>
          <div class="task-meta">
            <span class="tag" :class="assignClass(t)">{{ assignLabel(t) }}</span>
            <span class="tag">{{ recurLabel(t) }}</span>
          </div>
        </div>
        <span v-if="t.done" class="tag" style="background: var(--teal-tint); color: var(--teal)"><Check :size="12" /> 已完成</span>
        <ChevronRight v-else :size="18" style="color: var(--ink-dim); flex: none" />
      </article>
    </template>
  </div>
</template>
