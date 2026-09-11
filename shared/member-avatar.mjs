// Avatar captions are separate from the household role names stored in the API.
export function memberAvatar(userId, name = '') {
  return ({ 1: '阿波', 2: '阿群' })[userId] || name.slice(0, 1)
}
