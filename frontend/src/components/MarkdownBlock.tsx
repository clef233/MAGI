'use client'

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

interface MarkdownBlockProps {
  content: string
  className?: string
}

/**
 * MarkdownBlock - Renders markdown content with GFM support and XSS protection.
 *
 * Features:
 * - GitHub Flavored Markdown (tables, strikethrough, task lists)
 * - XSS protection via rehype-sanitize
 * - Tailwind typography styles
 * - Streaming-friendly (works with partial markdown)
 */
export default function MarkdownBlock({ content, className = '' }: MarkdownBlockProps) {
  // Memoize the sanitize schema to avoid recreation on every render
  const sanitizeSchema = useMemo(() => ({
    // Allow standard HTML tags but strip dangerous attributes
    tagNames: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'strong', 'em', 'del', 's',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div',
    ],
    attributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title'],
      code: ['className'],
      pre: ['className'],
      span: ['className'],
      th: ['align'],
      td: ['align'],
    },
  }), [])

  return (
    <div className={`prose prose-invert prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          // Custom styling for code blocks
          pre: ({ children }) => (
            <pre className="bg-bg-tertiary rounded-lg p-3 overflow-x-auto text-xs">
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code className="bg-bg-tertiary px-1.5 py-0.5 rounded text-xs" {...props}>
                  {children}
                </code>
              )
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
          // Custom link styling
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue hover:underline"
            >
              {children}
            </a>
          ),
          // Custom table styling
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse text-xs">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border px-2 py-1 bg-bg-tertiary text-left font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-2 py-1">
              {children}
            </td>
          ),
          // Custom list styling
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2 text-text-primary">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 text-text-primary">
              {children}
            </ol>
          ),
          // Blockquote styling
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent-blue pl-3 my-2 text-text-secondary italic">
              {children}
            </blockquote>
          ),
          // Heading styles
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-4 mb-2 text-text-primary">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold mt-3 mb-2 text-text-primary">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold mt-2 mb-1 text-text-primary">{children}</h3>
          ),
          // Paragraph
          p: ({ children }) => (
            <p className="my-1 text-text-primary">{children}</p>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}