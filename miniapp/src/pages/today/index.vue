<script setup>
import { usePage } from "../../usePage.js";
import { api, confirmAction } from "../../api.js";
import { recurrence, assignee } from "../../labels.js";
import Identity from "../../components/Identity.vue";
import PageStatus from "../../components/PageStatus.vue";
const { s, loading, busy, error, load, act } = usePage("today");
const canDo = (t) =>
  (!t.completion || t.completion.status === "rejected") &&
  (!t.assignee_id || t.assignee_id === s.user?.id);
function complete(t) {
  act(() => api("/completions", { method: "POST", body: { task_id: t.id } }));
}
function verdict(c, kind) {
  act(async () => {
    if (kind === "reject" && !(await confirmAction("确定打回这个任务吗？")))
      return;
    await api(`/completions/${c.id}/${kind}`, { method: "POST" });
  });
}
</script>
<template>
  <view class="page"
    ><Identity /><view class="heading">今天也一起加油</view
    ><view class="sub"
      >{{ s.today?.date }} · 今天 {{ s.today?.tasks.length || 0 }} 项任务</view
    ><PageStatus :loading="loading" :error="error" @retry="load" /><template
      v-if="s.today"
      ><view v-if="s.today.pending_confirm.length" class="section"
        >待我确认 · {{ s.today.pending_confirm.length }}</view
      ><view
        v-for="completionItem in s.today.pending_confirm"
        :key="completionItem.id"
        class="card"
        ><view class="title"
          >{{ completionItem.user_name }} 完成了「{{
            completionItem.title
          }}」</view
        ><view class="muted"
          >{{ completionItem.date_key }} ·
          <text class="points">+{{ completionItem.points }} 颗糖果</text></view
        ><view class="actions"
          ><button
            class="btn"
            :disabled="busy"
            @click="verdict(completionItem, 'confirm')"
          >
            确认</button
          ><button
            class="btn line"
            :disabled="busy"
            @click="verdict(completionItem, 'reject')"
          >
            打回
          </button></view
        ></view
      ><view class="section">今日任务</view
      ><view v-for="taskItem in s.today.tasks" :key="taskItem.id" class="card"
        ><view class="row"
          ><view class="title grow">{{ taskItem.title }}</view
          ><text class="points">+{{ taskItem.points }} 颗</text></view
        ><view
          ><text class="tag">{{ assignee(taskItem, s) }}</text
          ><text class="tag">{{ recurrence(taskItem) }}</text
          ><text v-if="taskItem.overdue" class="tag warn">已逾期</text></view
        ><view class="actions"
          ><text v-if="taskItem.completion?.status === 'confirmed'" class="good"
            >已完成</text
          ><text
            v-else-if="taskItem.completion?.status === 'pending'"
            class="muted"
            >已打卡，等对方确认</text
          ><template v-else
            ><text
              v-if="taskItem.completion?.status === 'rejected'"
              class="warn"
              >被打回了，再试一次</text
            ><button
              v-if="canDo(taskItem)"
              class="btn"
              :disabled="busy"
              @click="complete(taskItem)"
            >
              完成打卡</button
            ><text v-else class="muted">等对方完成</text></template
          ></view
        ></view
      ><view v-if="!s.today.tasks.length" class="empty"
        ><image class="logo" src="/static/logo.png" /><view
          >今天没有任务，好好休息</view
        ></view
      ></template
    ></view
  >
</template>
