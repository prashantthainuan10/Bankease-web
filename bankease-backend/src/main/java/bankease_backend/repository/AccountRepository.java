package bankease_backend.repository;

import bankease_backend.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Collection;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Integer> {
    List<Account> findByUserIdOrderByAccountIdAsc(Integer userId);

    Optional<Account> findFirstByAccountNumber(String accountNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<Account> findByAccountIdInOrderByAccountIdAsc(Collection<Integer> accountIds);
}
