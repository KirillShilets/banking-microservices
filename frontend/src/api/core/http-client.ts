import axios, {
    type AxiosRequestConfig,
    type AxiosError, AxiosHeaders,
} from 'axios'
import { API_BASE_URL, API_TIMEOUT_MS } from './api-config'
import { getApiErrorMessage } from './error-mapper'
import { keycloak } from '../../auth/keycloak'

const httpClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT_MS,
    headers: {
        'Content-Type': 'application/json',
    },
})

httpClient.interceptors.request.use(
    async (config) => {
        try {
            if (keycloak.authenticated && keycloak.token) {
                await keycloak.updateToken(30)

                if (!config.headers) {
                    config.headers = new AxiosHeaders()
                }

                config.headers.set('Authorization', `Bearer ${keycloak.token}`)
            }
        } catch (error) {
            console.error('Failed to refresh token', error)
            keycloak.login()
        }

        return config
    },
)

httpClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            console.warn('Unauthorized, redirecting to login...')
            keycloak.login()
        }

        return Promise.reject(error)
    },
)

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