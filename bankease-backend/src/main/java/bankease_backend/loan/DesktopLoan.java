package bankease_backend.loan;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "loans")
public class DesktopLoan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "loan_id")
    private Integer loanId;

    @Column(name = "account_id", nullable = false)
    private Integer accountId;

    @Column(name = "loan_type", nullable = false, length = 50)
    private String loanType;

    @Column(name = "loan_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal loanAmount;

    @Column(name = "interest_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal interestRate;

    @Column(name = "tenure_months", nullable = false)
    private Integer tenureMonths;

    @Column(name = "purpose", length = 255)
    private String purpose;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "application_date")
    private LocalDateTime applicationDate;

    protected DesktopLoan() {}

    public DesktopLoan(Integer accountId, String loanType, BigDecimal loanAmount,
                       BigDecimal interestRate, Integer tenureMonths, String purpose) {
        this.accountId = accountId;
        this.loanType = loanType;
        this.loanAmount = loanAmount;
        this.interestRate = interestRate;
        this.tenureMonths = tenureMonths;
        this.purpose = purpose;
        this.status = "PENDING";
    }

    @PrePersist
    void setApplicationDateIfMissing() {
        if (applicationDate == null) applicationDate = LocalDateTime.now();
    }

    public Integer getLoanId() { return loanId; }
    public Integer getAccountId() { return accountId; }
    public String getLoanType() { return loanType; }
    public BigDecimal getLoanAmount() { return loanAmount; }
    public BigDecimal getInterestRate() { return interestRate; }
    public Integer getTenureMonths() { return tenureMonths; }
    public String getStatus() { return status; }
    public String getPurpose() { return purpose; }
    public LocalDateTime getApplicationDate() { return applicationDate; }
    public void setStatus(String status) { this.status = status; }
}
