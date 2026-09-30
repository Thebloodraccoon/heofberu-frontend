import { afterEach, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { insertGmBlock } from '@/features/articles/insertGmBlock.js'

let editor
const createEditor = (content) => {
  editor = new Editor({ extensions: [StarterKit], content })
  return editor
}
afterEach(() => editor?.destroy())

describe('insertGmBlock', () => {
  it('wraps selected text, preserves formatting and surrounding text, and supports undo', () => {
    createEditor('<p>Before <strong>secret</strong> after</p>')
    const original = editor.getJSON()
    editor.commands.setTextSelection({ from: 8, to: 14 })
    insertGmBlock(editor)
    const nodes = editor.getJSON().content
    expect(nodes.map((node) => node.content?.map((part) => part.text).join(''))).toEqual([
      'Before ', ':::gm', 'secret', ':::', ' after',
    ])
    expect(nodes[2].content[0].marks).toEqual([{ type: 'bold' }])
    expect(editor.getText()).not.toContain('Тайна для мастера…')
    editor.commands.undo()
    expect(editor.getJSON()).toEqual(original)
  })

  it('preserves multiple selected paragraphs and their formatting', () => {
    createEditor('<p>First</p><p><em>Second</em></p>')
    const original = editor.getJSON().content
    editor.commands.selectAll()
    insertGmBlock(editor)
    expect(editor.getJSON().content.slice(1, -1)).toEqual(original)
  })

  it('inserts the placeholder when there is no selection', () => {
    createEditor('<p></p>')
    insertGmBlock(editor)
    expect(editor.getText()).toContain(':::gm')
    expect(editor.getText()).toContain('Тайна для мастера…')
    expect(editor.getJSON().content.at(-1).content[0].text).toBe(':::')
  })
})
