import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useToastStore, toast } from '../stores/toastStore'

beforeEach(() => {
  useToastStore.setState({ toasts: [] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useToastStore', () => {
  it('starts with no toasts', () => {
    expect(useToastStore.getState().toasts).toEqual([])
  })

  it('addToast adds a toast with type success by default', () => {
    useToastStore.getState().addToast('Hello')
    const { toasts } = useToastStore.getState()
    expect(toasts).toHaveLength(1)
    expect(toasts[0].message).toBe('Hello')
    expect(toasts[0].type).toBe('success')
    expect(typeof toasts[0].id).toBe('number')
  })

  it('addToast accepts a custom type', () => {
    useToastStore.getState().addToast('Oops', 'error')
    expect(useToastStore.getState().toasts[0].type).toBe('error')
  })

  it('multiple toasts accumulate', () => {
    useToastStore.getState().addToast('First')
    useToastStore.getState().addToast('Second')
    expect(useToastStore.getState().toasts).toHaveLength(2)
  })

  it('each toast gets a unique id', () => {
    useToastStore.getState().addToast('A')
    useToastStore.getState().addToast('B')
    const { toasts } = useToastStore.getState()
    expect(toasts[0].id).not.toBe(toasts[1].id)
  })

  it('removeToast removes the correct toast by id', () => {
    useToastStore.getState().addToast('Keep me')
    useToastStore.getState().addToast('Remove me')
    const { toasts } = useToastStore.getState()
    const removeId = toasts[1].id
    useToastStore.getState().removeToast(removeId)
    const after = useToastStore.getState().toasts
    expect(after).toHaveLength(1)
    expect(after[0].message).toBe('Keep me')
  })

  it('removeToast is a no-op for an unknown id', () => {
    useToastStore.getState().addToast('Still here')
    useToastStore.getState().removeToast(99999)
    expect(useToastStore.getState().toasts).toHaveLength(1)
  })

  it('auto-removes toast after 3500ms', () => {
    vi.useFakeTimers()
    useToastStore.getState().addToast('Auto-remove me')
    expect(useToastStore.getState().toasts).toHaveLength(1)
    vi.advanceTimersByTime(3500)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('does not auto-remove before 3500ms', () => {
    vi.useFakeTimers()
    useToastStore.getState().addToast('Still here')
    vi.advanceTimersByTime(3499)
    expect(useToastStore.getState().toasts).toHaveLength(1)
  })
})

describe('toast helpers', () => {
  it('toast.success adds a success toast', () => {
    toast.success('Saved!')
    const { toasts } = useToastStore.getState()
    expect(toasts[0].message).toBe('Saved!')
    expect(toasts[0].type).toBe('success')
  })

  it('toast.error adds an error toast', () => {
    toast.error('Something went wrong')
    expect(useToastStore.getState().toasts[0].type).toBe('error')
  })

  it('toast.info adds an info toast', () => {
    toast.info('Just so you know')
    expect(useToastStore.getState().toasts[0].type).toBe('info')
  })
})
