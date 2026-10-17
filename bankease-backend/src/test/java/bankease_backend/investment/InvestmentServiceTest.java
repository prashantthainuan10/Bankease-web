package bankease_backend.investment;

import bankease_backend.auth.LoginResponse;
import bankease_backend.model.Account;
import bankease_backend.repository.AccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InvestmentServiceTest {
    private DesktopInvestmentRepository investments;
    private AccountRepository accounts;
    private InvestmentService service;

    @BeforeEach
    void setUp() {
        investments = mock(DesktopInvestmentRepository.class);
        accounts = mock(AccountRepository.class);
        service = new InvestmentService(investments, accounts);
    }

    @Test
    void savesDemoInvestmentToSharedTableForOwnedAccount() {
        LoginResponse user = new LoginResponse(7, "Demo Person", "person@example.com");
        Account account = mock(Account.class);
        when(account.getAccountId()).thenReturn(12);
        when(accounts.findByUserIdOrderByAccountIdAsc(7)).thenReturn(List.of(account));
        when(investments.save(any(DesktopInvestment.class))).thenAnswer(call -> call.getArgument(0));

        InvestmentResponse response = service.submit(user, new InvestmentRequest(12, "Mutual Fund", "Demo Fund",
                new BigDecimal("5000"), new BigDecimal("8.5"), LocalDate.of(2028, 1, 1)));

        assertEquals("Demo Fund", response.investmentName());
        assertEquals(new BigDecimal("5000.00"), response.amount());
        assertEquals("ACTIVE", response.status());
        verify(investments).save(any(DesktopInvestment.class));
    }

    @Test
    void refusesInvestmentForAccountNotOwnedBySignedInUser() {
        LoginResponse user = new LoginResponse(7, "Demo Person", "person@example.com");
        when(accounts.findByUserIdOrderByAccountIdAsc(7)).thenReturn(List.of());

        assertThrows(ResponseStatusException.class, () -> service.submit(user, new InvestmentRequest(99,
                "Mutual Fund", "Demo Fund", new BigDecimal("5000"), null, null)));
        verify(investments, never()).save(any(DesktopInvestment.class));
    }

    @Test
    void allowsOnlyValidStatusTransitionForOwnedInvestment() {
        LoginResponse user = new LoginResponse(7, "Demo Person", "person@example.com");
        Account account = mock(Account.class);
        when(account.getAccountId()).thenReturn(12);
        when(accounts.findByUserIdOrderByAccountIdAsc(7)).thenReturn(List.of(account));
        DesktopInvestment investment = new DesktopInvestment(12, "Fixed Deposit", "Demo FD",
                new BigDecimal("5000"), new BigDecimal("6"), LocalDate.of(2028, 1, 1));
        when(investments.findById(5)).thenReturn(Optional.of(investment));
        when(investments.save(any(DesktopInvestment.class))).thenAnswer(call -> call.getArgument(0));

        InvestmentResponse response = service.changeStatus(user, 5, new InvestmentStatusRequest("MATURED"));

        assertEquals("MATURED", response.status());
        verify(investments).save(investment);
    }

    @Test
    void refusesStatusChangeForAnotherUsersInvestment() {
        LoginResponse user = new LoginResponse(7, "Demo Person", "person@example.com");
        when(accounts.findByUserIdOrderByAccountIdAsc(7)).thenReturn(List.of());
        when(investments.findById(5)).thenReturn(Optional.of(new DesktopInvestment(12, "Fixed Deposit", "Demo FD",
                new BigDecimal("5000"), null, null)));

        assertThrows(ResponseStatusException.class, () -> service.changeStatus(user, 5,
                new InvestmentStatusRequest("CLOSED")));
        verify(investments, never()).save(any(DesktopInvestment.class));
    }
}
