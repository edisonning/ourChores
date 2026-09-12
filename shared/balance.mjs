// 两端共享称重口径：本期已确认积分，绝不使用可消费的余额。
export function householdBalance(users = [], period = 'week') {
  const members = [...users].sort((a, b) => a.id - b.id).slice(0, 2)
  const [left, right] = members
  const total = (left?.points ?? 0) + (right?.points ?? 0)
  const delta = (right?.points ?? 0) - (left?.points ?? 0)
  const ready = members.length === 2
  const empty = ready && total === 0 && members.every(u => u.completed === 0)
  const prefix = period === 'month' ? '这个月' : '这周'
  const more = delta < 0 ? left : right
  return {
    members,
    ready,
    // CSS 正角度让右侧下沉；双方占比差为 100% 时达到最大角度。
    angle: ready && total > 0 ? 18 * delta / total : 0,
    difference: Math.abs(delta),
    message: !ready ? '等待两位成员一起加入' : empty ? '还没有记录，一起开始吧'
      : delta === 0 ? `${prefix}，两个人的付出一样多`
        : `${prefix}${more.name}多分担了一些`,
    detail: !ready ? '两位成员加入后，就能看见家务分担。' : empty ? '完成家务，经对方确认后，就会记在这里。'
      : `本期已确认的家务积分相差 ${Math.abs(delta)} 颗糖果`,
  }
}
