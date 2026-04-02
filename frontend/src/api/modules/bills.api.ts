import { apiRequest } from '../core'
import type {
  BillRequestDTO,
  CreateBillRequestDTO,
  DepositRequestDTO,
} from '../../dto/request'
import type { BillDepositResponseDTO, BillResponseDTO } from '../../dto/response'

export const billsApi = {
  getBill: (billId: number) => apiRequest.get<BillResponseDTO>(`/bills/${billId}`),

  getBillsByAccount: (accountId: number) =>
    apiRequest.get<BillResponseDTO[]>(`/bills/accounts/${accountId}`),

  createBill: (payload: BillRequestDTO) =>
    apiRequest.post<number, BillRequestDTO>('/bills', payload),

  createBillsForAccount: (accountId: number, bills: CreateBillRequestDTO[]) =>
    apiRequest.post<number[], CreateBillRequestDTO[]>(
      `/bills/accounts/${accountId}`,
      bills,
    ),

  updateBill: (billId: number, payload: BillRequestDTO) =>
    apiRequest.put<BillResponseDTO, BillRequestDTO>(`/bills/${billId}`, payload),

  depositBill: (payload: DepositRequestDTO) =>
    apiRequest.post<BillDepositResponseDTO, DepositRequestDTO>(
      '/bills/deposits',
      payload,
    ),

  deleteBill: (billId: number) => apiRequest.delete(`/bills/${billId}`),

  deleteBillsByAccount: (accountId: number) =>
    apiRequest.delete(`/bills/accounts/${accountId}`),
}
