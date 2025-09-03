import { describe, it, expect } from 'vitest'
import { shuffle } from '../shuffle'

describe('shuffle', () => {
  it('returns a new array with the same elements', () => {
    const original = [1, 2, 3, 4, 5]
    const result = shuffle(original)

    expect(result).not.toBe(original)
    expect(result.slice().sort()).toEqual(original.slice().sort())
    expect(original).toEqual([1, 2, 3, 4, 5])
  })
})
