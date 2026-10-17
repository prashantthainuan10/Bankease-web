package bankease_backend.investment;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record InvestmentStatusRequest(
        @NotNull @Pattern(regexp = "MATURED|CLOSED") String status) {}
