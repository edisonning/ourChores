<script setup>
import { ref, computed } from "vue";
import { api } from "../api.js";
import { useSession } from "../stores/session.js";
import { useTaskPage } from "../useTaskPage.js";
import { ownerGroups } from "../../../shared/task-presentation.mjs";
import TaskInfo from "../components/TaskInfo.vue";
const s = useSession(),
  expanded = ref(false);
const { data, error, loading, busy, refresh, act } = useTaskPage("/today");
const groups = computed(() =>
  ownerGroups(
    (data.value?.tasks || []).filter((t) => t.status !== "confirmed"),
    data.value?.users || [],
    s.user?.id,
  ),
);
const earlierMine = computed(() =>
  (data.value?.pending_mine || []).filter(
    (c) => c.date_key !== data.value?.date,
  ),
);
const canDo = (t) =>
  ["todo", "rejected"].includes(t.status) &&
  (!t.assignee_id || t.assignee_id === s.user?.id);
const complete = (t) =>
  act(() => api("/completions", { method: "POST", body: { task_id: t.id } }));
function verdict(c, kind) {
  act(async () => {
    if (kind === "reject" && !confirm("确定打回这个任务吗？")) return;
    await api(`/completions/${c.id}/${kind}`, { method: "POST" });
  });
}
</script>
<template>
  <div>
    <h2 class="date-line">今天也一起加油</h2>
    <p class="date-sub">
      {{ data?.date }} · 今日安排 {{ data?.tasks.length || 0 }} 项
    </p>
    <div v-if="error" class="notice">
      {{ error }}
      <button class="btn btn-line sm" :disabled="loading" @click="refresh">
        刷新重试
      </button>
    </div>
    <p v-else-if="loading" class="execution-note">正在刷新…</p>
    <template v-if="data">
      <section v-if="data.pending_confirm.length">
        <h2 class="sec-title">待我确认 · {{ data.pending_confirm.length }}</h2>
        <article
          v-for="record in data.pending_confirm"
          :key="record.id"
          class="card execution-card"
        >
          <h3>{{ record.user_name }}完成了「{{ record.title }}」</h3>
          <p class="execution-note">
            {{ record.date_key }} · +{{ record.points }} 颗糖果
          </p>
          <div class="task-buttons">
            <button
              class="btn btn-primary sm"
              :disabled="busy"
              @click="verdict(record, 'confirm')"
            >
              确认</button
            ><button
              class="btn btn-line sm"
              :disabled="busy"
              @click="verdict(record, 'reject')"
            >
              打回
            </button>
          </div>
        </article>
      </section>
      <section v-if="earlierMine.length">
        <h2 class="sec-title">之前的打卡 · 等对方确认</h2>
        <article
          v-for="record in earlierMine"
          :key="record.id"
          class="card execution-card"
        >
          <h3>{{ record.title }}</h3>
          <p class="execution-note">
            {{ record.user_name }} · {{ record.date_key }} · 待确认
          </p>
        </article>
      </section>
      <section v-for="group in groups" :key="group.id">
        <h2 class="sec-title" :class="'owner-text-' + group.id">
          {{ group.name }} · {{ group.tasks.length }}
        </h2>
        <article
          v-for="task in group.tasks"
          :key="task.id"
          class="card execution-card"
        >
          <TaskInfo :task="task" :user-id="s.user?.id" />
          <div v-if="canDo(task)" class="task-buttons">
            <button
              class="btn btn-primary sm"
              :disabled="busy"
              @click="complete(task)"
            >
              {{ task.status === "rejected" ? "重新打卡" : "完成打卡" }}
            </button>
          </div>
        </article>
        <p v-if="!group.tasks.length" class="group-empty">
          这一组没有待处理任务
        </p>
      </section>
      <button
        class="archive-toggle"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        已完成 · {{ data.completed?.length || 0 }}
        <span>{{ expanded ? "收起" : "展开" }}</span>
      </button>
      <div v-if="expanded">
        <article
          v-for="task in data.completed"
          :key="task.completion.id"
          class="card execution-card"
        >
          <TaskInfo :task="task" :user-id="s.user?.id" />
        </article>
        <p v-if="!data.completed?.length" class="group-empty">
          今天还没有确认完成的任务
        </p>
      </div>
    </template>
  </div>
</template>
