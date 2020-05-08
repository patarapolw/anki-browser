import axios from 'axios'
import { remote } from 'electron'
import { SnackbarProgrammatic as Snackbar, LoadingProgrammatic as Loading } from 'buefy'

let loading: {
  close(): any
  requestEnded?: boolean
} | null = null
let requestTimeout: NodeJS.Timeout | null = null

export const api = axios.create({
  baseURL: `http://localhost:${remote.process.env.PORT || process.env.VUE_APP_PORT}`
})

api.interceptors.request.use((config) => {
  if (!loading) {
    if (requestTimeout) {
      clearTimeout(requestTimeout)
      requestTimeout = null
    }

    requestTimeout = setTimeout(() => {
      if (!loading) {
        loading = Loading.open({
          isFullPage: true,
          canCancel: true,
          onCancel: () => {
            if (loading && !loading.requestEnded) {
              Snackbar.open('API request is loading in background.')
            }
          }
        })
      }
    }, 1000)
  }

  return config
})

api.interceptors.response.use((config) => {
  if (loading) {
    loading.requestEnded = true
    loading.close()
    loading = null
  }

  if (requestTimeout) {
    clearTimeout(requestTimeout)
    requestTimeout = null
  }

  return config
}, (err) => {
  if (loading) {
    loading.close()
    loading = null
  }

  if (requestTimeout) {
    clearTimeout(requestTimeout)
    requestTimeout = null
  }

  console.error(JSON.stringify(err))

  Snackbar.open(err.message)
  return err
})
