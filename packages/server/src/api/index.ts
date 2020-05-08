import { FastifyInstance } from 'fastify'
import swagger from 'fastify-oas'

import apkgRouter from './apkg'
import cardsRouter from './cards'
import { PORT } from '../config'

export default (f: FastifyInstance, _: any, next: () => void) => {
  f.register(swagger, {
    routePrefix: '/doc',
    swagger: {
      info: {
        title: 'Swagger API',
        version: '0.1.0'
      },
      consumes: ['application/json'],
      produces: ['application/json'],
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Local server'
        }
      ]
    },
    exposeRoute: true
  })

  f.register(require('fastify-cors'))

  f.register(apkgRouter, { prefix: '/apkg' })
  f.register(cardsRouter, { prefix: '/cards' })

  next()
}
