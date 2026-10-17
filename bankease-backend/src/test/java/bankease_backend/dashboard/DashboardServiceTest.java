package bankease_backend.dashboard;

import bankease_backend.auth.LoginResponse;
import bankease_backend.model.Account;
import bankease_backend.model.BankTransaction;
import bankease_backend.repository.AccountRepository;
import bankease_backend.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class DashboardServiceTest {
    private AccountRepository accounts;
    private TransactionRepository transactions;
    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        accounts = mock(AccountRepository.class);
        transactions = mock(TransactionRepository.class);
        dashboardService = new DashboardService(accounts, transactions);
    }

    @Test
    void returnsOnlyMaskedAccountNumbersAndRecentTransactionsForSignedInUser() {
        LoginResponse user = new LoginResponse(7, "Demo Person", "person@example.com");
        Account account = mock(Account.class);
        when(account.getAccountId()).thenReturn(31);
        when(account.getAccountNumber()).thenReturn("1234 5678 9012 3456");
        when(account.getAccountType()).thenReturn("SAVINGS");
        when(account.getBalance()).thenReturn(new BigDecimal("925.50"));
        when(account.getStatus()).thenReturn("ACTIVE");
        when(accounts.findByUserIdOrderByAccountIdAsc(7)).thenReturn(List.of(account));

        BankTransaction transaction = mock(BankTransaction.class);
        when(transaction.getTransactionId()).thenReturn(12);
        when(transaction.getSenderAccountId()).thenReturn(31);
        when(transaction.getReceiverAccountId()).thenReturn(44);
        when(transaction.getAmount()).thenReturn(new BigDecimal("25.00"));
        when(transaction.getTransactionType()).thenReturn("TRANSFER");
        when(transaction.getStatus()).thenReturn("SUCCESS");
        when(transaction.getReferenceNumber()).thenReturn("TXN-DEMO");
        when(transactions.findRecentForAccounts(eq(List.of(31)), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(transaction), PageRequest.of(0, 10), 1));

        DashboardResponse response = dashboardService.loadFor(user);

        assertEquals("Demo Person", response.fullName());
        assertEquals("•••• 3456", response.accounts().getFirst().accountNumber());
        assertEquals("Sent", response.transactions().getFirst().direction());
        assertEquals(new BigDecimal("25.00"), response.transactions().getFirst().amount());
        verify(accounts).findByUserIdOrderByAccountIdAsc(7);
    }

    @Test
    void returnsEmptyDashboardForUserWithoutAccounts() {
        when(accounts.findByUserIdOrderByAccountIdAsc(8)).thenReturn(List.of());

        DashboardResponse response = dashboardService.loadFor(
                new LoginResponse(8, "New Person", "new@example.com"));

        assertEquals(List.of(), response.accounts());
        assertEquals(List.of(), response.transactions());
        verifyNoInteractions(transactions);
    }

    @Test
    void returnsPagedHistoryScopedToTheSignedInUsersAccounts() {
        LoginResponse user = new LoginResponse(7, "Demo Person", "person@example.com");
        Account account = mock(Account.class);
        when(account.getAccountId()).thenReturn(31);
        when(accounts.findByUserIdOrderByAccountIdAsc(7)).thenReturn(List.of(account));
        Pageable pageable = PageRequest.of(1, 20);
        when(transactions.findRecentForAccounts(eq(List.of(31)), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(), pageable, 25));

        TransactionPageResponse response = dashboardService.loadTransactionPage(user, pageable);

        assertEquals(25, response.totalElements());
        assertEquals(1, response.page());
        assertEquals(20, response.size());
        assertEquals(2, response.totalPages());
        assertEquals(true, response.hasPrevious());
        assertEquals(false, response.hasNext());
        verify(accounts).findByUserIdOrderByAccountIdAsc(7);
    }
}
