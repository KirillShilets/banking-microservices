import axios, { type AxiosRequestConfig } from 'axios'
import { API_BASE_URL, API_TIMEOUT_MS } from './api-config'
import { getApiErrorMessage } from './error-mapper'

const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

async function request<TResponse>(
  config: AxiosRequestConfig,
): Promise<TResponse> {
  try {
    const response = await httpClient.request<TResponse>(config)
    return response.data
  } catch (error) {
    throw new Error(getApiErrorMessage(error))
  }
}

export const apiRequest = {
  get: <TResponse>(url: string, config?: AxiosRequestConfig) =>
    request<TResponse>({
      ...config,
      url,
      method: 'GET',
    }),
  post: <TResponse, TBody = unknown>(
    url: string,
    body: TBody,
    config?: AxiosRequestConfig,
  ) =>
    request<TResponse>({
      ...config,
      url,
      method: 'POST',
      data: body,
    }),
  put: <TResponse, TBody = unknown>(
    url: string,
    body: TBody,
    config?: AxiosRequestConfig,
  ) =>
    request<TResponse>({
      ...config,
      url,
      method: 'PUT',
      data: body,
    }),
  delete: <TResponse = void>(url: string, config?: AxiosRequestConfig) =>
    request<TResponse>({
      ...config,
      url,
      method: 'DELETE',
    }),
}
