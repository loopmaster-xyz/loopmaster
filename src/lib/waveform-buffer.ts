import type { Ring } from 'utils/ring'

export class WaveformBuffer {
  private buffer: Float32Array
  private writeIdx = 0
  private readChunkPtr = 0
  private initialized = false
  private cachedDisplayBuffer: Float32Array | null = null
  private cachedWriteIdx = -1
  private out = new Float32Array(8192)

  constructor(size: number = 32768) {
    this.buffer = new Float32Array(size)
  }

  update(ring: Ring, currentChunkPos: number): Float32Array | null {
    if (!ring) return null

    const ringLength = ring.length
    const safetyLagChunks = 4
    const targetBufferChunks = 16
    const maxReadChunks = 7

    if (!this.initialized) {
      this.readChunkPtr = (currentChunkPos - safetyLagChunks + ringLength) % ringLength
      this.initialized = true
      return null
    }

    let distance = currentChunkPos - this.readChunkPtr
    if (distance < 0) {
      distance = ringLength - this.readChunkPtr + currentChunkPos
    }
    const availableChunks = distance - safetyLagChunks

    if (availableChunks > 0) {
      const bufferLevel = availableChunks
      let chunksToRead = 0

      if (bufferLevel < targetBufferChunks) {
        chunksToRead = Math.min(availableChunks, Math.ceil((targetBufferChunks - bufferLevel) / 2))
      }
      else {
        chunksToRead = Math.min(availableChunks - targetBufferChunks, maxReadChunks)
      }

      if (chunksToRead > 0) {
        for (let c = 0; c < chunksToRead; c++) {
          const chunkIdx = (this.readChunkPtr + c) % ringLength
          const chunk = ring[chunkIdx]
          const remaining = this.buffer.length - this.writeIdx
          if (remaining >= ring[0].length) {
            this.buffer.set(chunk, this.writeIdx)
            this.writeIdx = (this.writeIdx + ring[0].length) % this.buffer.length
          }
          else {
            this.buffer.set(chunk.subarray(0, remaining), this.writeIdx)
            this.buffer.set(chunk.subarray(remaining), 0)
            this.writeIdx = ring[0].length - remaining
          }
        }
        this.readChunkPtr = (this.readChunkPtr + chunksToRead) % ringLength
        this.cachedDisplayBuffer = null
      }
    }

    return this.getDisplayBuffer()
  }

  private getDisplayBuffer(): Float32Array {
    if (this.cachedDisplayBuffer && this.cachedWriteIdx === this.writeIdx) {
      return this.cachedDisplayBuffer
    }

    const samplesToRead = this.out.length
    const readIdx = (this.writeIdx - samplesToRead + this.buffer.length) % this.buffer.length

    if (readIdx + samplesToRead <= this.buffer.length) {
      this.out.set(this.buffer.subarray(readIdx, readIdx + samplesToRead))
    }
    else {
      const firstPart = this.buffer.length - readIdx
      this.out.set(this.buffer.subarray(readIdx), 0)
      this.out.set(this.buffer.subarray(0, samplesToRead - firstPart), firstPart)
    }

    this.cachedDisplayBuffer = this.out
    this.cachedWriteIdx = this.writeIdx
    return this.out
  }

  reset() {
    this.initialized = false
    this.readChunkPtr = 0
    this.writeIdx = 0
  }
}
