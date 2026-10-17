package bankease_backend.loan;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/loan-applications")
public class LoanAdminController {
    private final LoanAdminService loanAdmin;

    public LoanAdminController(LoanAdminService loanAdmin) {
        this.loanAdmin = loanAdmin;
    }

    @GetMapping
    public List<AdminLoanApplicationResponse> list() {
        return loanAdmin.list();
    }

    @PatchMapping("/{loanId}/decision")
    public AdminLoanApplicationResponse decide(@PathVariable Integer loanId,
                                               @Valid @RequestBody LoanDecisionRequest request) {
        return loanAdmin.decide(loanId, request.status());
    }
}
