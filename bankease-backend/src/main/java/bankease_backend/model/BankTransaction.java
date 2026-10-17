package bankease_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.GenerationType;
import jakarta.persistence.GeneratedValue;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
public class BankTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transaction_id")
    private Integer transactionId;

    @Column(name = "sender_account_id")
    private Integer senderAccountId;

    @Column(name = "receiver_account_id")
    private Integer receiverAccountId;

    @Column(name = "amount")
    private BigDecimal amount;

    @Column(name = "transaction_type")
    private String transactionType;

    @Column(name = "status")
    private String status;

    @Column(name = "reference_number")
    private String referenceNumber;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    protected BankTransaction() {}

    public BankTransaction(Integer senderAccountId, Integer receiverAccountId,
                           BigDecimal amount, String transactionType, String status,
                           String referenceNumber, LocalDateTime createdAt) {
        this.senderAccountId = senderAccountId;
        this.receiverAccountId = receiverAccountId;
        this.amount = amount;
        this.transactionType = transactionType;
        this.status = status;
        this.referenceNumber = referenceNumber;
        this.createdAt = createdAt;
    }

    public Integer getTransactionId() { return transactionId; }
    public Integer getSenderAccountId() { return senderAccountId; }
    public Integer getReceiverAccountId() { return receiverAccountId; }
    public BigDecimal getAmount() { return amount; }
    public String getTransactionType() { return transactionType; }
    public String getStatus() { return status; }
    public String getReferenceNumber() { return referenceNumber; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
