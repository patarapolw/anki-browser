import fs from 'fs'

import { FastifyInstance } from 'fastify'
import { getDb } from '../db/shared'

export default (f: FastifyInstance, _: any, next: () => void) => {
  f.put('/open', {
    schema: {
      tags: ['apkg'],
      summary: 'Open and prepare an APKG file',
      querystring: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string' }
        }
      }
    }
  }, async (req, reply) => {
    await getDb(req.query.path)
    reply.status(201).send()
  })

  f.get('/download', {
    schema: {
      tags: ['apkg'],
      summary: 'Download an APKG for use in Anki'
    }
  }, async (_, reply) => {
    const db = await getDb()
    await db.finalize()

    reply.type('application/zip').send(fs.createReadStream(db.filePath))
  })

  next()
}
