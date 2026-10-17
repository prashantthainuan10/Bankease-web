package bankease_backend.loan;

import bankease_backend.auth.LoginResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/loans/applications")
public class LoanApplicationController {
    private final LoanApplicationService loanApplications;

    public LoanApplicationController(LoanApplicationService loanApplications) {
        this.loanApplications = loanApplications;
    }

    @GetMapping
    public List<LoanApplicationResponse> list(Authentication authentication) {
        LoginResponse user = (LoginResponse) authentication.getPrincipal();
        return loanApplications.listFor(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LoanApplicationResponse submit(Authentication authentication,
                                          @Valid @RequestBody LoanApplicationRequest request) {
        LoginResponse user = (LoginResponse) authentication.getPrincipal();
        return loanApplications.submit(user, request);
    }
}
