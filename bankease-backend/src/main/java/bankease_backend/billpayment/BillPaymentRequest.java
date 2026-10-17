package bankease_backend.billpayment;

import java.math.BigDecimal;

public record BillPaymentRequest(Integer sourceAccountId, String biller, BigDecimal amount) {}
