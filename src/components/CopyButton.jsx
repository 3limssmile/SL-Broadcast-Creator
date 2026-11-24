import { useState } from 'react'

export default function CopyButton({ getValue, className = 'btn btn-primary', style }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const text = typeof getValue === 'function' ? getValue() : getValue
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button className={copied ? className.replace('btn-primary', 'btn-secondary') : className} onClick={handleCopy} style={style}>
      <i className={copied ? 'fa-solid fa-check' : 'fa-solid fa-copy'}></i>
      {copied ? 'Copied!' : 'Copy Command'}
    </button>
  )
}
