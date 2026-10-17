package bankease_backend.repository;

import bankease_backend.model.BankTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;

public interface TransactionRepository extends JpaRepository<BankTransaction, Integer> {
    interface MonthlyFlowProjection {
        String getMonthKey();
        BigDecimal getMoneyOut();
        BigDecimal getMoneyIn();
    }

    interface MonthlySpendingProjection {
        String getTransactionType();
        BigDecimal getTotalAmount();
    }

    @Query(value = "select t from BankTransaction t where t.senderAccountId in :accountIds " +
            "or t.receiverAccountId in :accountIds order by t.createdAt desc",
            countQuery = "select count(t) from BankTransaction t where t.senderAccountId in :accountIds " +
                    "or t.receiverAccountId in :accountIds")
    Page<BankTransaction> findRecentForAccounts(@Param("accountIds") List<Integer> accountIds,
                                                 Pageable pageable);

    @Query(value = "select t from BankTransaction t where " +
            "(t.senderAccountId in :accountIds or t.receiverAccountId in :accountIds) " +
            "and (:transactionType is null or t.transactionType = :transactionType) " +
            "and (:status is null or t.status = :status) " +
            "and (:referenceSearch is null or lower(coalesce(t.referenceNumber, '')) " +
            "like lower(concat('%', :referenceSearch, '%'))) " +
            "and (:fromDateTime is null or t.createdAt >= :fromDateTime) " +
            "and (:toDateTimeExclusive is null or t.createdAt < :toDateTimeExclusive) " +
            "order by t.createdAt desc, t.transactionId desc",
            countQuery = "select count(t) from BankTransaction t where " +
                    "(t.senderAccountId in :accountIds or t.receiverAccountId in :accountIds) " +
                    "and (:transactionType is null or t.transactionType = :transactionType) " +
                    "and (:status is null or t.status = :status) " +
                    "and (:referenceSearch is null or lower(coalesce(t.referenceNumber, '')) " +
                    "like lower(concat('%', :referenceSearch, '%'))) " +
                    "and (:fromDateTime is null or t.createdAt >= :fromDateTime) " +
                    "and (:toDateTimeExclusive is null or t.createdAt < :toDateTimeExclusive)")
    Page<BankTransaction> searchForAccounts(@Param("accountIds") List<Integer> accountIds,
                                            @Param("transactionType") String transactionType,
                                            @Param("status") String status,
                                            @Param("referenceSearch") String referenceSearch,
                                            @Param("fromDateTime") LocalDateTime fromDateTime,
                                            @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive,
                                            Pageable pageable);

    @Query(value = "select date_format(t.created_at, '%Y-%m') as monthKey, " +
            "sum(case when t.sender_account_id in (:accountIds) then t.amount else 0 end) as moneyOut, " +
            "sum(case when t.receiver_account_id in (:accountIds) then t.amount else 0 end) as moneyIn " +
            "from transactions t where " +
            "(t.sender_account_id in (:accountIds) or t.receiver_account_id in (:accountIds)) " +
            "and t.status = 'SUCCESS' and t.created_at >= :fromDateTime " +
            "and t.created_at < :toDateTimeExclusive " +
            "group by date_format(t.created_at, '%Y-%m') " +
            "order by date_format(t.created_at, '%Y-%m')", nativeQuery = true)
    List<MonthlyFlowProjection> findSuccessfulMonthlyFlow(
            @Param("accountIds") List<Integer> accountIds,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive);

    @Query(value = "select t.transaction_type as transactionType, sum(t.amount) as totalAmount " +
            "from transactions t where t.sender_account_id in (:accountIds) " +
            "and t.status = 'SUCCESS' and t.created_at >= :fromDateTime " +
            "and t.created_at < :toDateTimeExclusive " +
            "group by t.transaction_type order by t.transaction_type", nativeQuery = true)
    List<MonthlySpendingProjection> findSuccessfulMonthlySpendingByType(
            @Param("accountIds") List<Integer> accountIds,
            @Param("fromDateTime") LocalDateTime fromDateTime,
            @Param("toDateTimeExclusive") LocalDateTime toDateTimeExclusive);
}
