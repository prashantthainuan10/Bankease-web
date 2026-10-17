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
@Table(name = "loan_applications")
public class LoanApplication {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "application_id")
    private Long applicationId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "loan_type", nullable = false, length = 20)
    private String loanType;

    @Column(name = "principal_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal principalAmount;

    @Column(name = "annual_interest_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal annualInterestRate;

    @Column(name = "term_years", nullable = false)
    private Integer termYears;

    @Column(name = "monthly_emi", nullable = false, precision = 15, scale = 2)
    private BigDecimal monthlyEmi;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected LoanApplication() {}

    public LoanApplication(Integer userId, String loanType, BigDecimal principalAmount,
                           BigDecimal annualInterestRate, Integer termYears, BigDecimal monthlyEmi) {
        this.userId = userId;
        this.loanType = loanType;
        this.principalAmount = principalAmount;
        this.annualInterestRate = annualInterestRate;
        this.termYears = termYears;
        this.monthlyEmi = monthlyEmi;
        this.status = "SUBMITTED";
    }

    @PrePersist
    void setCreatedAtIfMissing() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    public Long getApplicationId() { return applicationId; }
    public Integer getUserId() { return userId; }
    public String getLoanType() { return loanType; }
    public BigDecimal getPrincipalAmount() { return principalAmount; }
    public BigDecimal getAnnualInterestRate() { return annualInterestRate; }
    public Integer getTermYears() { return termYears; }
    public BigDecimal getMonthlyEmi() { return monthlyEmi; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
