export function createId() {
  let s = ''
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 8; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return s
}
