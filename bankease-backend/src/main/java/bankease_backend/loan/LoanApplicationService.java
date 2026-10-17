package bankease_backend.loan;

import bankease_backend.auth.LoginResponse;
import bankease_backend.repository.AccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.List;

@Service
public class LoanApplicationService {
    private static final MathContext CALCULATION_CONTEXT = MathContext.DECIMAL128;
    private final LoanApplicationRepository applications;
    private final DesktopLoanRepository desktopLoans;
    private final AccountRepository accounts;

    public LoanApplicationService(LoanApplicationRepository applications, DesktopLoanRepository desktopLoans,
                                  AccountRepository accounts) {
        this.applications = applications;
        this.desktopLoans = desktopLoans;
        this.accounts = accounts;
    }

    @Transactional(readOnly = true)
    public List<LoanApplicationResponse> listFor(LoginResponse user) {
        List<Integer> accountIds = accounts.findByUserIdOrderByAccountIdAsc(user.userId()).stream()
                .map(account -> account.getAccountId()).toList();
        List<LoanApplicationResponse> results = new java.util.ArrayList<>();
        if (!accountIds.isEmpty()) {
            desktopLoans.findByAccountIdInOrderByApplicationDateDesc(accountIds).stream()
                    .map(LoanApplicationResponse::from).forEach(results::add);
        }
        applications.findByUserIdOrderByCreatedAtDesc(user.userId()).stream()
                .map(LoanApplicationResponse::from).forEach(results::add);
        results.sort(java.util.Comparator.comparing(LoanApplicationResponse::createdAt,
                java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())));
        return results;
    }

    @Transactional
    public LoanApplicationResponse submit(LoginResponse user, LoanApplicationRequest request) {
        boolean ownsAccount = accounts.findByUserIdOrderByAccountIdAsc(user.userId()).stream()
                .anyMatch(account -> account.getAccountId().equals(request.accountId()));
        if (!ownsAccount) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose one of your own accounts.");
        DesktopLoan loan = desktopLoans.save(new DesktopLoan(request.accountId(), request.loanType(),
                request.principalAmount().setScale(2, RoundingMode.HALF_UP),
                request.annualInterestRate().setScale(2, RoundingMode.HALF_UP),
                request.tenureMonths(), request.purpose()));
        return LoanApplicationResponse.from(loan);
    }

    static BigDecimal calculateEmi(BigDecimal principal, BigDecimal annualRate, int months) {
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(1200), CALCULATION_CONTEXT);
        if (monthlyRate.signum() == 0) {
            return principal.divide(BigDecimal.valueOf(months), 2, RoundingMode.HALF_UP);
        }
        BigDecimal factor = BigDecimal.ONE.add(monthlyRate, CALCULATION_CONTEXT)
                .pow(months, CALCULATION_CONTEXT);
        BigDecimal numerator = principal.multiply(monthlyRate, CALCULATION_CONTEXT)
                .multiply(factor, CALCULATION_CONTEXT);
        return numerator.divide(factor.subtract(BigDecimal.ONE, CALCULATION_CONTEXT),
                2, RoundingMode.HALF_UP);
    }
}
