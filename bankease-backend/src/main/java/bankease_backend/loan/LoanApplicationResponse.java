package bankease_backend.loan;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record LoanApplicationResponse(String applicationId, Integer accountId, String loanType,
                                      BigDecimal principalAmount, BigDecimal annualInterestRate,
                                      Integer tenureMonths, BigDecimal monthlyEmi,
                                      String status, LocalDateTime createdAt) {
    static LoanApplicationResponse from(LoanApplication application) {
        return new LoanApplicationResponse("LEGACY-" + application.getApplicationId(), null, application.getLoanType(),
                application.getPrincipalAmount(), application.getAnnualInterestRate(),
                application.getTermYears() * 12, application.getMonthlyEmi(), application.getStatus(),
                application.getCreatedAt());
    }

    static LoanApplicationResponse from(DesktopLoan loan) {
        return new LoanApplicationResponse("LOAN-" + loan.getLoanId(), loan.getAccountId(), loan.getLoanType(),
                loan.getLoanAmount(), loan.getInterestRate(), loan.getTenureMonths(),
                LoanApplicationService.calculateEmi(loan.getLoanAmount(), loan.getInterestRate(), loan.getTenureMonths()),
                loan.getStatus(), loan.getApplicationDate());
    }
}
