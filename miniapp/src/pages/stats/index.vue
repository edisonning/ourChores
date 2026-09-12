<script setup>
import { ref } from 'vue'
import { usePage } from '../../usePage.js'
import Identity from '../../components/Identity.vue'
import PageStatus from '../../components/PageStatus.vue'
import BalanceScale from '../../components/BalanceScale.vue'
const period = ref('week')
const { s, loading, error, load } = usePage('stats', period, () => (period.value = 'week'))
function change(p) {
  if (loading.value || period.value === p) return
  period.value = p
  load()
}
</script>
<template>
  <view class="page">
    <Identity />
    <view class="heading">家务天平</view>
    <view class="balance-intro">一起分担，让每一份付出被看见</view>
    <view class="chips balance-periods">
      <button class="btn" :class="{ on: period === 'week' }" :disabled="loading" @click="change('week')">本周</button>
      <button class="btn" :class="{ on: period === 'month' }" :disabled="loading" @click="change('month')">本月</button>
    </view>
    <PageStatus :loading="loading" :error="error" @retry="load" />
    <template v-if="s.stats">
      <view class="balance-range">{{ s.stats.from }} — {{ s.stats.to }} · {{ s.stats.period === 'month' ? '本月' : '本周' }}</view>
      <BalanceScale :users="s.stats.users" :period="s.stats.period" />
    </template>
  </view>
</template>
<style scoped>
.balance-intro, .balance-range { color: #80695E; font-size: 13px; line-height: 1.7; }
.balance-intro { margin-top: 4px; }
.balance-periods { margin: 20px 0 8px; }
</style>
