package bankease_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "accounts")
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "account_id")
    private Integer accountId;

    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "account_number")
    private String accountNumber;

    @Column(name = "account_type")
    private String accountType;

    @Column(name = "ifsc_code")
    private String ifscCode;

    @Column(name = "balance")
    private BigDecimal balance;

    @Column(name = "status")
    private String status;

    protected Account() {}

    public Account(Integer userId, String accountNumber, String accountType, String ifscCode,
                   BigDecimal balance, String status) {
        this.userId = userId;
        this.accountNumber = accountNumber;
        this.accountType = accountType;
        this.ifscCode = ifscCode;
        this.balance = balance;
        this.status = status;
    }

    public Integer getAccountId() { return accountId; }
    public Integer getUserId() { return userId; }
    public String getAccountNumber() { return accountNumber; }
    public String getAccountType() { return accountType; }
    public String getIfscCode() { return ifscCode; }
    public BigDecimal getBalance() { return balance; }
    public String getStatus() { return status; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
}
