import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function encodeValue(value) {
  if (Array.isArray(value)) return value.join(',')
  if (typeof value === 'boolean') return value ? '1' : '0'
  return String(value)
}

function decodeValue(raw, fallback) {
  if (Array.isArray(fallback)) return raw ? raw.split(',') : []
  if (typeof fallback === 'boolean') return raw === '1' || raw === 'true'
  if (typeof fallback === 'number') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  }
  return raw
}

function isAllowed(rule, value) {
  if (!rule) return true
  if (typeof rule === 'function') return rule(value)
  return Array.isArray(value) ? value.every(v => rule.includes(v)) : rule.includes(value)
}

export function shareUrl(path, state, defaults) {
  const params = new URLSearchParams()
  for (const [key, fallback] of Object.entries(defaults)) {
    if (!same(state[key], fallback)) params.set(key, encodeValue(state[key]))
  }
  const query = params.toString()
  return `${window.location.origin}${path}${query ? '?' + query : ''}`
}

export function readShared(search, defaults, rules = {}) {
  const params = new URLSearchParams(search)
  const state = { ...defaults }
  for (const [key, fallback] of Object.entries(defaults)) {
    if (!params.has(key)) continue
    const value = decodeValue(params.get(key), fallback)
    if (value !== undefined && isAllowed(rules[key], value)) state[key] = value
  }
  return state
}

export function useShared(defaults, rules) {
  const { search } = useLocation()
  return useMemo(() => readShared(search, defaults, rules), [])
}

export const isHexColor = v => /^#[0-9a-f]{6}$/i.test(v)
