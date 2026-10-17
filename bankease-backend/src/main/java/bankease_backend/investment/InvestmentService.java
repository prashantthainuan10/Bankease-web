package bankease_backend.investment;

import bankease_backend.auth.LoginResponse;
import bankease_backend.repository.AccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ResponseStatusException;

import java.math.RoundingMode;
import java.util.List;

@Service
public class InvestmentService {
    private final DesktopInvestmentRepository investments;
    private final AccountRepository accounts;

    public InvestmentService(DesktopInvestmentRepository investments, AccountRepository accounts) {
        this.investments = investments;
        this.accounts = accounts;
    }

    @Transactional(readOnly = true)
    public List<InvestmentResponse> listFor(LoginResponse user) {
        List<Integer> accountIds = accounts.findByUserIdOrderByAccountIdAsc(user.userId()).stream()
                .map(account -> account.getAccountId()).toList();
        if (accountIds.isEmpty()) return List.of();
        return investments.findByAccountIdInOrderByInvestmentDateDesc(accountIds).stream()
                .map(InvestmentResponse::from).toList();
    }

    @Transactional
    public InvestmentResponse submit(LoginResponse user, InvestmentRequest request) {
        boolean ownsAccount = accounts.findByUserIdOrderByAccountIdAsc(user.userId()).stream()
                .anyMatch(account -> account.getAccountId().equals(request.accountId()));
        if (!ownsAccount) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose one of your own accounts.");
        DesktopInvestment investment = investments.save(new DesktopInvestment(request.accountId(),
                request.investmentType(), request.investmentName().trim(), request.amount().setScale(2, RoundingMode.HALF_UP),
                request.expectedReturn() == null ? null : request.expectedReturn().setScale(2, RoundingMode.HALF_UP),
                request.maturityDate()));
        return InvestmentResponse.from(investment);
    }

    @Transactional
    public InvestmentResponse changeStatus(LoginResponse user, Integer investmentId, InvestmentStatusRequest request) {
        DesktopInvestment investment = investments.findById(investmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Investment record not found."));
        boolean ownsAccount = accounts.findByUserIdOrderByAccountIdAsc(user.userId()).stream()
                .anyMatch(account -> account.getAccountId().equals(investment.getAccountId()));
        if (!ownsAccount) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Investment record not found.");

        String currentStatus = investment.getStatus() == null ? "" : investment.getStatus().toUpperCase();
        boolean validTransition = ("MATURED".equals(request.status()) && "ACTIVE".equals(currentStatus))
                || ("CLOSED".equals(request.status()) && ("ACTIVE".equals(currentStatus) || "MATURED".equals(currentStatus)));
        if (!validTransition) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This investment status cannot be changed that way.");
        }
        investment.setStatus(request.status());
        return InvestmentResponse.from(investments.save(investment));
    }
}
