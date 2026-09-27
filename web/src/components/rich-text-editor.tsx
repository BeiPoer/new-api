import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { Bold, Code, Heading1, Heading2, Heading3, Italic, Link as LinkIcon, List, ListOrdered, Quote, Redo2, RemoveFormatting, Undo2, Underline as UnderlineIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type RichTextEditorProps = { value: string; onChange: (value: string) => void; className?: string }

export function RichTextEditor(props: RichTextEditorProps) {
  const { t } = useTranslation()
  const editor = useEditor({
    extensions: [StarterKit, Underline, Link.configure({ autolink: true, openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } })],
    content: props.value,
    editorProps: { attributes: { class: 'prose prose-sm dark:prose-invert min-h-64 max-w-none px-4 py-3 outline-none' } },
    onUpdate: ({ editor: nextEditor }) => props.onChange(nextEditor.getHTML()),
  })

  useEffect(() => {
    if (editor && props.value !== editor.getHTML()) editor.commands.setContent(props.value, { emitUpdate: false })
  }, [editor, props.value])

  if (!editor) return null

  const button = (label: string, icon: React.ReactNode, action: () => void, active = false) => (
    <Button type='button' variant='ghost' size='icon-xs' title={label} aria-label={label} aria-pressed={active} onClick={action}>{icon}</Button>
  )
  const setLink = () => {
    const existing = editor.getAttributes('link').href as string | undefined
    const url = window.prompt(t('Enter link URL'), existing ?? '')?.trim()
    if (url) editor.chain().focus().setLink({ href: url }).run()
    else if (existing) editor.chain().focus().unsetLink().run()
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border', props.className)}>
      <div className='bg-muted/40 flex flex-wrap items-center gap-1 border-b p-1'>
        {button(t('Heading 1'), <Heading1 />, () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }))}
        {button(t('Heading 2'), <Heading2 />, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
        {button(t('Heading 3'), <Heading3 />, () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }))}
        <span className='bg-border mx-1 h-5 w-px' />
        {button(t('Bold'), <Bold />, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
        {button(t('Italic'), <Italic />, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
        {button(t('Underline'), <UnderlineIcon />, () => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'))}
        {button(t('Inline code'), <Code />, () => editor.chain().focus().toggleCode().run(), editor.isActive('code'))}
        <span className='bg-border mx-1 h-5 w-px' />
        {button(t('Bullet list'), <List />, () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
        {button(t('Numbered list'), <ListOrdered />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
        {button(t('Quote'), <Quote />, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'))}
        {button(t('Insert link'), <LinkIcon />, setLink, editor.isActive('link'))}
        {button(t('Clear formatting'), <RemoveFormatting />, () => editor.chain().focus().clearNodes().unsetAllMarks().run())}
        <span className='bg-border mx-1 h-5 w-px' />
        {button(t('Undo'), <Undo2 />, () => editor.chain().focus().undo().run())}
        {button(t('Redo'), <Redo2 />, () => editor.chain().focus().redo().run())}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
