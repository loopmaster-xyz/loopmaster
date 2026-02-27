export async function resizeImageToJpeg(file: File, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      const aspectRatio = img.width / img.height
      let sourceX = 0
      let sourceY = 0
      let sourceWidth = img.width
      let sourceHeight = img.height

      if (aspectRatio > 1) {
        sourceWidth = img.height
        sourceX = (img.width - img.height) / 2
      }
      else if (aspectRatio < 1) {
        sourceHeight = img.width
        sourceY = (img.height - img.width) / 2
      }

      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size)

      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob)
          }
          else {
            reject(new Error('Failed to create blob'))
          }
        },
        'image/jpeg',
        0.9,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}
