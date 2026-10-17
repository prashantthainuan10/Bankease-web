package bankease_backend.transfer;

import java.math.BigDecimal;

public record TransferResponse(String message, String referenceNumber,
                               BigDecimal amount, BigDecimal remainingBalance) {}
