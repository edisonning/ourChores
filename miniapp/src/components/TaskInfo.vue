<script setup>
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
  <view>
    <view class="row"
      ><view class="title grow">{{ task.title }}</view
      ><text class="points"
        >{{
          task.status === "rejected"
            ? task.points
            : (task.completion?.points ?? task.points)
        }}
        颗</text
      ></view
    >
    <view
      ><text class="tag" :class="roleClass(task)">{{ ownerLabel(task) }}</text
      ><text class="tag" :class="'state-' + task.status">{{
        stateLabel(task)
      }}</text
      ><text v-if="task.overdue" class="tag warn">已逾期</text></view
    >
    <view v-if="task.completion" class="execution-note">{{
      actorLine(task, userId)
    }}</view>
    <view v-if="task.status === 'confirmed'" class="execution-note">{{
      completionDate(task)
    }}</view>
    <view v-else-if="task.completion" class="execution-note"
      >打卡日期：{{ task.completion.date_key }}</view
    >
    <view
      v-if="!task.recurrence && task.due_date && task.status !== 'confirmed'"
      class="execution-note"
      >截止 {{ task.due_date }}</view
    >
  </view>
</template>
