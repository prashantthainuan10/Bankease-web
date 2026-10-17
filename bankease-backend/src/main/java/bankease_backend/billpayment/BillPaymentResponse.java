package bankease_backend.billpayment;

import java.math.BigDecimal;

public record BillPaymentResponse(String message, String biller, String referenceNumber,
                                  BigDecimal amount, BigDecimal remainingBalance) {}
