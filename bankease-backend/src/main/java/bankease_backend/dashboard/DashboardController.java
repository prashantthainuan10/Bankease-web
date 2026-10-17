package bankease_backend.dashboard;

import bankease_backend.auth.LoginResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.Locale;
import java.util.Set;
import java.time.LocalDate;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public DashboardResponse getDashboard(Authentication authentication) {
        LoginResponse user = (LoginResponse) authentication.getPrincipal();
        return dashboardService.loadFor(user);
    }

    @GetMapping("/transactions")
    public TransactionPageResponse getTransactions(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer accountId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        LoginResponse user = (LoginResponse) authentication.getPrincipal();
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(size, 1), 50);
        String safeType = normalize(type, Set.of("TRANSFER", "BILL_PAYMENT"), "type");
        String safeStatus = normalize(status, Set.of("SUCCESS", "FAILED", "PENDING"), "status");
        String safeSearch = search == null ? null : search.trim();
        if (safeSearch != null && safeSearch.length() > 60) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Search text must be 60 characters or fewer.");
        }
        if (safeSearch != null && safeSearch.isBlank()) safeSearch = null;
        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date must be on or before end date.");
        }
        if (to != null && to.equals(LocalDate.MAX)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date is out of range.");
        }
        LocalDateTime fromDateTime = from == null ? null : from.atStartOfDay();
        LocalDateTime toDateTimeExclusive = to == null ? null : to.plusDays(1).atStartOfDay();
        return dashboardService.loadTransactionPage(user, PageRequest.of(safePage, safeSize),
                safeType, safeStatus, safeSearch, fromDateTime, toDateTimeExclusive, accountId);
    }

    private String normalize(String value, Set<String> allowed, String field) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!allowed.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported transaction " + field + ".");
        }
        return normalized;
    }
}
