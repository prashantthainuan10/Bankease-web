package bankease_backend.loan;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotBlank;

public record LoanDecisionRequest(@NotBlank @Pattern(regexp = "APPROVED|REJECTED") String status) {}
