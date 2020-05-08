export function normalizeArray<T> (arr: T[]): T | undefined {
  return Array.isArray(arr) ? arr[0] : arr
}

/**
 * Encode params for use in editList dotProp
 * @param a
 */
export function encode (a: any): string {
  if (typeof a === 'string') {
    if (a.includes('.')) {
      throw new Error('. (dot) is not allowed')
    }

    return a
  } else if (typeof a === 'number') {
    return `$${a}`.replace('.', '$')
  }

  throw new Error('Unsupported data type')
}

export function decode (b: string): string | number {
  if (b.startsWith('$')) {
    return parseFloat(b.substr(1).replace('$', '.'))
  }

  return b
}
