<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '../api.js'
import BalanceScale from '../components/BalanceScale.vue'

const period = ref('week')
const data = ref(null)
const loading = ref(false)
const error = ref('')
async function load() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try { data.value = await api(`/stats?period=${period.value}`) }
  catch (e) { error.value = e.message || '暂时无法读取家务记录' }
  finally { loading.value = false }
}
const rangeLine = computed(() => data.value ? `${data.value.from} — ${data.value.to}` : '')
function setPeriod(p) {
  if (loading.value || period.value === p) return
  period.value = p
  load()
}
onMounted(load)
</script>
<template>
  <section class="balance-page" :aria-busy="loading">
    <h2 class="date-line">家务天平</h2>
    <p class="balance-intro">一起分担，让每一份付出被看见</p>
    <div class="chips balance-periods" role="group" aria-label="查看周期">
      <button :class="{ on: period === 'week' }" :aria-pressed="period === 'week'" :disabled="loading" @click="setPeriod('week')">本周</button>
      <button :class="{ on: period === 'month' }" :aria-pressed="period === 'month'" :disabled="loading" @click="setPeriod('month')">本月</button>
    </div>
    <p v-if="loading" class="balance-status" role="status">正在读取家务记录…</p>
    <div v-if="error" class="balance-error" role="alert">{{ error }} <button class="btn" @click="load">重试</button></div>
    <template v-if="data">
      <p class="balance-range">{{ rangeLine }} · {{ data.period === 'month' ? '本月' : '本周' }}</p>
      <BalanceScale :users="data.users" :period="data.period" />
    </template>
  </section>
</template>
<style scoped>
.balance-intro, .balance-range, .balance-status { color: #80695E; font-size: 13px; line-height: 1.7; }
.balance-intro { margin-top: 4px; }
.balance-periods { margin: 20px 0 8px; }
.balance-periods button { min-height: 44px; }
.balance-periods button:focus-visible, .balance-error button:focus-visible { outline: 2px solid #B94635; outline-offset: 3px; }
.balance-periods button:disabled { opacity: .6; cursor: wait; }
.balance-error { color: #B94635; font-size: 14px; padding: 12px 0; }
.balance-error button { margin-left: 10px; }
</style>
