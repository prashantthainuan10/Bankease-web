package bankease_backend.loan;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class LoanAdminService {
    private final DesktopLoanRepository loans;

    public LoanAdminService(DesktopLoanRepository loans) {
        this.loans = loans;
    }

    @Transactional(readOnly = true)
    public List<AdminLoanApplicationResponse> list() {
        return loans.findAllByOrderByApplicationDateDesc().stream()
                .map(AdminLoanApplicationResponse::from).toList();
    }

    @Transactional
    public AdminLoanApplicationResponse decide(Integer loanId, String status) {
        DesktopLoan loan = loans.findById(loanId).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Loan application not found."));
        if (!"PENDING".equals(loan.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Only pending applications can be approved or rejected.");
        }
        loan.setStatus(status);
        return AdminLoanApplicationResponse.from(loans.save(loan));
    }
}
