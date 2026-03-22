'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'

interface QuestionBoxProps {
  question: string
  label?: string
  className?: string
  maxLines?: number
}

export default function QuestionBox({
  question,
  label = '问题',
  className = '',
  maxLines = 3,
}: QuestionBoxProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const questionRef = useRef<HTMLDivElement>(null)
  const [needsTruncation, setNeedsTruncation] = useState(false)

  useEffect(() => {
    const el = questionRef.current
    if (!el) return

    const measure = () => {
      const computed = getComputedStyle(el)
      const lineHeight = parseFloat(computed.lineHeight)
      const fontSize = parseFloat(computed.fontSize)

      const effectiveLineHeight =
        Number.isFinite(lineHeight) && lineHeight > 0
          ? lineHeight
          : fontSize * 1.5

      const maxHeight = effectiveLineHeight * maxLines
      setNeedsTruncation(el.scrollHeight > maxHeight + 2)
    }

    measure()

    const observer = new ResizeObserver(() => {
      measure()
    })
    observer.observe(el)

    window.addEventListener('resize', measure)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [question, maxLines])

  // 折叠状态变化时，如果重新缩回，也重新测一次
  useEffect(() => {
    const el = questionRef.current
    if (!el) return

    const computed = getComputedStyle(el)
    const lineHeight = parseFloat(computed.lineHeight)
    const fontSize = parseFloat(computed.fontSize)
    const effectiveLineHeight =
      Number.isFinite(lineHeight) && lineHeight > 0
        ? lineHeight
        : fontSize * 1.5

    const maxHeight = effectiveLineHeight * maxLines
    setNeedsTruncation(el.scrollHeight > maxHeight + 2)
  }, [isExpanded, maxLines])

  const collapsedMaxHeight = `${28 * maxLines}px` // 对应 leading-7 ≈ 28px

  return (
    <div className={`shrink-0 ${className}`}>
      {/* Header with label and expand/collapse button */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-lg text-text-secondary">{label}</h2>

        {needsTruncation && (
          <button
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((v) => !v)}
            className={`
              inline-flex items-center gap-1.5
              h-8 px-3 rounded-full
              border text-sm font-medium
              transition-all duration-200
              ${
                isExpanded
                  ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
                  : 'bg-bg-tertiary/80 border-white/10 text-text-secondary hover:text-text-primary hover:border-accent-blue/40 hover:bg-accent-blue/10'
              }
            `}
          >
            {isExpanded ? '收起问题' : '展开问题'}
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}
      </div>

      {/* Question content with gradient overlay and bottom CTA */}
      <div className="relative">
        <div
          ref={questionRef}
          className="text-xl font-medium leading-7 overflow-hidden transition-all duration-200"
          style={!isExpanded && needsTruncation ? { maxHeight: collapsedMaxHeight } : undefined}
        >
          {question}
        </div>

        {/* Gradient overlay + bottom CTA when collapsed */}
        {!isExpanded && needsTruncation && (
          <>
            {/* Gradient mask */}
            <div
              className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent cursor-pointer"
              onClick={() => setIsExpanded(true)}
            />

            {/* Bottom CTA button */}
            <div className="absolute bottom-2 right-2">
              <button
                type="button"
                onClick={() => setIsExpanded(true)}
                className="
                  inline-flex items-center gap-1.5
                  h-8 px-3 rounded-full
                  bg-black/50 backdrop-blur-md
                  border border-white/10
                  text-sm font-medium text-white
                  hover:bg-accent-blue/20
                  hover:border-accent-blue/40
                  transition-all duration-200
                  shadow-lg
                "
              >
                展开完整问题
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}