import React from 'react'
import 'katex/dist/katex.min.css'
import { BlockMath, InlineMath } from 'react-katex'

interface MathRendererProps {
  content: string
  className?: string
  isOption?: boolean
}

// Quick check: does text look mathy?
const MATH_HINTS = [
  /\\[a-zA-Z]+/,        // \frac, \sqrt, \boldsymbol, ...
  /\$.*\$/,             // $...$
  /\\\(|\\\)/,          // \( ... \)
  /\\\[|\\\]/,          // \[ ... \]
  /[xyz]\^|_\{/,        // x^2, _{i}
]

function isMathy(s?: string): boolean {
  if (!s) return false
  return MATH_HINTS.some((rx) => rx.test(s))
}

// Split into text / inline / block segments for KaTeX rendering
function tokenizeMath(s: string): Array<{ type: 'text' | 'inline' | 'block'; content: string }> {
  // Order matters: $$...$$ (block), \[...\] (block), \(..\) (inline), $...$ (inline)
  const pattern = /(\$\$[\s\S]+?\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$(.+?)\$)/g
  const out: Array<{ type: 'text' | 'inline' | 'block'; content: string }> = []
  let last = 0
  let m: RegExpExecArray | null

  while ((m = pattern.exec(s))) {
    if (m.index > last) out.push({ type: 'text', content: s.slice(last, m.index) })
    const full = m[0]
    if (full.startsWith('$$')) {
      out.push({ type: 'block', content: full.slice(2, -2).trim() })
    } else if (full.startsWith('\\[')) {
      out.push({ type: 'block', content: (m[2] ?? '').trim() })
    } else if (full.startsWith('\\(')) {
      out.push({ type: 'inline', content: (m[3] ?? '').trim() })
    } else if (full.startsWith('$')) {
      out.push({ type: 'inline', content: (m[4] ?? '').trim() })
    }
    last = pattern.lastIndex
  }
  if (last < s.length) out.push({ type: 'text', content: s.slice(last) })
  return out
}

// Normalize common LaTeX macros
function normalizeLatex(s: string): string {
  // Replace \boldsymbol{...} with \mathbf{...} (KaTeX-friendly)
  return s.replace(/\\boldsymbol\{/g, '\\mathbf{')
}

export const MathRenderer: React.FC<MathRendererProps> = ({ 
  content, 
  className = '',
  isOption = false 
}) => {
  // Treat plain text quickly
  if (!isMathy(content)) {
    return <span className={className}>{content}</span>
  }

  const segments = tokenizeMath(content)
  
  return (
    <div className={`math-content ${isOption ? 'math-option' : 'math-stem'} ${className}`}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.content}</span>
        }
        if (seg.type === 'inline') {
          return <InlineMath key={i} math={normalizeLatex(seg.content)} />
        }
        return (
          <div key={i} className="my-2 text-center">
            <BlockMath math={normalizeLatex(seg.content)} />
          </div>
        )
      })}
    </div>
  )
}
