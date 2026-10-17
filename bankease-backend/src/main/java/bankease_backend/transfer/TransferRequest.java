package bankease_backend.transfer;

import java.math.BigDecimal;

public record TransferRequest(Integer sourceAccountId, String recipientAccountNumber,
                              BigDecimal amount) {}
