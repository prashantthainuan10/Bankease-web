package bankease_backend.loan;

import bankease_backend.auth.LoginResponse;
import bankease_backend.model.Account;
import bankease_backend.repository.AccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LoanApplicationServiceTest {
    private LoanApplicationRepository legacyApplications;
    private DesktopLoanRepository desktopLoans;
    private AccountRepository accounts;
    private LoanApplicationService service;

    @BeforeEach
    void setUp() {
        legacyApplications = mock(LoanApplicationRepository.class);
        desktopLoans = mock(DesktopLoanRepository.class);
        accounts = mock(AccountRepository.class);
        service = new LoanApplicationService(legacyApplications, desktopLoans, accounts);
    }

    @Test
    void savesLoanToSharedLoansTableForOwnedAccount() {
        LoginResponse user = new LoginResponse(7, "Demo Person", "person@example.com");
        Account account = mock(Account.class);
        when(account.getAccountId()).thenReturn(12);
        when(accounts.findByUserIdOrderByAccountIdAsc(7)).thenReturn(List.of(account));
        when(desktopLoans.save(any(DesktopLoan.class))).thenAnswer(call -> call.getArgument(0));

        LoanApplicationResponse response = service.submit(user, new LoanApplicationRequest(12, "Personal",
                new BigDecimal("12000.00"), BigDecimal.ZERO, 12, "Education expenses"));

        assertEquals("Personal", response.loanType());
        assertEquals(12, response.tenureMonths());
        assertEquals("PENDING", response.status());
        assertEquals(new BigDecimal("1000.00"), response.monthlyEmi());
        verify(desktopLoans).save(any(DesktopLoan.class));
        verify(legacyApplications, never()).save(any(LoanApplication.class));
    }

    @Test
    void refusesLoanForAccountNotOwnedBySignedInUser() {
        LoginResponse user = new LoginResponse(7, "Demo Person", "person@example.com");
        when(accounts.findByUserIdOrderByAccountIdAsc(7)).thenReturn(List.of());

        assertThrows(ResponseStatusException.class, () -> service.submit(user,
                new LoanApplicationRequest(99, "Personal", new BigDecimal("12000.00"), BigDecimal.ZERO, 12, null)));
        verify(desktopLoans, never()).save(any(DesktopLoan.class));
    }
}
