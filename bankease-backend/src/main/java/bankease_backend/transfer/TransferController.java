package bankease_backend.transfer;

import bankease_backend.auth.LoginResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/transfers")
public class TransferController {
    private final TransferService transferService;

    public TransferController(TransferService transferService) {
        this.transferService = transferService;
    }

    @PostMapping
    public TransferResponse transfer(Authentication authentication,
                                     @RequestBody TransferRequest request) {
        LoginResponse user = (LoginResponse) authentication.getPrincipal();
        return transferService.transfer(user, request);
    }
}
