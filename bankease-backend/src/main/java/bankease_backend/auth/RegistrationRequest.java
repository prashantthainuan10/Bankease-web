package bankease_backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record RegistrationRequest(
        @NotBlank @Size(max = 100) String fullName,
        @NotBlank @Email @Size(max = 100) String email,
        @NotBlank @Pattern(regexp = "[0-9+()\\- ]{7,20}") String phone,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotNull @Past LocalDate dateOfBirth,
        @NotBlank @Size(max = 255) String address) {}
