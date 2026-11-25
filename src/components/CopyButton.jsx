import { useState } from 'react'

export default function CopyButton({
  getValue, className = 'btn btn-primary', style,
  label = 'Copy Command', copiedLabel = 'Copied!', icon = 'fa-copy', title,
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const text = typeof getValue === 'function' ? getValue() : getValue
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button className={copied ? className.replace('btn-primary', 'btn-secondary') : className} onClick={handleCopy} style={style} title={title}>
      <i className={copied ? 'fa-solid fa-check' : `fa-solid ${icon}`}></i>
      {copied ? copiedLabel : label}
    </button>
  )
}
