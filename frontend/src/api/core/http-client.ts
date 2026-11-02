import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import { API_BASE_URL, API_TIMEOUT_MS } from './api-config'
import { getApiErrorMessage } from './error-mapper'
import { AuthenticationRequiredError } from '../../auth/errors'
import { forceRefreshAccessToken, getAccessToken } from '../../auth/token'
import { emitUnauthorized } from '../../auth/unauthorized'

export class ApiError extends Error {
  readonly status: number | undefined

  constructor(message: string, status?: number, cause?: unknown) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
  }
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

httpClient.interceptors.request.use(async (config) => {
  try {
    const token = await getAccessToken()
    config.headers = AxiosHeaders.from(config.headers)
    config.headers.set('Authorization', `Bearer ${token}`)
    return config
  } catch (error) {
    throw error instanceof AuthenticationRequiredError
      ? error
      : new AuthenticationRequiredError()
  }
})

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableRequestConfig | undefined
    const isUnauthorized = error.response?.status === 401

    if (isUnauthorized && config && !config._retry) {
      config._retry = true

      try {
        const token = await forceRefreshAccessToken()
        config.headers = AxiosHeaders.from(config.headers)
        config.headers.set('Authorization', `Bearer ${token}`)
        return await httpClient.request(config)
      } catch {
        emitUnauthorized()
      }
    } else if (isUnauthorized) {
      emitUnauthorized()
    }

    return Promise.reject(error)
  },
)

async function request<TResponse>(config: AxiosRequestConfig): Promise<TResponse> {
  try {
    const response = await httpClient.request<TResponse>(config)
    return response.data
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      throw error
    }

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new AuthenticationRequiredError(
          'API отклонил авторизацию. Войдите повторно, чтобы продолжить.',
        )
      }

      if (!error.response && error.code !== 'ERR_CANCELED') {
        throw new ApiError(
          'Не удалось связаться с API. Проверьте подключение и повторите попытку.',
          undefined,
          error,
        )
      }

      throw new ApiError(getApiErrorMessage(error), error.response?.status, error)
    }

    throw new ApiError(getApiErrorMessage(error), undefined, error)
  }
}

export const apiRequest = {
  get: <TResponse>(url: string, config?: AxiosRequestConfig) =>
    request<TResponse>({ ...config, url, method: 'GET' }),

  post: <TResponse, TBody = unknown>(
    url: string,
    body: TBody,
    config?: AxiosRequestConfig,
  ) => request<TResponse>({ ...config, url, method: 'POST', data: body }),

  put: <TResponse, TBody = unknown>(
    url: string,
    body: TBody,
    config?: AxiosRequestConfig,
  ) => request<TResponse>({ ...config, url, method: 'PUT', data: body }),

  delete: <TResponse = void>(url: string, config?: AxiosRequestConfig) =>
    request<TResponse>({ ...config, url, method: 'DELETE' }),
}
