package bankease_backend.billpayment;

import bankease_backend.auth.LoginResponse;
import bankease_backend.model.Account;
import bankease_backend.model.BankTransaction;
import bankease_backend.repository.AccountRepository;
import bankease_backend.repository.TransactionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class BillPaymentService {
    private static final Set<String> BILLERS = Set.of("ELECTRICITY", "WATER", "INTERNET", "MOBILE", "GAS");

    private final AccountRepository accounts;
    private final TransactionRepository transactions;

    public BillPaymentService(AccountRepository accounts, TransactionRepository transactions) {
        this.accounts = accounts;
        this.transactions = transactions;
    }

    @Transactional
    public BillPaymentResponse pay(LoginResponse user, BillPaymentRequest request) {
        if (request == null || request.sourceAccountId() == null
                || request.biller() == null || request.amount() == null) {
            throw badRequest("Choose an account and bill type, then enter an amount.");
        }

        String biller = request.biller().trim().toUpperCase(Locale.ROOT);
        if (!BILLERS.contains(biller)) throw badRequest("Choose a supported bill type.");

        BigDecimal amount = request.amount();
        if (amount.signum() <= 0 || amount.scale() > 2 || amount.precision() > 15) {
            throw badRequest("Enter a positive amount with no more than two decimal places.");
        }
        amount = amount.setScale(2, RoundingMode.UNNECESSARY);
        if (amount.precision() > 15) throw badRequest("The amount is larger than this account can pay.");

        Account ownedAccount = accounts.findByUserIdOrderByAccountIdAsc(user.userId()).stream()
                .filter(account -> account.getAccountId().equals(request.sourceAccountId()))
                .findFirst()
                .orElseThrow(() -> badRequest("The selected account is not available."));
        Account account = accounts.findByAccountIdInOrderByAccountIdAsc(List.of(ownedAccount.getAccountId()))
                .stream().findFirst().orElseThrow(() -> badRequest("The selected account is unavailable."));

        if (!"ACTIVE".equalsIgnoreCase(account.getStatus())) {
            throw badRequest("Bill payments require an active account.");
        }
        if (account.getBalance() == null || account.getBalance().compareTo(amount) < 0) {
            throw badRequest("There is not enough balance for this payment.");
        }

        account.setBalance(account.getBalance().subtract(amount));
        accounts.save(account);

        String reference = "BE-BILL-" + biller + "-"
                + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        transactions.save(new BankTransaction(account.getAccountId(), null, amount,
                "BILL_PAYMENT", "SUCCESS", reference, LocalDateTime.now()));

        return new BillPaymentResponse("Demo bill payment recorded.", biller,
                reference, amount, account.getBalance());
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
