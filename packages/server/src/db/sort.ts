export const sorter = (ords: {
  key: string
  type: 1 | -1
}[], nullsLast?: boolean) => (a: any, b: any) => {
  if (a && b) {
    for (const { key, type } of ords) {
      const m = a[key]
      const n = b[key]

      const tA = getType(m)
      const tB = getType(n)

      if (tA === tB) {
        let r = m - n

        if (m && typeof m.localeCompare === 'function') {
          r = m.localeCompare(n)
        }

        if (!r) {
          continue
        }

        return r * type
      } else {
        if (nullsLast) {
          if (isUndefinedOrNull(m)) {
            return -1
          } else if (isUndefinedOrNull(n)) {
            return 1
          }
        }

        return (tA - tB) * type
      }
    }

    return 0
  }

  return a ? -1 : 1
}

function isUndefinedOrNull (a: any) {
  return !a && (typeof a === 'undefined' || typeof a === 'object')
}

/**
 * https://docs.mongodb.com/manual/reference/operator/aggregation/sort/
 * @param m
 */
function getType (m: any): number {
  if (typeof m === 'undefined') {
    return 0
  } else if (typeof m === 'object') {
    if (!m) {
      return 2
    } else if (Array.isArray(m)) {
      return 6
    } else if (m instanceof ArrayBuffer) {
      return 7
    } else if (m instanceof Date) {
      return 10
    } else if (m instanceof RegExp) {
      return 12
    }

    return 5
  } else if (typeof m === 'number') {
    return 3
  } else if (typeof m === 'string') {
    return 4
  } else if (typeof m === 'boolean') {
    return 9
  }

  return 3 // Assume number
}
