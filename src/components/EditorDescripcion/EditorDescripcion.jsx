import { useEffect, useId, useRef } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { Bold } from '@tiptap/extension-bold'
import { Document } from '@tiptap/extension-document'
import { HardBreak } from '@tiptap/extension-hard-break'
import { Italic } from '@tiptap/extension-italic'
import { BulletList, ListItem, ListKeymap, OrderedList } from '@tiptap/extension-list'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { UndoRedo } from '@tiptap/extensions'
import { Bold as IconoNegrita, Italic as IconoCursiva, List, ListOrdered } from 'lucide-react'
import { aDocumento, aTexto } from '../../services/textoFormateado.js'
import styles from './EditorDescripcion.module.css'

const TECLA = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl+'

// Solo lo que el formato guardado sabe representar: sin títulos, código ni listas anidadas
// (cada ítem es un único párrafo). Lo que se pegue con otro formato queda como texto simple.
const EXTENSIONES = [
  Document,
  Paragraph.configure({ HTMLAttributes: { class: styles.parrafo } }),
  Text,
  Bold.configure({ HTMLAttributes: { class: styles.negrita } }),
  Italic,
  HardBreak,
  BulletList.configure({ HTMLAttributes: { class: styles.lista } }),
  OrderedList.configure({ HTMLAttributes: { class: styles.lista } }),
  ListItem.extend({ content: 'paragraph' }),
  ListKeymap,
  UndoRedo,
]

const BOTONES = [
  { clave: 'negrita', nombre: 'Negrita', atajo: `${TECLA}B`, Icono: IconoNegrita, aplicar: (c) => c.toggleBold() },
  { clave: 'cursiva', nombre: 'Cursiva', atajo: `${TECLA}I`, Icono: IconoCursiva, aplicar: (c) => c.toggleItalic() },
  { clave: 'vinetas', nombre: 'Viñetas', Icono: List, aplicar: (c) => c.toggleBulletList() },
  { clave: 'numerada', nombre: 'Lista numerada', Icono: ListOrdered, aplicar: (c) => c.toggleOrderedList() },
]

/**
 * Campo de descripción con editor visual: negrita, cursiva, viñetas y listas numeradas se ven tal cual
 * mientras se escribe. Hacia afuera entrega texto plano con marcas (**negrita**, *cursiva*, "- ", "1. "),
 * así que el Backend lo guarda sin cambios. También acepta las marcas al escribir ("- " inicia una viñeta).
 */
function EditorDescripcion({ label, value, onChange, disabled = false }) {
  const idLabel = useId()
  // Último texto entregado: si el valor de afuera es otro (se abrió otra geocerca), se recarga el editor
  const ultimo = useRef(value)
  const alCambiar = useRef(onChange)
  useEffect(() => {
    alCambiar.current = onChange
  })

  const editor = useEditor({
    extensions: EXTENSIONES,
    content: aDocumento(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: styles.contenido,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': idLabel,
      },
    },
    onUpdate: ({ editor: e }) => {
      const texto = aTexto(e.getJSON())
      ultimo.current = texto
      alCambiar.current(texto)
    },
  })

  useEffect(() => {
    if (!editor || value === ultimo.current) return
    ultimo.current = value
    editor.commands.setContent(aDocumento(value), { emitUpdate: false })
  }, [editor, value])

  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])

  const activo = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      negrita: e?.isActive('bold') ?? false,
      cursiva: e?.isActive('italic') ?? false,
      vinetas: e?.isActive('bulletList') ?? false,
      numerada: e?.isActive('orderedList') ?? false,
    }),
  })

  return (
    <div className={styles.editorDescripcion}>
      <span id={idLabel} className={styles.label} onClick={() => editor?.commands.focus('end')}>
        {label}
      </span>
      <div className={`${styles.caja} ${disabled ? styles.deshabilitada : ''}`}>
        <div className={styles.barra} role="toolbar" aria-label="Formato de la descripción">
          {BOTONES.map(({ clave, nombre, atajo, Icono, aplicar }) => (
            <button
              key={clave}
              type="button"
              className={`${styles.boton} ${activo?.[clave] ? styles.botonActivo : ''}`}
              aria-label={nombre}
              aria-pressed={activo?.[clave] ?? false}
              title={atajo ? `${nombre} (${atajo})` : nombre}
              disabled={disabled || !editor}
              // Sin esto el editor pierde el foco y la selección antes del clic
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => aplicar(editor.chain().focus()).run()}
            >
              <Icono size={15} />
            </button>
          ))}
        </div>
        <EditorContent editor={editor} className={styles.area} />
      </div>
    </div>
  )
}

export default EditorDescripcion
