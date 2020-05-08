import dayjs from 'dayjs'

import { IColumn } from './types'

export class Formatter {
  constructor (private columns: IColumn[]) {}

  getCellFormatter (field: string, xtype?: string) {
    const c = this.columns.filter(c => c.name === field)[0]
    const type = xtype || (c || {}).type

    if (type.startsWith('json')) {
      return (s: any) => s ? JSON.stringify(s) : null
    } else if (type === 'date') {
      return (s: any) => s ? dayjs(s).toISOString() : null
    } else if (type === 'boolean') {
      return (s: any) => s ? s === '0' ? 'FALSE' : 'TRUE' : null
    } else if (type.includes('INT')) {
      return (s: any) => (s || s === 0) ? parseInt(s) : null
    } else if (['REAL', 'FLOA', 'DOUB'].some(t => type.includes(t))) {
      return (s: any) => {
        if (s || s === 0) {
          const f = parseFloat(s)
          const sign = Math.sign(f)

          if (sign === 0) {
            return '0'
          }

          const [ch, man] = f.toExponential().split('e')
          if (parseInt(man) < 1) {
            if (ch.length > 4) {
              return f.toPrecision(3)
            }
            return s
          }

          return (+f.toFixed(3)).toString()
        }

        return null
      }
    } else if (!['CHAR', 'CLOB', 'TEXT'].some(t => type.includes(t))) {
      return (s: any) => s || null
    }

    return (s: any) => s
  }
}
