package bankease_backend.loan;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminLoanApplicationResponse(Integer loanId, Integer accountId, String loanType,
                                           BigDecimal loanAmount, BigDecimal interestRate,
                                           Integer tenureMonths, String purpose, String status,
                                           LocalDateTime applicationDate) {
    static AdminLoanApplicationResponse from(DesktopLoan loan) {
        return new AdminLoanApplicationResponse(loan.getLoanId(), loan.getAccountId(), loan.getLoanType(),
                loan.getLoanAmount(), loan.getInterestRate(), loan.getTenureMonths(), loan.getPurpose(),
                loan.getStatus(), loan.getApplicationDate());
    }
}
