<script setup>
import { ref, reactive } from "vue";
import { usePage } from "../../usePage.js";
import { api, confirmAction } from "../../api.js";
import { DOW, recurrence, assignee } from "../../labels.js";
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
const editing = ref(false),
  editingId = ref(null),
  form = reactive(defaults());
const { s, loading, busy, error, load, act } = usePage(
  "tasks",
  undefined,
  () => {
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
      : defaults(),
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
            都行</button
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
    ><template v-if="!editing && s.tasks"
      ><template
        v-for="group in [
          { name: '周期任务', repeat: true },
          { name: '一次性任务', repeat: false },
        ]"
        :key="group.name"
        ><view class="section">{{ group.name }}</view
        ><view
          v-for="taskItem in s.tasks.tasks.filter(
            (taskItem) => !!taskItem.recurrence === group.repeat,
          )"
          :key="taskItem.id"
          class="card"
          ><view class="row"
            ><view class="title grow">{{ taskItem.title }}</view
            ><text class="points">{{ taskItem.points }} 颗</text></view
          ><text class="tag">{{ assignee(taskItem, s) }}</text
          ><text class="tag">{{ recurrence(taskItem) }}</text
          ><text v-if="taskItem.done" class="tag good">已打卡</text
          ><view class="actions"
            ><button class="btn line" @click="edit(taskItem)">
              编辑
            </button></view
          ></view
        ><view
          v-if="
            !s.tasks.tasks.some(
              (taskItem) => !!taskItem.recurrence === group.repeat,
            )
          "
          class="empty"
          >还没有{{ group.name }}</view
        ></template
      ></template
    ></view
  >
</template>
