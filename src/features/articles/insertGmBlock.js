import { GM_BLOCK_CLOSE, GM_BLOCK_OPEN } from './secrets.js'

export function insertGmBlock(editor) {
  const { selection } = editor.state
  const paragraph = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
  const content = selection.empty
    ? [paragraph('Тайна для мастера…')]
    : selection.content().content.toJSON()

  return editor.chain().focus().insertContent([
    paragraph(GM_BLOCK_OPEN),
    ...content,
    paragraph(GM_BLOCK_CLOSE),
  ]).run()
}
