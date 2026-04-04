import { formatDistanceToNow, isPast, format } from 'date-fns'

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date) {
  if (!date) return null
  return format(new Date(date), 'MMM d, yyyy')
}

export function isOverdue(date) {
  if (!date) return false
  return isPast(new Date(date))
}

export function timeAgo(date) {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export const PROPERTY_COLORS = {
  'King George': '#818cf8',
  'Coach House': '#34d399',
  'Olmstead': '#fb923c',
}

export const STATUS_OPTIONS = ['Backlog', 'In Progress', 'Blocked', 'Done']
export const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Urgent']
export const ROOM_OPTIONS = [
  'Exterior', 'Kitchen', 'Living Room', 'Bedroom', 'Bathroom',
  'Basement', 'Electrical', 'Permits & Legal', 'Other',
]

export const PRIORITY_COLORS = {
  Low: 'text-text-secondary',
  Medium: 'text-info',
  High: 'text-accent',
  Urgent: 'text-danger',
}

export function groupBy(arr, fn) {
  return arr.reduce((acc, item) => {
    const key = fn(item)
    ;(acc[key] = acc[key] ?? []).push(item)
    return acc
  }, {})
}

export const STATUS_COLORS = {
  Backlog: 'bg-text-muted/20 text-text-secondary',
  'In Progress': 'bg-info/20 text-info',
  Blocked: 'bg-danger/20 text-danger',
  Done: 'bg-success/20 text-success',
}
