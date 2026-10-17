package bankease_backend.dashboard;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record DashboardResponse(
        String fullName,
        boolean administrator,
        List<AccountSummary> accounts,
        List<TransactionSummary> transactions,
        MonthlySummary monthlySummary) {

    public record AccountSummary(Integer accountId, String accountNumber,
                                 String accountType, String ifscCode,
                                 BigDecimal balance, String status) {}

    public record TransactionSummary(Integer transactionId, String direction,
                                     BigDecimal amount, String transactionType,
                                     String status, String referenceNumber,
                                     LocalDateTime createdAt) {}

    public record MonthlySummary(BigDecimal moneyOut, BigDecimal moneyIn,
                                 BigDecimal netMovement, List<MonthlyFlow> lastSixMonths,
                                 List<SpendingBreakdown> spendingBreakdown) {}

    public record MonthlyFlow(String monthKey, BigDecimal moneyOut, BigDecimal moneyIn) {}

    public record SpendingBreakdown(String transactionType, BigDecimal amount) {}
}
