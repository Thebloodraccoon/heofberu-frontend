import { Extension } from '@tiptap/core'

const STEP_EM = 1.5
const MAX_LEVEL = 8

// Официального расширения отступов в Tiptap нет — храним уровень как margin-left
// на параграфах/заголовках/элементах списка и двигаем его командами indent/outdent.
export const Indent = Extension.create({
  name: 'indent',

  addOptions() {
    return { types: ['paragraph', 'heading', 'listItem'] }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => {
              const em = parseFloat(el.style.marginLeft || '0')
              return em > 0 ? Math.round(em / STEP_EM) : 0
            },
            renderHTML: (attrs) =>
              attrs.indent > 0 ? { style: `margin-left: ${attrs.indent * STEP_EM}em` } : {},
          },
        },
      },
    ]
  },

  addCommands() {
    const shift = (delta) => () => ({ tr, state, dispatch }) => {
      const { types } = this.options
      let changed = false
      state.doc.nodesBetween(state.selection.from, state.selection.to, (node, pos) => {
        if (!types.includes(node.type.name)) return
        const current = node.attrs.indent ?? 0
        const next = Math.min(MAX_LEVEL, Math.max(0, current + delta))
        if (next !== current) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next })
          changed = true
        }
      })
      if (changed && dispatch) dispatch(tr)
      return changed
    }
    return {
      indent: shift(1),
      outdent: shift(-1),
    }
  },
})

export default Indent
