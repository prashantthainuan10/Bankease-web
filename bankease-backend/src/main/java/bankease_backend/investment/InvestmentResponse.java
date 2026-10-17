package bankease_backend.investment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record InvestmentResponse(Integer investmentId, Integer accountId, String investmentType,
                                 String investmentName, BigDecimal amount, BigDecimal expectedReturn,
                                 LocalDate maturityDate, String status, LocalDateTime investmentDate) {
    static InvestmentResponse from(DesktopInvestment investment) {
        return new InvestmentResponse(investment.getInvestmentId(), investment.getAccountId(),
                investment.getInvestmentType(), investment.getInvestmentName(), investment.getAmount(),
                investment.getExpectedReturn(), investment.getMaturityDate(), investment.getStatus(),
                investment.getInvestmentDate());
    }
}
