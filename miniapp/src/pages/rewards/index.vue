<script setup>
import { ref, reactive } from "vue";
import { usePage } from "../../usePage.js";
import { api, confirmAction } from "../../api.js";
import Identity from "../../components/Identity.vue";
import PageStatus from "../../components/PageStatus.vue";
const adding = ref(false),
  form = reactive({ title: "", cost: 10 });
const { s, loading, busy, error, load, act } = usePage(
  "rewards",
  undefined,
  () => {
    adding.value = false;
    form.title = "";
    form.cost = 10;
  },
);
function add() {
  if (
    !form.title.trim() ||
    !Number.isInteger(Number(form.cost)) ||
    Number(form.cost) <= 0
  ) {
    error.value = "请填写心愿，糖果价格需为正整数";
    return;
  }
  act(
    () =>
      api("/rewards", {
        method: "POST",
        body: { title: form.title.trim(), cost: Number(form.cost) },
      }),
    () => {
      adding.value = false;
      form.title = "";
      form.cost = 10;
    },
  );
}
function redeem(r) {
  act(async () => {
    if (!(await confirmAction(`用 ${r.cost} 颗糖果兑换「${r.title}」？`)))
      return;
    await api("/redeem", { method: "POST", body: { reward_id: r.id } });
  });
}
function remove(r) {
  act(async () => {
    if (await confirmAction(`删掉「${r.title}」？历史记录会保留`))
      await api(`/rewards/${r.id}`, { method: "DELETE" });
  });
}
function fulfill(r) {
  act(() => api(`/redemptions/${r.id}/fulfill`, { method: "POST" }));
}
</script>
<template>
  <view class="page"
    ><Identity /><view class="heading">心愿糖果铺</view
    ><view class="sub">攒糖果，兑心愿</view
    ><PageStatus :loading="loading" :error="error" @retry="load" /><template
      v-if="s.rewards"
      ><view class="hero"
        ><view>我的糖果</view
        ><view class="number"
          >{{ s.rewards.points }} <text style="font-size: 16px">颗</text></view
        ><view v-if="s.partner"
          >{{ s.partner.name }} 有 {{ s.partner.points }} 颗</view
        ></view
      ><view class="section">待兑现</view
      ><view
        v-for="rewardItem in s.rewards.redemptions.filter(
          (rewardItem) => !rewardItem.fulfilled,
        )"
        :key="rewardItem.id"
        class="card"
        ><view class="title"
          >{{ rewardItem.user_name }} 兑换了「{{ rewardItem.title }}」</view
        ><view class="muted"
          >{{ rewardItem.created_at.slice(0, 10) }} ·
          {{ rewardItem.cost }} 颗糖果</view
        ><view class="actions"
          ><button
            v-if="rewardItem.user_id !== s.user?.id"
            class="btn"
            :disabled="busy"
            @click="fulfill(rewardItem)"
          >
            已兑现</button
          ><text v-else class="muted">等对方兑现</text></view
        ></view
      ><view
        v-if="
          !s.rewards.redemptions.some((rewardItem) => !rewardItem.fulfilled)
        "
        class="empty"
        >没有待兑现的心愿</view
      ><view class="section">心愿清单</view
      ><view
        v-for="rewardItem in s.rewards.rewards"
        :key="rewardItem.id"
        class="card"
        ><view class="row"
          ><image src="/static/rewards-active.png" class="icon" /><view
            class="title grow"
            >{{ rewardItem.title }}</view
          ><text class="points">{{ rewardItem.cost }} 颗</text></view
        ><view class="actions"
          ><button
            class="btn"
            :disabled="busy || rewardItem.cost > s.rewards.points"
            @click="redeem(rewardItem)"
          >
            兑换</button
          ><button
            class="btn line"
            :disabled="busy"
            @click="remove(rewardItem)"
          >
            删除</button
          ><text v-if="rewardItem.cost > s.rewards.points" class="muted"
            >还差 {{ rewardItem.cost - s.rewards.points }} 颗</text
          ></view
        ></view
      ><view v-if="!s.rewards.rewards.length" class="empty"
        >写下第一个心愿吧</view
      ></template
    ><button
      v-if="!adding"
      class="btn line"
      :disabled="busy"
      @click="adding = true"
    >
      添加心愿</button
    ><view v-else class="card"
      ><view class="field"
        ><text class="label">想要什么</text
        ><input
          v-model="form.title"
          class="input"
          maxlength="30"
          placeholder="如：按摩十分钟"
          :disabled="busy" /></view
      ><view class="field"
        ><text class="label">糖果价格</text
        ><input
          v-model="form.cost"
          class="input"
          type="number"
          :disabled="busy" /></view
      ><view class="actions"
        ><button class="btn" :loading="busy" :disabled="busy" @click="add">
          保存</button
        ><button class="btn line" :disabled="busy" @click="adding = false">
          取消
        </button></view
      ></view
    ><template v-if="s.rewards"
      ><view class="section">已兑现记录</view
      ><view
        v-for="rewardItem in s.rewards.redemptions.filter(
          (rewardItem) => rewardItem.fulfilled,
        )"
        :key="rewardItem.id"
        class="card"
        ><view class="title">{{ rewardItem.title }}</view
        ><view class="muted"
          >{{ rewardItem.user_name }} ·
          {{ rewardItem.created_at.slice(0, 10) }} ·
          {{ rewardItem.cost }} 颗</view
        ><text class="good">已兑现</text></view
      ><view
        v-if="!s.rewards.redemptions.some((rewardItem) => rewardItem.fulfilled)"
        class="empty"
        >还没有兑现记录</view
      ><view class="muted">展示最近 50 条兑换记录</view></template
    ></view
  >
</template>
