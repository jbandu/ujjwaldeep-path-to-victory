import { useMemo } from 'react'
import 'katex/dist/katex.min.css'
import katex from 'katex'

interface MathRendererProps {
  content: string
  className?: string
  isOption?: boolean
}

const hasLatex = (text: string): boolean => {
  const latexPatterns = [
    /\\boldsymbol/,
    /\\frac/,
    /\\sqrt/,
    /\\cdot/,
    /\^{/,
    /_{/,
    /\\[a-zA-Z]+/,
    /\$.*\$/,
    /[xyz]\s*[\(\[\{]/
  ]
  return latexPatterns.some(pattern => pattern.test(text))
}

const renderMathContent = (text: string): string => {
  if (!hasLatex(text)) {
    return text
  }

  try {
    // Handle inline math $...$ 
    let processed = text.replace(/\$([^\$]+)\$/g, (_, math) => {
      try {
        return katex.renderToString(math, { 
          throwOnError: false,
          displayMode: false 
        })
      } catch {
        return `$${math}$`
      }
    })

    // Handle display math $$...$$ 
    processed = processed.replace(/\$\$([^\$]+)\$\$/g, (_, math) => {
      try {
        return `<div class="math-display">${katex.renderToString(math, { 
          throwOnError: false,
          displayMode: true 
        })}</div>`
      } catch {
        return `$$${math}$$`
      }
    })

    // Auto-wrap LaTeX expressions that aren't already wrapped
    // Match patterns like \command{...}, x^{...}, x_{...}, etc.
    processed = processed.replace(/\\[a-zA-Z]+(?:\{[^}]*\})?|[a-zA-Z]\^?\{[^}]+\}|[a-zA-Z]_\{[^}]+\}/g, (match) => {
      // Skip if already inside katex HTML
      if (processed.includes('katex')) return match
      try {
        return katex.renderToString(match, { 
          throwOnError: false,
          displayMode: false 
        })
      } catch {
        return match
      }
    })

    return processed
  } catch (error) {
    console.error('Math rendering error:', error)
    return text
  }
}

export const MathRenderer: React.FC<MathRendererProps> = ({ 
  content, 
  className = '',
  isOption = false 
}) => {
  const renderedContent = useMemo(() => renderMathContent(content), [content])
  const containsMath = useMemo(() => hasLatex(content), [content])

  if (!containsMath) {
    return <span className={className}>{content}</span>
  }

  return (
    <div 
      className={`math-content ${isOption ? 'math-option' : 'math-stem'} ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  )
}
