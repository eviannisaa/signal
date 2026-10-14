import { defineMessages } from '#/lib/i18n'

/** Teks Morse Explorer dan pemilih huruf. */
export const explorerMessages = defineMessages({
  id: {
    pickLetter: 'Pilih huruf',
    letterCount: (n: number) => `${n} huruf`,
    keyboardHintBefore: 'Gunakan tombol panah',
    keyboardHintAfter: 'untuk berpindah huruf dengan keyboard.',
    arrows: { left: 'kiri', right: 'kanan', up: 'atas', down: 'bawah' },
    arrowLabel: (dir: string) => `Panah ${dir}`,
    pickerLabel: 'Pilih huruf A–Z',
  },
  en: {
    pickLetter: 'Pick a letter',
    letterCount: (n: number) => `${n} letters`,
    keyboardHintBefore: 'Use the arrow keys',
    keyboardHintAfter: 'to move between letters with the keyboard.',
    arrows: { left: 'left', right: 'right', up: 'up', down: 'down' },
    arrowLabel: (dir: string) => `${dir.charAt(0).toUpperCase()}${dir.slice(1)} arrow`,
    pickerLabel: 'Pick a letter A–Z',
  },
})
