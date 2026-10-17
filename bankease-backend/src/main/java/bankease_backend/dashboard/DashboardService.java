package bankease_backend.dashboard;

import bankease_backend.auth.LoginResponse;
import bankease_backend.model.Account;
import bankease_backend.model.BankTransaction;
import bankease_backend.repository.AccountRepository;
import bankease_backend.repository.TransactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {
    private final AccountRepository accounts;
    private final TransactionRepository transactions;

    public DashboardService(AccountRepository accounts, TransactionRepository transactions) {
        this.accounts = accounts;
        this.transactions = transactions;
    }

    public DashboardResponse loadFor(LoginResponse user) {
        List<Account> userAccounts = accounts.findByUserIdOrderByAccountIdAsc(user.userId());
        List<DashboardResponse.AccountSummary> accountSummaries = userAccounts.stream()
                .map(account -> new DashboardResponse.AccountSummary(
                        account.getAccountId(), maskAccountNumber(account.getAccountNumber()),
                        account.getAccountType(), account.getIfscCode(),
                        account.getBalance(), account.getStatus()))
                .toList();

        if (userAccounts.isEmpty()) {
            return new DashboardResponse(user.fullName(), user.administrator(), accountSummaries,
                    List.of(), zeroMonthlySummary());
        }

        List<Integer> queryIds = userAccounts.stream().map(Account::getAccountId).toList();
        Set<Integer> accountIds = queryIds.stream().collect(Collectors.toSet());
        List<DashboardResponse.TransactionSummary> transactionSummaries =
                transactions.findRecentForAccounts(queryIds, PageRequest.of(0, 10)).getContent().stream()
                        .map(transaction -> toSummary(transaction, accountIds))
                        .toList();

        YearMonth currentMonth = YearMonth.now();
        List<DashboardResponse.MonthlyFlow> monthlyFlows = loadSixMonthFlow(queryIds, currentMonth);
        DashboardResponse.MonthlyFlow currentFlow = monthlyFlows.getLast();
        BigDecimal moneyOut = currentFlow.moneyOut();
        BigDecimal moneyIn = currentFlow.moneyIn();
        DashboardResponse.MonthlySummary monthlySummary = new DashboardResponse.MonthlySummary(
                moneyOut, moneyIn, moneyIn.subtract(moneyOut), monthlyFlows,
                loadMonthlySpendingByType(queryIds, currentMonth));

        return new DashboardResponse(user.fullName(), user.administrator(), accountSummaries,
                transactionSummaries, monthlySummary);
    }

    private DashboardResponse.MonthlySummary zeroMonthlySummary() {
        return new DashboardResponse.MonthlySummary(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                loadEmptySixMonthFlow(YearMonth.now()), loadEmptySpendingBreakdown());
    }

    private List<DashboardResponse.SpendingBreakdown> loadMonthlySpendingByType(
            List<Integer> accountIds, YearMonth month) {
        LocalDateTime from = month.atDay(1).atStartOfDay();
        LocalDateTime to = month.plusMonths(1).atDay(1).atStartOfDay();
        Map<String, BigDecimal> amountsByType = new HashMap<>();
        List<TransactionRepository.MonthlySpendingProjection> rows =
                transactions.findSuccessfulMonthlySpendingByType(accountIds, from, to);
        if (rows != null) {
            for (TransactionRepository.MonthlySpendingProjection row : rows) {
                if (row != null) amountsByType.put(row.getTransactionType(), row.getTotalAmount());
            }
        }
        return List.of("TRANSFER", "BILL_PAYMENT").stream()
                .map(type -> new DashboardResponse.SpendingBreakdown(type,
                        amountsByType.getOrDefault(type, BigDecimal.ZERO) == null
                                ? BigDecimal.ZERO : amountsByType.get(type)))
                .toList();
    }

    private List<DashboardResponse.SpendingBreakdown> loadEmptySpendingBreakdown() {
        return List.of(
                new DashboardResponse.SpendingBreakdown("TRANSFER", BigDecimal.ZERO),
                new DashboardResponse.SpendingBreakdown("BILL_PAYMENT", BigDecimal.ZERO));
    }

    private List<DashboardResponse.MonthlyFlow> loadSixMonthFlow(List<Integer> accountIds, YearMonth currentMonth) {
        YearMonth firstMonth = currentMonth.minusMonths(5);
        LocalDateTime from = firstMonth.atDay(1).atStartOfDay();
        LocalDateTime to = currentMonth.plusMonths(1).atDay(1).atStartOfDay();
        Map<String, TransactionRepository.MonthlyFlowProjection> byMonth = new HashMap<>();
        List<TransactionRepository.MonthlyFlowProjection> rows =
                transactions.findSuccessfulMonthlyFlow(accountIds, from, to);
        if (rows != null) {
            for (TransactionRepository.MonthlyFlowProjection row : rows) byMonth.put(row.getMonthKey(), row);
        }

        List<DashboardResponse.MonthlyFlow> flow = new ArrayList<>(6);
        for (int index = 0; index < 6; index++) {
            YearMonth month = firstMonth.plusMonths(index);
            TransactionRepository.MonthlyFlowProjection row = byMonth.get(month.toString());
            BigDecimal moneyOut = row == null || row.getMoneyOut() == null ? BigDecimal.ZERO : row.getMoneyOut();
            BigDecimal moneyIn = row == null || row.getMoneyIn() == null ? BigDecimal.ZERO : row.getMoneyIn();
            flow.add(new DashboardResponse.MonthlyFlow(month.toString(), moneyOut, moneyIn));
        }
        return List.copyOf(flow);
    }

    private List<DashboardResponse.MonthlyFlow> loadEmptySixMonthFlow(YearMonth currentMonth) {
        YearMonth firstMonth = currentMonth.minusMonths(5);
        List<DashboardResponse.MonthlyFlow> flow = new ArrayList<>(6);
        for (int index = 0; index < 6; index++) {
            flow.add(new DashboardResponse.MonthlyFlow(firstMonth.plusMonths(index).toString(),
                    BigDecimal.ZERO, BigDecimal.ZERO));
        }
        return List.copyOf(flow);
    }

    public TransactionPageResponse loadTransactionPage(LoginResponse user, Pageable pageable) {
        return loadTransactionPage(user, pageable, null, null, null);
    }

    public TransactionPageResponse loadTransactionPage(LoginResponse user, Pageable pageable,
                                                        String transactionType, String status,
                                                        String referenceSearch) {
        return loadTransactionPage(user, pageable, transactionType, status, referenceSearch, null, null);
    }

    public TransactionPageResponse loadTransactionPage(LoginResponse user, Pageable pageable,
                                                        String transactionType, String status,
                                                        String referenceSearch,
                                                        java.time.LocalDateTime fromDateTime,
                                                        java.time.LocalDateTime toDateTimeExclusive) {
        return loadTransactionPage(user, pageable, transactionType, status, referenceSearch,
                fromDateTime, toDateTimeExclusive, null);
    }

    public TransactionPageResponse loadTransactionPage(LoginResponse user, Pageable pageable,
                                                        String transactionType, String status,
                                                        String referenceSearch,
                                                        java.time.LocalDateTime fromDateTime,
                                                        java.time.LocalDateTime toDateTimeExclusive,
                                                        Integer requestedAccountId) {
        List<Integer> userAccountIds = accounts.findByUserIdOrderByAccountIdAsc(user.userId()).stream()
                .map(Account::getAccountId).toList();
        if (requestedAccountId != null && !userAccountIds.contains(requestedAccountId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Account is not linked to this profile.");
        }
        List<Integer> queryIds = requestedAccountId == null ? userAccountIds : List.of(requestedAccountId);
        Page<BankTransaction> page = queryIds.isEmpty()
                ? new PageImpl<>(List.of(), pageable, 0)
                : transactionType == null && status == null && referenceSearch == null
                        && fromDateTime == null && toDateTimeExclusive == null
                        ? transactions.findRecentForAccounts(queryIds, pageable)
                        : transactions.searchForAccounts(queryIds, transactionType, status, referenceSearch,
                                fromDateTime, toDateTimeExclusive, pageable);
        Set<Integer> accountIds = Set.copyOf(userAccountIds);
        return new TransactionPageResponse(
                page.getContent().stream().map(transaction -> toSummary(transaction, accountIds)).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages(),
                page.hasNext(), page.hasPrevious());
    }

    private DashboardResponse.TransactionSummary toSummary(BankTransaction transaction,
                                                              Set<Integer> userAccountIds) {
        String direction = userAccountIds.contains(transaction.getSenderAccountId()) ? "Sent" : "Received";
        return new DashboardResponse.TransactionSummary(
                transaction.getTransactionId(), direction, transaction.getAmount(),
                transaction.getTransactionType(), transaction.getStatus(),
                transaction.getReferenceNumber(), transaction.getCreatedAt());
    }

    private String maskAccountNumber(String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()) return "Account number unavailable";
        String digits = accountNumber.replaceAll("\\s+", "");
        String lastFour = digits.substring(Math.max(0, digits.length() - 4));
        return "•••• " + lastFour;
    }
}
