'use client';

import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Underline as UnderlineIcon,
} from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { looksLikeHtmlDocument } from '@caremate/learn-content';

type RichTextEditorProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
};

function ToolbarButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-md text-foreground transition-colors',
        'hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-primary-light text-primary-dark',
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  id,
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = 'Write the article…',
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          HTMLAttributes: {
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        },
      }),
      Placeholder.configure({ placeholder }),
      Markdown,
    ],
    content: value,
    contentType: looksLikeHtmlDocument(value) ? 'html' : 'markdown',
    editorProps: {
      attributes: {
        id: id ?? 'content',
        class: 'rich-text-prose min-h-64 px-3 py-2 text-sm outline-none',
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getMarkdown());
    },
    onBlur: () => {
      onBlur?.();
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const next = window.prompt('Link URL', previous ?? 'https://');
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
  };

  return (
    <div className="overflow-hidden rounded-md border border-border bg-white focus-within:ring-2 focus-within:ring-primary/30">
      <div className="flex flex-wrap gap-0.5 border-b border-border bg-surface-muted/60 px-1.5 py-1">
        <ToolbarButton
          label="Bold"
          active={editor?.isActive('bold')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor?.isActive('italic')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor?.isActive('underline')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-4" />
        </ToolbarButton>
        <span className="mx-1 my-1 w-px bg-border" />
        <ToolbarButton
          label="Heading"
          active={editor?.isActive('heading', { level: 2 })}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Subheading"
          active={editor?.isActive('heading', { level: 3 })}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Bulleted list"
          active={editor?.isActive('bulletList')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor?.isActive('orderedList')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor?.isActive('blockquote')}
          disabled={!editor}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Divider" disabled={!editor} onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
          <Minus className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor?.isActive('link')} disabled={!editor} onClick={setLink}>
          <Link2 className="size-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
