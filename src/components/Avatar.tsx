import { api } from '../api.ts'
import { useAsyncMemo } from '../hooks/useAsyncMemo.ts'
import { cacheBust } from '../state.ts'

export const Avatar = (
  { userId, fallback = null, size = 16 }: { userId: string; fallback: preact.ComponentChildren; size?: number },
) => {
  const image = useAsyncMemo(async () => {
    const data = await api.fetchAvatar(userId, cacheBust.value)
    if (!data) return null
    return new Blob([data], { type: 'image/jpeg' })
  }, [cacheBust.value])

  return (
    image.value
      ? <img src={URL.createObjectURL(image.value)} class={`rounded-full w-[${size}px] h-[${size}px]`} alt="Avatar" />
      : fallback
  )
}
