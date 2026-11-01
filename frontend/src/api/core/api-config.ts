import { appConfig, withoutTrailingSlash } from '../../config'

// Axios concatenates paths as `${baseURL}${url}`. Stripping the trailing slash
// prevents `//accounts/me` when a deployment sets a base URL with `/`.
export const API_BASE_URL = withoutTrailingSlash(appConfig.gatewayUrl)
export const API_TIMEOUT_MS = 12_000
