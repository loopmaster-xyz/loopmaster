const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function newId(len = 6): string {
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < len; i++) {
    out += alphabet[bytes[i]! % alphabet.length]!
  }
  return out
}
