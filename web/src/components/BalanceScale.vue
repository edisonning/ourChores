<script setup>
import { computed } from 'vue'
import { householdBalance } from '../../../shared/balance.mjs'
import standImage from '../../../miniapp/src/static/scale-v2/stand.png'
import beamImage from '../../../miniapp/src/static/scale-v2/beam.png'
import leftImage from '../../../miniapp/src/static/scale-v2/left-pan.png'
import rightImage from '../../../miniapp/src/static/scale-v2/right-pan.png'
const props = defineProps({ users: { type: Array, default: () => [] }, period: { type: String, default: 'week' } })
const balance = computed(() => householdBalance(props.users, props.period))
</script>
<template>
  <div class="balance-surface">
    <div class="balance-stage" aria-hidden="true">
      <img class="scale-image scale-stand" :src="standImage" alt="" draggable="false" />
      <div class="scale-moving" :style="{ transform: 'rotate(' + balance.angle + 'deg)' }">
        <img class="scale-image scale-pan scale-left" :src="leftImage" alt="" draggable="false" :style="{ transform: 'rotate(' + -balance.angle + 'deg)' }" />
        <img class="scale-image scale-pan scale-right" :src="rightImage" alt="" draggable="false" :style="{ transform: 'rotate(' + -balance.angle + 'deg)' }" />
        <img class="scale-image scale-beam" :src="beamImage" alt="" draggable="false" />
      </div>
    </div>
    <div class="balance-message">{{ balance.message }}</div>
    <div class="balance-detail">{{ balance.detail }}</div>
    <div class="balance-members">
      <div v-for="member in balance.members" :key="member.id" class="balance-member">
        <div class="balance-name">{{ member.name }}</div>
        <div class="balance-points">{{ member.points }}</div>
        <div class="balance-unit">本期获得糖果</div>
        <div class="balance-completed">已确认 {{ member.completed }} 件家务</div>
      </div>
    </div>
    <div class="balance-note">只记录本期已确认的家务积分<br />兑换心愿不会改变天平</div>
  </div>
</template>
<style scoped src="../../../shared/balance.css"></style>
