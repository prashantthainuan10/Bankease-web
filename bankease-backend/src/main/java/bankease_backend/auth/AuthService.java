package bankease_backend.auth;

import bankease_backend.model.User;
import bankease_backend.model.Account;
import bankease_backend.repository.AccountRepository;
import bankease_backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.Optional;
import java.math.BigDecimal;
import java.security.SecureRandom;

@Service
public class AuthService {
    private final UserRepository users;
    private final AccountRepository accounts;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final SecureRandom secureRandom = new SecureRandom();
    private final Set<String> administratorEmails;

    @Autowired
    public AuthService(UserRepository users, AccountRepository accounts,
                       @Value("${bankease.admin-emails:}") String administratorEmails) {
        this.users = users;
        this.accounts = accounts;
        this.administratorEmails = Arrays.stream(administratorEmails.split(","))
                .map(String::trim).filter(value -> !value.isBlank())
                .map(value -> value.toLowerCase(Locale.ROOT)).collect(Collectors.toUnmodifiableSet());
    }

    public AuthService(UserRepository users) { this(users, null, ""); }

    public Optional<LoginResponse> login(LoginRequest request) {
        return users.findByEmailIgnoreCase(request.email().trim())
                .filter(user -> "ACTIVE".equals(user.getStatus()))
                // The existing Swing registration/login stores and compares the password
                // directly in password_hash. Keep that legacy behavior for this demo DB.
                .filter(user -> passwordMatches(user.getPasswordHash(), request.password()))
                .map(user -> new LoginResponse(
                        user.getUserId(), user.getFullName(), user.getEmail(), isAdministrator(user.getEmail())));
    }

    @Transactional
    public LoginResponse register(RegistrationRequest request) {
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "Password must be at most 72 UTF-8 bytes.");
        }
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPhone(request.phone().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setDateOfBirth(request.dateOfBirth());
        user.setAddress(request.address().trim());
        user.setStatus("ACTIVE");
        User saved = users.save(user);
        if (accounts != null) {
            accounts.save(new Account(saved.getUserId(), newDemoAccountNumber(), "SAVINGS",
                    "DEMO0000001", new BigDecimal("0.00"), "ACTIVE"));
        }
        return new LoginResponse(saved.getUserId(), saved.getFullName(), saved.getEmail(),
                isAdministrator(saved.getEmail()));
    }

    private String newDemoAccountNumber() {
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder number = new StringBuilder(16);
            number.append(secureRandom.nextInt(9) + 1);
            while (number.length() < 16) number.append(secureRandom.nextInt(10));
            if (accounts.findFirstByAccountNumber(number.toString()).isEmpty()) return number.toString();
        }
        throw new IllegalStateException("Could not generate a unique demo account number.");
    }

    private boolean passwordMatches(String storedValue, String password) {
        if (storedValue == null || password == null) return false;
        if (storedValue.startsWith("$2a$") || storedValue.startsWith("$2b$") || storedValue.startsWith("$2y$")) {
            return passwordEncoder.matches(password, storedValue);
        }
        // Existing desktop accounts store the submitted value directly. Keep those
        // accounts usable while all new web registrations store BCrypt hashes.
        return MessageDigest.isEqual(storedValue.getBytes(StandardCharsets.UTF_8),
                password.getBytes(StandardCharsets.UTF_8));
    }

    private boolean isAdministrator(String email) {
        return email != null && administratorEmails.contains(email.trim().toLowerCase(Locale.ROOT));
    }
}
