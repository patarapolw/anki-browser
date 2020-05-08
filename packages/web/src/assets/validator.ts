import dayjs from 'dayjs'

import { IColumn } from './types'

export class Validator {
  constructor (
    private tables: string[],
    private columns: IColumn[]
  ) {}

  getIdentifierRules (type: string, existing?: string, notnull?: boolean) {
    const rules = [
      ...(type === 'column' ? [
        (v: string) => (v !== existing && this.columns.map(c0 => c0.name).includes(v)) ? 'Duplicate column name' : ''
      ] : [
        (v: string) => (v !== existing && this.tables.includes(v)) ? 'Duplicate table name' : ''
      ]),
      (v: string) => (!v || /^[A-Z_][A-Z0-9_$]*$/i.test(v)) ? '' : `Invalid ${type} name`,
      (v: string) => (/[A-Z]/.test(v)) ? 'Lowercase is preferred' : '',
      (v: string) => (v && v.startsWith('__')) ? `Invalid ${type} name` : ''
    ]

    if (notnull) {
      rules.push(
        (v: string) => v ? '' : 'Cannot be blank'
      )
    }

    return rules
  }

  static getInvalidMessage (rules: ((s: any) => string)[], value: any) {
    for (const r of rules) {
      const v = r(value)
      if (v) {
        return v
      }
    }

    return ''
  }

  getType (field: string) {
    const c = this.columns.filter(c => c.name === field)[0]
    if (!c) {
      return ''
    }

    const type = c.type

    /**
     * https://www.sqlite.org/datatype3.html
     *
     * 3.1. Determination Of Column Affinity
     */
    if (type.includes('INT')) {
      return 'INTEGER'
    } else if (['CHAR', 'CLOB', 'TEXT'].some(t => type.includes(t))) {
      return 'TEXT'
    } else if (type.includes('BLOB')) {
      return 'BLOB'
    } else if (['REAL', 'FLOA', 'DOUB'].some(t => type.includes(t))) {
      return 'REAL'
    }

    return ''
  }

  getCellRules (field: string, xtype?: string) {
    const rules: ((v: string) => string)[] = []
    const type = xtype || this.getType(field)

    if (type === 'INTEGER') {
      rules.push((v) => (!v || /^-?\d+$/.test(v)) ? '' : `Not ${type}`)
    } else if (type === 'TEXT') {
    } else if (type === 'BLOB') {
    } else if (type === 'REAL') {
      rules.push((v) => (!v || /^-?\d*(\.\d+)?(e-?\d+)?$/.test(v)) ? '' : `Not ${type}`)
    } else if (type === 'boolean') {
      rules.push((v) => (!v || v === '0' || v === '1') ? '' : `Not ${type}`)
    } else if (type === 'date') {
      rules.push(
        (v) => (!v || /^-?\d*(\.\d+)?(e-?\d+)?$/.test(v)) ? '' : `Not ${type}`,
        (v) => (!v || dayjs(v).isValid()) ? '' : `Not ${type}`
      )
    } else if (type.startsWith('json')) {
      if (type === 'jsonarray') {
        rules.push(
          (v) => (!v || v.startsWith('[')) ? '' : `Not ${type}`
        )
      } else {
        rules.push(
          (v) => (!v || v.startsWith('{')) ? '' : `Not ${type}`
        )
      }

      rules.push(
        (v: string) => {
          if (!v) {
            return ''
          }

          try {
            JSON.parse(v)
          } catch (_) {
            return `Not ${type}`
          }

          return ''
        }
      )
    }

    const c = this.columns.filter(c => c.name === field)[0]
    if (c && c.notnull && type !== 'TEXT') {
      rules.push(
        (v) => v ? '' : 'NULL is not allowed'
      )
    }

    return rules
  }
}
