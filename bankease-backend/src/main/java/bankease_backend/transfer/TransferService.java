package bankease_backend.transfer;

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
import java.util.UUID;

@Service
public class TransferService {
    private final AccountRepository accounts;
    private final TransactionRepository transactions;

    public TransferService(AccountRepository accounts, TransactionRepository transactions) {
        this.accounts = accounts;
        this.transactions = transactions;
    }

    @Transactional
    public TransferResponse transfer(LoginResponse user, TransferRequest request) {
        if (request == null || request.sourceAccountId() == null
                || request.recipientAccountNumber() == null || request.amount() == null) {
            throw badRequest("Choose an account, enter a recipient account number, and enter an amount.");
        }

        BigDecimal amount = request.amount();
        if (amount.signum() <= 0 || amount.scale() > 2 || amount.precision() > 15) {
            throw badRequest("Enter a positive amount with no more than two decimal places.");
        }
        amount = amount.setScale(2, RoundingMode.UNNECESSARY);
        if (amount.precision() > 15) {
            throw badRequest("The amount is larger than this account can transfer.");
        }

        String recipientNumber = request.recipientAccountNumber().trim();
        if (recipientNumber.isEmpty()) throw badRequest("Enter the recipient account number.");

        Account sourceOwned = accounts.findByUserIdOrderByAccountIdAsc(user.userId()).stream()
                .filter(account -> account.getAccountId().equals(request.sourceAccountId()))
                .findFirst()
                .orElseThrow(() -> badRequest("The selected source account is not available."));
        Account recipientCandidate = accounts.findFirstByAccountNumber(recipientNumber)
                .orElseThrow(() -> badRequest("No account was found for that recipient number."));

        if (sourceOwned.getAccountId().equals(recipientCandidate.getAccountId())) {
            throw badRequest("Choose a different recipient account.");
        }

        List<Account> locked = accounts.findByAccountIdInOrderByAccountIdAsc(
                List.of(sourceOwned.getAccountId(), recipientCandidate.getAccountId()));
        Account source = locked.stream().filter(a -> a.getAccountId().equals(sourceOwned.getAccountId()))
                .findFirst().orElseThrow(() -> badRequest("The source account is unavailable."));
        Account recipient = locked.stream().filter(a -> a.getAccountId().equals(recipientCandidate.getAccountId()))
                .findFirst().orElseThrow(() -> badRequest("The recipient account is unavailable."));

        if (!"ACTIVE".equalsIgnoreCase(source.getStatus())
                || !"ACTIVE".equalsIgnoreCase(recipient.getStatus())) {
            throw badRequest("Transfers require both accounts to be active.");
        }
        if (source.getBalance() == null || source.getBalance().compareTo(amount) < 0) {
            throw badRequest("There is not enough balance for this transfer.");
        }

        source.setBalance(source.getBalance().subtract(amount));
        recipient.setBalance((recipient.getBalance() == null ? BigDecimal.ZERO : recipient.getBalance()).add(amount));
        accounts.saveAll(List.of(source, recipient));

        String reference = "BE-" + UUID.randomUUID().toString().replace("-", "").substring(0, 32);
        transactions.save(new BankTransaction(source.getAccountId(), recipient.getAccountId(), amount,
                "TRANSFER", "SUCCESS", reference, LocalDateTime.now()));

        return new TransferResponse("Transfer completed.", reference, amount, source.getBalance());
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
