<script setup>
import { ref, reactive, computed } from "vue";
import { Plus } from "lucide-vue-next";
import { useTaskPage } from "../useTaskPage.js";
import TaskInfo from "../components/TaskInfo.vue";
import {
  statusLabels,
  ownerLabel,
} from "../../../shared/task-presentation.mjs";
import { api } from "../api.js";
import { useSession } from "../stores/session.js";

const s = useSession();
const DOW = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

const {
  data,
  loading,
  error,
  busy,
  refresh: load,
  act,
} = useTaskPage("/tasks");
const tasks = computed(() => data.value?.tasks || []);
const archiveOpen = ref(false);
const historyId = ref(null),
  historyRows = ref([]),
  historyLoading = ref(false),
  historyError = ref("");
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
    if (historyId.value === task.id) historyError.value = e.message;
  } finally {
    if (historyId.value === task.id) historyLoading.value = false;
  }
}
const editing = ref(false);
const editingId = ref(null); // null = 新建
const form = reactive({
  title: "",
  points: 1,
  assignee_id: null,
  type: "daily",
  dows: [],
  due_date: "",
});

function openNew() {
  Object.assign(form, {
    title: "",
    points: 1,
    assignee_id: s.user?.id || null,
    type: "daily",
    dows: [],
    due_date: "",
  });
  editingId.value = null;
  editing.value = true;
  error.value = "";
}
function openEdit(t) {
  Object.assign(form, {
    title: t.title,
    points: t.points,
    assignee_id: t.assignee_id,
    type: t.recurrence === "daily" ? "daily" : t.recurrence ? "weekly" : "once",
    dows: t.recurrence?.startsWith("weekly:")
      ? t.recurrence.split(":")[1].split(",").map(Number)
      : [],
    due_date: t.due_date || "",
  });
  editingId.value = t.id;
  editing.value = true;
  error.value = "";
}

function toggleDow(n) {
  const i = form.dows.indexOf(n);
  i >= 0 ? form.dows.splice(i, 1) : form.dows.push(n);
}

async function save() {
  if (!form.title.trim()) {
    error.value = "先写上要做的事吧";
    return;
  }
  if (form.type === "weekly" && !form.dows.length) {
    error.value = "选一下每周哪几天";
    return;
  }
  const body = {
    title: form.title.trim(),
    points: form.points,
    assignee_id: form.assignee_id,
    recurrence:
      form.type === "daily"
        ? "daily"
        : form.type === "weekly"
          ? "weekly:" + [...form.dows].sort().join(",")
          : null,
    due_date: form.type === "once" ? form.due_date || null : null,
  };
  await act(
    async () => {
      if (editingId.value)
        await api(`/tasks/${editingId.value}`, { method: "PATCH", body });
      else await api("/tasks", { method: "POST", body });
    },
    () => (editing.value = false),
  );
}
async function del() {
  await act(async () => {
    if (!confirm("删除这个任务？历史记录会保留")) return;
    await api(`/tasks/${editingId.value}`, { method: "DELETE" });
    editing.value = false;
  });
}

const partner = computed(() => s.partner);

function recurLabel(t) {
  if (!t.recurrence)
    return t.due_date ? "截止 " + t.due_date.replace(/-/g, "/") : "单次";
  if (t.recurrence === "daily") return "每天";
  return (
    "每 " +
    t.recurrence
      .split(":")[1]
      .split(",")
      .map((n) => DOW[n - 1])
      .join("·")
  );
}
</script>

<template>
  <div>
    <h2 class="date-line">任务管理</h2>
    <p class="date-sub">打理我们的家务清单</p>
    <div v-if="error" class="notice">
      {{ error }}
      <button class="btn btn-line sm" :disabled="loading" @click="load">
        刷新重试
      </button>
    </div>
    <p v-else-if="loading" class="execution-note">正在刷新…</p>

    <button
      v-if="!editing"
      class="btn btn-primary"
      style="width: 100%; margin-bottom: 18px"
      @click="openNew"
    >
      <Plus :size="17" /> 新建任务
    </button>

    <!-- 新建 / 编辑表单 -->
    <div v-if="editing" class="card fade-up" style="margin-bottom: 18px">
      <input
        v-model="form.title"
        class="input"
        placeholder="要做什么家务？"
        maxlength="30"
      />
      <div class="form-row">
        <label>糖果</label>
        <div class="stepper">
          <button @click="form.points = Math.max(0, form.points - 1)">−</button>
          <b>{{ form.points }}</b>
          <button @click="form.points = Math.min(99, form.points + 1)">
            +
          </button>
        </div>
      </div>
      <div class="form-row">
        <label>分配</label>
        <div class="chips">
          <button
            :class="{ on: !form.assignee_id }"
            @click="form.assignee_id = null"
          >
            谁都可以做
          </button>
          <button
            v-if="s.user"
            :class="{ on: form.assignee_id === s.user.id }"
            @click="form.assignee_id = s.user.id"
          >
            我
          </button>
          <button
            v-if="partner"
            :class="{ on: form.assignee_id === partner.id }"
            @click="form.assignee_id = partner.id"
          >
            {{ partner.name }}
          </button>
        </div>
      </div>
      <div class="form-row">
        <label>重复</label>
        <div class="chips">
          <button
            :class="{ on: form.type === 'daily' }"
            @click="form.type = 'daily'"
          >
            每天
          </button>
          <button
            :class="{ on: form.type === 'weekly' }"
            @click="form.type = 'weekly'"
          >
            每周
          </button>
          <button
            :class="{ on: form.type === 'once' }"
            @click="form.type = 'once'"
          >
            单次
          </button>
        </div>
      </div>
      <div v-if="form.type === 'weekly'" class="form-row">
        <label>周几</label>
        <div class="chips">
          <button
            v-for="(d, i) in DOW"
            :key="d"
            :class="{ on: form.dows.includes(i + 1) }"
            @click="toggleDow(i + 1)"
          >
            {{ d }}
          </button>
        </div>
      </div>
      <div v-if="form.type === 'once'" class="form-row">
        <label>截止</label>
        <input
          v-model="form.due_date"
          type="date"
          class="input"
          style="flex: 1"
        />
      </div>
      <p v-if="error" class="err" style="margin-top: 10px">{{ error }}</p>
      <div class="form-actions">
        <button class="btn btn-primary" :disabled="busy" @click="save">
          保存
        </button>
        <button class="btn btn-line" @click="editing = false">取消</button>
        <button
          v-if="editingId"
          class="btn danger"
          :disabled="busy"
          @click="del"
        >
          删除
        </button>
      </div>
    </div>

    <template v-if="!editing && data">
      <template
        v-for="group in [
          { name: '周期任务', repeat: true },
          { name: '一次性任务', repeat: false },
        ]"
        :key="group.name"
      >
        <h2 class="sec-title">{{ group.name }}</h2>
        <article
          v-for="task in tasks.filter(
            (t) => !!t.recurrence === group.repeat && !t.done,
          )"
          :key="task.id"
          class="card execution-card"
        >
          <TaskInfo :task="task" :user-id="s.user?.id" />
          <p v-if="task.recurrence || !task.due_date" class="execution-note">{{ recurLabel(task) }}</p>
          <div class="task-buttons">
            <button class="btn btn-line sm" @click="openEdit(task)">编辑</button
            ><button
              class="btn btn-line sm"
              :aria-expanded="historyId === task.id"
              @click="history(task)"
            >
              {{ historyId === task.id ? "收起记录" : "执行记录" }}
            </button>
          </div>
          <div v-if="historyId === task.id" class="history-list">
            <p v-if="historyLoading">正在加载…</p>
            <p v-else-if="historyError">
              {{ historyError }}
              <button
                class="btn btn-line sm"
                @click="
                  historyId = null;
                  history(task);
                "
              >
                重试
              </button>
            </p>
            <template v-else
              ><p
                v-for="record in historyRows"
                :key="record.date_key"
                class="history-row"
              >
                {{ record.date_key }} · {{ statusLabels[record.status]
                }}<br />负责人：{{ ownerLabel(record)
                }}<template v-if="record.user_name">
                  · 打卡人：{{ record.user_name }}</template
                >
              </p>
              <p v-if="!historyRows.length">还没有执行记录</p>
              <p class="execution-note">
                最近 30 次执行；历史归属按执行时保留
              </p></template
            >
          </div>
        </article>
        <p
          v-if="!tasks.some((t) => !!t.recurrence === group.repeat && !t.done)"
          class="group-empty"
        >
          还没有{{ group.name }}
        </p>
      </template>
      <button
        class="archive-toggle"
        :aria-expanded="archiveOpen"
        @click="archiveOpen = !archiveOpen"
      >
        已完成 · {{ tasks.filter((t) => t.done).length }}
        <span>{{ archiveOpen ? "收起" : "展开" }}</span>
      </button>
      <template v-if="archiveOpen"
        ><article
          v-for="task in tasks.filter((t) => t.done)"
          :key="task.id"
          class="card execution-card"
        >
          <TaskInfo :task="task" :user-id="s.user?.id" />
          <div class="task-buttons"><button class="btn btn-line sm" @click="openEdit(task)">编辑</button></div>
        </article>
        <p v-if="!tasks.some((t) => t.done)" class="group-empty">
          还没有已完成的单次任务
        </p></template
      >
    </template>
  </div>
</template>
