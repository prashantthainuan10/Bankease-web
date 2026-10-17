package bankease_backend.investment;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record InvestmentRequest(
        @NotNull Integer accountId,
        @NotNull @Pattern(regexp = "Fixed Deposit|Mutual Fund|Stocks") String investmentType,
        @NotBlank @Size(max = 100) String investmentName,
        @NotNull @DecimalMin(value = "0.00", inclusive = false)
        @DecimalMax("9999999999999.99") @Digits(integer = 13, fraction = 2) BigDecimal amount,
        @DecimalMin("0.00") @DecimalMax("100.00") @Digits(integer = 3, fraction = 2) BigDecimal expectedReturn,
        LocalDate maturityDate) {}
