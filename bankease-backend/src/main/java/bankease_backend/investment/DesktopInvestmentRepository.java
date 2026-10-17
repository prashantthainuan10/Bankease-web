package bankease_backend.investment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DesktopInvestmentRepository extends JpaRepository<DesktopInvestment, Integer> {
    List<DesktopInvestment> findByAccountIdInOrderByInvestmentDateDesc(List<Integer> accountIds);
}
