<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Gift, Candy, Plus, Check, Sparkles, Trash2 } from 'lucide-vue-next'
import { api } from '../api.js'
import { useSession } from '../stores/session.js'

const s = useSession()
const rewards = ref([])
const redemptions = ref([])
const myPoints = ref(0)
const adding = ref(false)
const form = reactive({ title: '', cost: 10 })
const error = ref('')

async function load() {
  const d = await api('/rewards')
  rewards.value = d.rewards
  redemptions.value = d.redemptions
  myPoints.value = d.points
  s.points = Object.fromEntries(d.users.map(u => [u.id, u.points]))
}

async function redeem(r) {
  if (r.cost > myPoints.value) return
  try {
    const d = await api('/redeem', { method: 'POST', body: { reward_id: r.id } })
    myPoints.value = d.points
    s.points = { ...s.points, [s.user.id]: d.points }
    await load()
  } catch (e) { alert(e.message) }
}

async function fulfill(rd) {
  await api(`/redemptions/${rd.id}/fulfill`, { method: 'POST' })
  await load()
}

async function addReward() {
  if (!form.title.trim()) { error.value = '先写上想要什么吧'; return }
  try {
    await api('/rewards', { method: 'POST', body: { title: form.title.trim(), cost: form.cost } })
    adding.value = false
    form.title = ''
    form.cost = 10
    await load()
  } catch (e) { error.value = e.message }
}

async function delReward(r) {
  if (!confirm(`删掉「${r.title}」？`)) return
  await api(`/rewards/${r.id}`, { method: 'DELETE' })
  await load()
}

const pendingList = computed(() => redemptions.value.filter(r => !r.fulfilled))
const doneList = computed(() => redemptions.value.filter(r => r.fulfilled))
const partner = computed(() => s.partner)

onMounted(load)
</script>

<template>
  <div>
    <h2 class="date-line">心愿糖果铺</h2>
    <p class="date-sub">攒糖果，兑心愿</p>

    <div class="hero fade-up">
      <p class="label">我的糖果</p>
      <p class="num">{{ myPoints }} <span>颗</span></p>
      <p v-if="partner" class="partner-line">{{ partner.name }} 有 {{ s.points[partner.id] ?? 0 }} 颗</p>
    </div>

    <!-- 待兑现 -->
    <template v-if="pendingList.length">
      <h2 class="sec-title"><Sparkles :size="17" /> 待兑现 <em>{{ pendingList.length }}</em></h2>
      <article v-for="rd in pendingList" :key="rd.id" class="card redeem-row fade-up">
        <div class="reward-info">
          <b>{{ rd.user_name }}</b> 兑换了「{{ rd.title }}」
          <span class="pts-badge" style="margin-left: 6px; color: var(--teal)">−{{ rd.cost }}</span>
        </div>
        <button v-if="rd.user_id !== s.user.id" class="btn btn-ghost sm" @click="fulfill(rd)"><Check :size="15" /> 已兑现</button>
        <span v-else class="waiting">等{{ partner?.name || 'TA' }}兑现</span>
      </article>
    </template>

    <!-- 心愿清单 -->
    <h2 class="sec-title">心愿清单</h2>
    <article v-for="r in rewards" :key="r.id" class="card reward fade-up">
      <span class="reward-gift"><Gift :size="21" /></span>
      <div class="reward-info">
        <h3>{{ r.title }}</h3>
        <span class="pts-badge"><Candy :size="13" /> {{ r.cost }}</span>
      </div>
      <div class="reward-actions">
        <button class="btn btn-primary sm" :disabled="r.cost > myPoints" @click="redeem(r)">兑换</button>
        <span v-if="r.cost > myPoints" style="font-size: 11px; color: var(--ink-dim)">还差 {{ r.cost - myPoints }} 颗</span>
      </div>
      <button class="icon-btn reward-delete" :aria-label="`删除心愿：${r.title}`" title="删除心愿" @click="delReward(r)"><Trash2 :size="17" /></button>
    </article>

    <button v-if="!adding" class="btn btn-line" style="width: 100%" @click="adding = true; error = ''">
      <Plus :size="16" /> 添加心愿
    </button>
    <div v-else class="card fade-up" style="margin-top: 12px">
      <input v-model="form.title" class="input" placeholder="想要什么？如：按摩十分钟" maxlength="30">
      <div class="form-row">
        <label>价格</label>
        <div class="stepper">
          <button @click="form.cost = Math.max(1, form.cost - 5)">−</button>
          <b>{{ form.cost }}</b>
          <button @click="form.cost = Math.min(999, form.cost + 5)">+</button>
        </div>
      </div>
      <p v-if="error" class="err" style="margin-top: 10px">{{ error }}</p>
      <div class="form-actions">
        <button class="btn btn-primary" @click="addReward">保存</button>
        <button class="btn btn-line" @click="adding = false">取消</button>
      </div>
    </div>

    <!-- 兑换记录 -->
    <template v-if="doneList.length">
      <h2 class="sec-title">已兑现</h2>
      <article v-for="rd in doneList" :key="rd.id" class="card reward used" style="margin-bottom: 9px">
        <span class="reward-gift"><Gift :size="21" /></span>
        <div class="reward-info">
          <h3>{{ rd.title }}</h3>
          <span style="font-size: 12px; color: var(--ink-dim)">{{ rd.user_name }} · {{ rd.created_at.slice(0, 10) }}</span>
        </div>
        <Check :size="17" style="color: var(--teal); flex: none" />
      </article>
    </template>
  </div>
</template>
