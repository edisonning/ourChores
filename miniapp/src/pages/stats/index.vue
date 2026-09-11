<script setup>
import { memberAvatar } from "../../../../shared/member-avatar.mjs";
import { ref } from "vue";
import { usePage } from "../../usePage.js";
import Identity from "../../components/Identity.vue";
import PageStatus from "../../components/PageStatus.vue";
const period = ref("week");
const { s, loading, error, load } = usePage(
  "stats",
  period,
  () => (period.value = "week"),
);
function change(p) {
  if (loading.value) return;
  period.value = p;
  s.stats = null;
  load();
}
</script>
<template>
  <view class="page"
    ><Identity /><view class="heading">家务统计</view
    ><view class="chips" style="margin: 18px 0"
      ><button
        class="btn"
        :class="{ on: period === 'week' }"
        :disabled="loading"
        @click="change('week')"
      >
        本周</button
      ><button
        class="btn"
        :class="{ on: period === 'month' }"
        :disabled="loading"
        @click="change('month')"
      >
        本月
      </button></view
    ><PageStatus :loading="loading" :error="error" @retry="load" /><template
      v-if="s.stats"
      ><view class="sub">{{ s.stats.from }} — {{ s.stats.to }}</view
      ><view
        v-for="memberItem in s.stats.users"
        :key="memberItem.id"
        class="card"
        ><view class="row"
          ><text class="avatar" :class="'u' + memberItem.id">{{
            memberAvatar(memberItem.id, memberItem.name)
          }}</text
          ><text class="title">{{ memberItem.name }}</text></view
        ><view class="metrics"
          ><view class="metric"
            ><view class="number">{{ memberItem.completed }}</view
            ><view class="muted">完成件数</view></view
          ><view class="metric"
            ><view class="number">{{ memberItem.points }}</view
            ><view class="muted">获得糖果</view></view
          ><view class="metric"
            ><view class="number">{{
              memberItem.rate === null
                ? "—"
                : Math.round(memberItem.rate * 100) + "%"
            }}</view
            ><view class="muted">完成率</view></view
          ></view
        ><view class="track"
          ><view
            class="bar"
            :class="'u' + memberItem.id"
            :style="{
              width: Math.min(100, (memberItem.rate || 0) * 100) + '%',
            }" /></view
        ><view class="muted" style="margin-top: 10px"
          >应做 {{ memberItem.due }} 件 · 已确认
          {{ memberItem.completed }} 件</view
        ></view
      ><view class="muted"
        >按服务端口径统计，只有对方确认的任务计入完成。</view
      ></template
    ></view
  >
</template>
