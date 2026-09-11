<script setup>
import { Candy } from "lucide-vue-next";
import {
  ownerLabel,
  roleClass,
  stateLabel,
  actorLine,
  completionDate,
} from "../../../shared/task-presentation.mjs";
defineProps({ task: Object, userId: Number });
</script>
<template>
  <div class="task-title-row">
    <h3>{{ task.title }}</h3>
    <span class="pts-badge"
      ><Candy :size="14" />
      {{
        task.status === "rejected"
          ? task.points
          : (task.completion?.points ?? task.points)
      }}</span
    >
  </div>
  <div class="task-meta">
    <span class="tag" :class="roleClass(task)">{{ ownerLabel(task) }}</span
    ><span class="tag" :class="'state-' + task.status">{{
      stateLabel(task)
    }}</span
    ><span v-if="task.overdue" class="tag warn">已逾期</span>
  </div>
  <p v-if="task.completion" class="execution-note">
    {{ actorLine(task, userId) }}
  </p>
  <p v-if="task.status === 'confirmed'" class="execution-note">
    {{ completionDate(task) }}
  </p>
  <p v-else-if="task.completion" class="execution-note">
    打卡日期：{{ task.completion.date_key }}
  </p>
  <p
    v-if="!task.recurrence && task.due_date && task.status !== 'confirmed'"
    class="execution-note"
  >
    截止 {{ task.due_date }}
  </p>
</template>
