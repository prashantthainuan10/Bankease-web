package bankease_backend.loan;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record LoanApplicationRequest(
        @NotNull Integer accountId,
        @NotNull @Pattern(regexp = "Personal|Home|Education|Vehicle") String loanType,
        @NotNull @DecimalMin(value = "0.00", inclusive = false)
        @DecimalMax("9999999999999.99") @Digits(integer = 13, fraction = 2) BigDecimal principalAmount,
        @NotNull @DecimalMin("0.00") @DecimalMax("100.00")
        @Digits(integer = 3, fraction = 2) BigDecimal annualInterestRate,
        @NotNull @Min(1) @Max(480) Integer tenureMonths,
        @Size(max = 255) String purpose) {}
