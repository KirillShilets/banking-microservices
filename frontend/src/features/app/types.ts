export interface ActionResult {
  title: string
  payload: unknown
  timestamp: string
}

export type ExecuteAction = (
  title: string,
  action: () => Promise<unknown>,
) => Promise<void>
