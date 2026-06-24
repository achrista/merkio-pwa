import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://api.merkio.de/api/v1'

const api = axios.create({ baseURL: BASE_URL })

let isRefreshing = false
let refreshQueue = []

function getTokens() {
  return {
    access: localStorage.getItem('access_token'),
    refresh: localStorage.getItem('refresh_token'),
  }
}

export function setTokens(access, refresh) {
  localStorage.setItem('access_token', access)
  if (refresh) localStorage.setItem('refresh_token', refresh)
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

export function getAccessToken() {
  return localStorage.getItem('access_token')
}

api.interceptors.request.use((config) => {
  const { access } = getTokens()
  if (access) config.headers.Authorization = `Bearer ${access}`

  const lang = localStorage.getItem('locale') ?? navigator.language.split('-')[0] ?? 'de'
  config.headers['Accept-Language'] = lang

  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const { refresh } = getTokens()
      if (!refresh) {
        clearTokens()
        window.dispatchEvent(new Event('auth:logout'))
        return Promise.reject(error)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }

      isRefreshing = true
      try {
        const res = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refresh })
        const newAccess = res.data.accessToken
        const newRefresh = res.data.refreshToken ?? refresh
        setTokens(newAccess, newRefresh)
        refreshQueue.forEach((p) => p.resolve(newAccess))
        refreshQueue = []
        original.headers.Authorization = `Bearer ${newAccess}`
        return api(original)
      } catch {
        refreshQueue.forEach((p) => p.reject(error))
        refreshQueue = []
        clearTokens()
        window.dispatchEvent(new Event('auth:logout'))
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api
