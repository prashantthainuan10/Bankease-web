package bankease_backend.billpayment;

import bankease_backend.auth.LoginResponse;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bill-payments")
public class BillPaymentController {
    private final BillPaymentService billPaymentService;

    public BillPaymentController(BillPaymentService billPaymentService) {
        this.billPaymentService = billPaymentService;
    }

    @PostMapping
    public BillPaymentResponse pay(Authentication authentication,
                                   @RequestBody BillPaymentRequest request) {
        LoginResponse user = (LoginResponse) authentication.getPrincipal();
        return billPaymentService.pay(user, request);
    }
}
