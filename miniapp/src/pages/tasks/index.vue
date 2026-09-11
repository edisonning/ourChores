<script setup>
import { ref, reactive } from "vue";
import { usePage } from "../../usePage.js";
import { api, confirmAction } from "../../api.js";
import { DOW, recurrence, assignee } from "../../labels.js";
import {
  statusLabels,
  ownerLabel,
} from "../../../../shared/task-presentation.mjs";
import TaskInfo from "../../components/TaskInfo.vue";
import Identity from "../../components/Identity.vue";
import PageStatus from "../../components/PageStatus.vue";
const defaults = () => ({
  title: "",
  points: 1,
  assignee_id: null,
  type: "daily",
  dows: [],
  due_date: "",
});
const archiveOpen = ref(false),
  historyId = ref(null),
  historyRows = ref([]),
  historyLoading = ref(false),
  historyError = ref("");
const editing = ref(false),
  editingId = ref(null),
  form = reactive(defaults());
const { s, loading, busy, error, load, act } = usePage(
  "tasks",
  undefined,
  () => {
    archiveOpen.value = false;
    historyId.value = null;
    historyRows.value = [];
    editing.value = false;
    editingId.value = null;
    Object.assign(form, defaults());
  },
);
function edit(t) {
  error.value = "";
  editingId.value = t?.id || null;
  Object.assign(
    form,
    t
      ? {
          title: t.title,
          points: t.points,
          assignee_id: t.assignee_id,
          type:
            t.recurrence === "daily"
              ? "daily"
              : t.recurrence
                ? "weekly"
                : "once",
          dows: t.recurrence?.startsWith("weekly:")
            ? t.recurrence.split(":")[1].split(",").map(Number)
            : [],
          due_date: t.due_date || "",
        }
      : { ...defaults(), assignee_id: s.user?.id || null },
  );
  editing.value = true;
}
function toggle(n) {
  form.dows = form.dows.includes(n)
    ? form.dows.filter((d) => d !== n)
    : [...form.dows, n];
}
function save() {
  if (!form.title.trim()) {
    error.value = "先写上要做的事吧";
    return;
  }
  if (!Number.isInteger(Number(form.points)) || Number(form.points) < 0) {
    error.value = "糖果需为非负整数";
    return;
  }
  if (form.type === "weekly" && !form.dows.length) {
    error.value = "选一下每周哪几天";
    return;
  }
  const body = {
    title: form.title.trim(),
    points: Number(form.points),
    assignee_id: form.assignee_id,
    recurrence:
      form.type === "daily"
        ? "daily"
        : form.type === "weekly"
          ? "weekly:" + [...form.dows].sort().join(",")
          : null,
    due_date: form.type === "once" ? form.due_date || null : null,
  };
  act(
    () =>
      api(editingId.value ? `/tasks/${editingId.value}` : "/tasks", {
        method: editingId.value ? "PUT" : "POST",
        body,
      }),
    () => (editing.value = false),
  );
}
function remove() {
  act(async () => {
    if (!(await confirmAction("删除这个任务？历史记录会保留"))) return;
    await api(`/tasks/${editingId.value}`, { method: "DELETE" });
    editing.value = false;
  });
}
async function history(task) {
  if (historyId.value === task.id) {
    historyId.value = null;
    return;
  }
  historyId.value = task.id;
  historyRows.value = [];
  historyLoading.value = true;
  historyError.value = "";
  try {
    const result = await api(`/tasks/${task.id}/history`);
    if (historyId.value === task.id) historyRows.value = result.records;
  } catch (e) {
    if (!e.stale && historyId.value === task.id) historyError.value = e.message;
  } finally {
    if (historyId.value === task.id) historyLoading.value = false;
  }
}
</script>
<template>
  <view class="page"
    ><Identity /><view class="heading">任务管理</view
    ><view class="sub">打理我们的家务清单</view
    ><PageStatus :loading="loading" :error="error" @retry="load" /><button
      v-if="!editing"
      class="btn"
      @click="edit(null)"
    >
      新建任务</button
    ><view v-else class="card"
      ><view class="section">{{ editingId ? "编辑任务" : "新建任务" }}</view
      ><view class="field"
        ><text class="label">要做的家务</text
        ><input
          v-model="form.title"
          class="input"
          placeholder="要做什么家务？"
          maxlength="30"
          :disabled="busy" /></view
      ><view class="field"
        ><text class="label">糖果</text
        ><input
          v-model="form.points"
          class="input"
          type="number"
          :disabled="busy" /></view
      ><view class="field"
        ><text class="label">分配给谁</text
        ><view class="chips"
          ><button
            class="btn"
            :class="{ on: !form.assignee_id }"
            :disabled="busy"
            @click="form.assignee_id = null"
          >
            谁都可以做</button
          ><button
            v-for="memberItem in s.users"
            :key="memberItem.id"
            class="btn"
            :class="{ on: form.assignee_id === memberItem.id }"
            :disabled="busy"
            @click="form.assignee_id = memberItem.id"
          >
            {{ memberItem.name }}
          </button></view
        ></view
      ><view class="field"
        ><text class="label">重复</text
        ><view class="chips"
          ><button
            v-for="recurrenceOption in [
              { id: 'daily', name: '每天' },
              { id: 'weekly', name: '每周' },
              { id: 'once', name: '单次' },
            ]"
            :key="recurrenceOption.id"
            class="btn"
            :class="{ on: form.type === recurrenceOption.id }"
            :disabled="busy"
            @click="form.type = recurrenceOption.id"
          >
            {{ recurrenceOption.name }}
          </button></view
        ></view
      ><view v-if="form.type === 'weekly'" class="field chips"
        ><button
          v-for="(dayLabel, dayIndex) in DOW"
          :key="dayLabel"
          class="btn"
          :class="{ on: form.dows.includes(dayIndex + 1) }"
          :disabled="busy"
          @click="toggle(dayIndex + 1)"
        >
          {{ dayLabel }}
        </button></view
      ><view v-if="form.type === 'once'" class="field"
        ><text class="label">截止日期（可不设）</text
        ><picker
          mode="date"
          :value="form.due_date"
          :disabled="busy"
          @change="form.due_date = $event.detail.value"
          ><view class="picker">{{ form.due_date || "选择日期" }}</view></picker
        ><button
          v-if="form.due_date"
          class="btn line"
          :disabled="busy"
          @click="form.due_date = ''"
        >
          清除日期
        </button></view
      ><view class="actions"
        ><button class="btn" :disabled="busy" :loading="busy" @click="save">
          保存</button
        ><button class="btn line" :disabled="busy" @click="editing = false">
          取消</button
        ><button
          v-if="editingId"
          class="btn danger"
          :disabled="busy"
          @click="remove"
        >
          删除
        </button></view
      ></view
    >
    <template v-if="!editing && s.tasks">
      <view
        v-for="group in [
          { name: '周期任务', repeat: true },
          { name: '一次性任务', repeat: false },
        ]"
        :key="group.name"
      >
        <view class="section">{{ group.name }}</view>
        <view
          v-for="taskItem in s.tasks.tasks.filter(
            (taskItem) =>
              !!taskItem.recurrence === group.repeat && !taskItem.done,
          )"
          :key="taskItem.id"
          class="card"
        >
          <TaskInfo :task="taskItem" :user-id="s.user?.id" /><view
            class="execution-note"
            >{{ recurrence(taskItem) }}</view
          >
          <view class="actions"
            ><button class="btn line" @click="edit(taskItem)">编辑</button
            ><button class="btn line" @click="history(taskItem)">
              {{ historyId === taskItem.id ? "收起记录" : "执行记录" }}
            </button></view
          >
          <view v-if="historyId === taskItem.id" class="history-list"
            ><view v-if="historyLoading">正在加载…</view
            ><view v-else-if="historyError"
              >{{ historyError
              }}<button
                class="btn line"
                @click="
                  historyId = null;
                  history(taskItem);
                "
              >
                重试
              </button></view
            ><template v-else
              ><view
                v-for="record in historyRows"
                :key="record.date_key"
                class="history-row"
                ><view
                  >{{ record.date_key }} ·
                  {{ statusLabels[record.status] }}</view
                ><view
                  >负责人：{{ ownerLabel(record)
                  }}<text v-if="record.user_name">
                    · 打卡人：{{ record.user_name }}</text
                  ></view
                ></view
              ><view v-if="!historyRows.length">还没有执行记录</view
              ><view class="execution-note"
                >最近 30 次执行；历史归属按执行时保留</view
              ></template
            ></view
          >
        </view>
        <view
          v-if="
            !s.tasks.tasks.some(
              (taskItem) =>
                !!taskItem.recurrence === group.repeat && !taskItem.done,
            )
          "
          class="group-empty"
          >还没有{{ group.name }}</view
        >
      </view>
      <button class="archive-toggle" @click="archiveOpen = !archiveOpen">
        已完成 · {{ s.tasks.tasks.filter((taskItem) => taskItem.done).length }}
        <text>{{ archiveOpen ? "收起" : "展开" }}</text>
      </button>
      <view v-if="archiveOpen"
        ><view
          v-for="taskItem in s.tasks.tasks.filter((taskItem) => taskItem.done)"
          :key="taskItem.id"
          class="card"
          ><TaskInfo :task="taskItem" :user-id="s.user?.id" /><view class="actions"><button class="btn line" @click="edit(taskItem)">编辑</button></view></view
        ><view
          v-if="!s.tasks.tasks.some((taskItem) => taskItem.done)"
          class="group-empty"
          >还没有已完成的单次任务</view
        ></view
      >
    </template>
  </view>
</template>
