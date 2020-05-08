import { FastifyInstance } from 'fastify'
import QSearch from '@patarapolw/qsearch'
import { getDb } from '../db/shared'
import { sorter } from '../db/sort'

export default (f: FastifyInstance, _: any, next: () => void) => {
  f.post('/q', {
    schema: {
      tags: ['card'],
      summary: 'Query for cards',
      body: {
        type: 'object',
        properties: {
          q: { type: 'string' },
          cond: { type: 'object' },
          offset: { type: 'integer' },
          limit: { type: ['integer', 'null'] },
          sort: { type: 'array', items: { type: 'string' } }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            result: { type: 'array', items: {} },
            count: { type: 'integer' }
          }
        }
      }
    }
  }, async (req) => {
    const { q = '', cond: userCond, offset = 0, limit = 10, sort = [] } = req.body
    const db = await getDb()

    const qSearch = new QSearch({
      dialect: 'native',
      schema: {
        deck: { type: 'string' },
        values: { type: 'string' },
        template: { type: 'string' },
        model: { type: 'string' },
        cid: { type: 'number' },
        nid: { type: 'number' },
        mid: { type: 'number' },
        did: { type: 'number' }
      }
    })

    let cond = qSearch.parse(q).cond
    if (userCond) {
      cond = { $and: [cond, userCond] }
    }

    const allData: any[] = []

    await db.anki2.db.each(/*sql*/`
    SELECT
      c.id    cid,
      n.id    nid,
      d.id    did,
      m.id    mid,
      d.name  deck,
      n.flds  [values],
      m.flds  keys,
      m.css   css,
      t.qfmt  qfmt,
      t.afmt  afmt,
      t.name  template,
      m.name  model
    FROM cards AS c
    JOIN notes AS n ON c.nid = n.id
    JOIN decks AS d ON c.did = d.id
    JOIN models AS m ON n.mid = m.id
    JOIN templates AS t ON t.ord = c.ord AND t.mid = n.mid
    `, (el: any) => {
      const data: any = {}
      const ks = el.keys.split('\x1f') as string[]
      const vs = el.values.split('\x1f') as string[]
      ks.map((k, i) => {
        data[k] = vs[i]
      })
      el.data = data

      if (qSearch.filterFunction(cond)(el)) {
        allData.push(el)
      }
    })

    const result = allData.sort(sorter(
      sort.map((s: string) => s[0] === '-' ? {
        key: s.substr(1),
        type: -1
      } : {
        key: s,
        type: 1
      }),
      true
    )).slice(offset, limit ? offset + limit : undefined)

    return {
      result,
      count: allData.length
    }
  })

  next()
}
