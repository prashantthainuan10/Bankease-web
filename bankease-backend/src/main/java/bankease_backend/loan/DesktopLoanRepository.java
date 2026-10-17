package bankease_backend.loan;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DesktopLoanRepository extends JpaRepository<DesktopLoan, Integer> {
    List<DesktopLoan> findByAccountIdInOrderByApplicationDateDesc(List<Integer> accountIds);
    List<DesktopLoan> findAllByOrderByApplicationDateDesc();
}
