import fastify from 'fastify'

import apiRouter from './api'
import { PORT } from './config'

async function main () {
  const app = fastify({
    logger: {
      prettyPrint: true
    }
  })
  const port = parseInt(PORT)

  app.register(apiRouter, { prefix: '/api' })

  app.get('/', (_, reply) => {
    reply.redirect('/api/doc')
  })

  app.listen(
    port,
    // process.env.NODE_ENV === 'development' ? 'localhost' : '0.0.0.0',
    (err) => {
      if (err) {
        throw err
      }

      console.log(`Go to http://localhost:${port}`)
    }
  )
}

main()
