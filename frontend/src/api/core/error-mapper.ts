import axios from 'axios'
import type { ErrorResponseDTO } from '../../dto/response'

function isErrorResponseDTO(value: unknown): value is ErrorResponseDTO {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  return 'message' in value || 'status' in value || 'timestamp' in value
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const responseData = error.response?.data

    if (
      isErrorResponseDTO(responseData) &&
      typeof responseData.message === 'string' &&
      responseData.message.trim().length > 0
    ) {
      return status
        ? `[HTTP ${status}] ${responseData.message}`
        : responseData.message
    }

    if (typeof responseData === 'string' && responseData.trim().length > 0) {
      return status ? `[HTTP ${status}] ${responseData}` : responseData
    }

    if (error.message) {
      return error.message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Не удалось выполнить запрос к API.'
}
