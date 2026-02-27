export function midiToNoteString(midi: number): string {
  const notes = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b']
  const octave = Math.floor(midi / 12)
  const note = notes[midi % 12]
  return `${note}${octave - 1}`
}
