<script setup>
import { ref, computed } from "vue";
import { usePage } from "../../usePage.js";
import { api, confirmAction } from "../../api.js";
import { ownerGroups } from "../../../../shared/task-presentation.mjs";
import Identity from "../../components/Identity.vue";
import PageStatus from "../../components/PageStatus.vue";
import TaskInfo from "../../components/TaskInfo.vue";
const expanded = ref(false);
const { s, loading, busy, error, load, act } = usePage(
  "today",
  undefined,
  () => (expanded.value = false),
);
const groups = computed(() =>
  ownerGroups(
    (s.today?.tasks || []).filter((task) => task.status !== "confirmed"),
    s.users,
    s.user?.id,
  ),
);
const earlierMine = computed(() =>
  (s.today?.pending_mine || []).filter(
    (record) => record.date_key !== s.today?.date,
  ),
);
const canDo = (task) =>
  ["todo", "rejected"].includes(task.status) &&
  (!task.assignee_id || task.assignee_id === s.user?.id);
const complete = (task) =>
  act(() =>
    api("/completions", { method: "POST", body: { task_id: task.id } }),
  );
function verdict(record, kind) {
  act(async () => {
    if (kind === "reject" && !(await confirmAction("确定打回这个任务吗？")))
      return;
    await api(`/completions/${record.id}/${kind}`, { method: "POST" });
  });
}
</script>
<template>
  <view class="page">
    <Identity /><view class="heading">今天也一起加油</view
    ><view class="sub"
      >{{ s.today?.date }} · 今日安排 {{ s.today?.tasks.length || 0 }} 项</view
    >
    <PageStatus :loading="loading" :error="error" @retry="load" />
    <template v-if="s.today">
      <view v-if="s.today.pending_confirm.length" class="section"
        >待我确认 · {{ s.today.pending_confirm.length }}</view
      >
      <view
        v-for="record in s.today.pending_confirm"
        :key="record.id"
        class="card"
        ><view class="title"
          >{{ record.user_name }}完成了「{{ record.title }}」</view
        ><view class="execution-note"
          >{{ record.date_key }} · +{{ record.points }} 颗糖果</view
        ><view class="actions"
          ><button
            class="btn"
            :disabled="busy"
            @click="verdict(record, 'confirm')"
          >
            确认</button
          ><button
            class="btn line"
            :disabled="busy"
            @click="verdict(record, 'reject')"
          >
            打回
          </button></view
        ></view
      >
      <view v-if="earlierMine.length" class="section"
        >之前的打卡 · 等对方确认</view
      ><view v-for="record in earlierMine" :key="record.id" class="card"
        ><view class="title">{{ record.title }}</view
        ><view class="execution-note"
          >{{ record.user_name }} · {{ record.date_key }} · 待确认</view
        ></view
      >
      <view v-for="group in groups" :key="group.id"
        ><view class="section" :class="'owner-text-' + group.id"
          >{{ group.name }} · {{ group.tasks.length }}</view
        ><view v-for="taskItem in group.tasks" :key="taskItem.id" class="card"
          ><TaskInfo :task="taskItem" :user-id="s.user?.id" /><view
            v-if="canDo(taskItem)"
            class="actions"
            ><button class="btn" :disabled="busy" @click="complete(taskItem)">
              {{ taskItem.status === "rejected" ? "重新打卡" : "完成打卡" }}
            </button></view
          ></view
        ><view v-if="!group.tasks.length" class="group-empty"
          >这一组没有待处理任务</view
        ></view
      >
      <button class="archive-toggle" @click="expanded = !expanded">
        已完成 · {{ s.today.completed?.length || 0 }}
        <text>{{ expanded ? "收起" : "展开" }}</text>
      </button>
      <view v-if="expanded"
        ><view
          v-for="taskItem in s.today.completed"
          :key="taskItem.completion.id"
          class="card"
          ><TaskInfo :task="taskItem" :user-id="s.user?.id" /></view
        ><view v-if="!s.today.completed?.length" class="group-empty"
          >今天还没有确认完成的任务</view
        ></view
      >
    </template>
  </view>
</template>
