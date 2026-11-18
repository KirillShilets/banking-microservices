package org.bank.bill.service;

import org.bank.bill.entity.Bill;
import org.bank.bill.repository.BillRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BillOpeningExecutorTest {

    private static final Long ACCOUNT_ID = 10L;
    private static final String OWNER_SUBJECT = "owner-subject";

    @Mock
    private BillRepository billRepository;

    private BillOpeningExecutor executor;

    @BeforeEach
    void setUp() {
        executor = new BillOpeningExecutor(billRepository);
    }

    @Test
    @DisplayName("Open a zero-balance bill without overdraft and store the owner projection")
    void opensZeroBalanceBillWithoutOverdraft() {
        when(billRepository.existsBillByAccountId(ACCOUNT_ID)).thenReturn(false);
        when(billRepository.save(any(Bill.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        executor.openBill(ACCOUNT_ID, OWNER_SUBJECT);

        ArgumentCaptor<Bill> saved = ArgumentCaptor.forClass(Bill.class);
        verify(billRepository).save(saved.capture());

        assertThat(saved.getValue().getAmount()).isEqualByComparingTo("0.00");
        assertThat(saved.getValue().getOverdraftEnabled()).isFalse();
        assertThat(saved.getValue().getOwnerSubject()).isEqualTo(OWNER_SUBJECT);
        assertThat(saved.getValue().getIsDefault()).isTrue();
    }

    @Test
    @DisplayName("Do not mark a second bill of the same account as default")
    void keepsExistingDefaultBill() {
        when(billRepository.existsBillByAccountId(ACCOUNT_ID)).thenReturn(true);
        when(billRepository.save(any(Bill.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        executor.openBill(ACCOUNT_ID, OWNER_SUBJECT);

        ArgumentCaptor<Bill> saved = ArgumentCaptor.forClass(Bill.class);
        verify(billRepository).save(saved.capture());

        assertThat(saved.getValue().getIsDefault()).isFalse();
    }
}
