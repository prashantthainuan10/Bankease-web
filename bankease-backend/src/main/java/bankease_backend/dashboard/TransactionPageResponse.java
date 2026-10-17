package bankease_backend.dashboard;

import java.util.List;

public record TransactionPageResponse(
        List<DashboardResponse.TransactionSummary> transactions,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext,
        boolean hasPrevious) {}
