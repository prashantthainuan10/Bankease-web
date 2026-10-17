package bankease_backend.investment;

import bankease_backend.auth.LoginResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/investments")
public class InvestmentController {
    private final InvestmentService investments;

    public InvestmentController(InvestmentService investments) {
        this.investments = investments;
    }

    @GetMapping
    public List<InvestmentResponse> list(Authentication authentication) {
        return investments.listFor((LoginResponse) authentication.getPrincipal());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InvestmentResponse submit(Authentication authentication, @Valid @RequestBody InvestmentRequest request) {
        return investments.submit((LoginResponse) authentication.getPrincipal(), request);
    }

    @PatchMapping("/{investmentId}/status")
    public InvestmentResponse changeStatus(Authentication authentication, @PathVariable Integer investmentId,
                                           @Valid @RequestBody InvestmentStatusRequest request) {
        return investments.changeStatus((LoginResponse) authentication.getPrincipal(), investmentId, request);
    }
}
