import { apiRequest } from '../core'
import type {
    BillRequestDTO,
    CreateBillRequestDTO,
} from '../../dto/request'
import type {
    BillDepositResponseDTO,
    BillResponseDTO,
} from '../../dto/response'

export interface SandboxDepositRequest {
    billId: number
    amount: string
}

export const billsApi = {
    getBill: (billId: number) =>
        apiRequest.get<BillResponseDTO>(`/bills/${billId}`),

    getBillsByAccount: (accountId: number) =>
        apiRequest.get<BillResponseDTO[]>(
            `/bills/accounts/${accountId}`,
        ),

    createBill: (payload: BillRequestDTO) =>
        apiRequest.post<number, BillRequestDTO>(
            '/bills',
            payload,
        ),

    createBillsForAccount: (
        accountId: number,
        bills: CreateBillRequestDTO[],
    ) =>
        apiRequest.post<number[], CreateBillRequestDTO[]>(
            `/bills/accounts/${accountId}`,
            bills,
        ),

    depositBill: (payload: SandboxDepositRequest) =>
        apiRequest.post<BillDepositResponseDTO, SandboxDepositRequest>(
            '/bills/sandbox/deposits',
            payload,
        ),
}