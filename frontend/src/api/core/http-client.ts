import axios, {
    AxiosHeaders,
    type AxiosRequestConfig,
} from 'axios'
import {
    API_BASE_URL,
    API_TIMEOUT_MS,
} from './api-config'
import { getApiErrorMessage } from './error-mapper'
import {
    AuthenticationRequiredError,
    getAccessToken,
} from '../../auth/session'

export class ApiError extends Error {
    readonly status: number | undefined

    constructor(
        message: string,
        status?: number,
        cause?: unknown,
    ) {
        super(message, { cause })
        this.name = 'ApiError'
        this.status = status
    }
}

const httpClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT_MS,
})

httpClient.interceptors.request.use(async (config) => {
    const token = await getAccessToken()

    config.headers = AxiosHeaders.from(config.headers)
    config.headers.set('Authorization', `Bearer ${token}`)

    return config
})

async function request<TResponse>(
    config: AxiosRequestConfig,
): Promise<TResponse> {
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
                    'API отклонил авторизацию. Выполните вход повторно. '
                    + 'Если ошибка повторяется, проверьте настройки авторизации.',
                )
            }

            if (!error.response && error.code !== 'ERR_CANCELED') {
                throw new ApiError(
                    'Не удалось получить ответ сервера. '
                    + 'Результат операции может быть неизвестен; '
                    + 'не повторяйте финансовый запрос вслепую.',
                    undefined,
                    error,
                )
            }

            throw new ApiError(
                getApiErrorMessage(error),
                error.response?.status,
                error,
            )
        }

        throw new ApiError(
            getApiErrorMessage(error),
            undefined,
            error,
        )
    }
}

export const apiRequest = {
    get: <TResponse>(
        url: string,
        config?: AxiosRequestConfig,
    ) =>
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

    delete: <TResponse = void>(
        url: string,
        config?: AxiosRequestConfig,
    ) =>
        request<TResponse>({
            ...config,
            url,
            method: 'DELETE',
        }),
}