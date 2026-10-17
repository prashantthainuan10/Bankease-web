package bankease_backend.investment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "investments")
public class DesktopInvestment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "investment_id")
    private Integer investmentId;

    @Column(name = "account_id", nullable = false)
    private Integer accountId;

    @Column(name = "investment_type", nullable = false, length = 50)
    private String investmentType;

    @Column(name = "investment_name", nullable = false, length = 100)
    private String investmentName;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "expected_return", precision = 5, scale = 2)
    private BigDecimal expectedReturn;

    @Column(name = "maturity_date")
    private LocalDate maturityDate;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "investment_date")
    private LocalDateTime investmentDate;

    protected DesktopInvestment() {}

    public DesktopInvestment(Integer accountId, String investmentType, String investmentName,
                             BigDecimal amount, BigDecimal expectedReturn, LocalDate maturityDate) {
        this.accountId = accountId;
        this.investmentType = investmentType;
        this.investmentName = investmentName;
        this.amount = amount;
        this.expectedReturn = expectedReturn;
        this.maturityDate = maturityDate;
        this.status = "ACTIVE";
    }

    @PrePersist
    void setInvestmentDateIfMissing() {
        if (investmentDate == null) investmentDate = LocalDateTime.now();
    }

    public Integer getInvestmentId() { return investmentId; }
    public Integer getAccountId() { return accountId; }
    public String getInvestmentType() { return investmentType; }
    public String getInvestmentName() { return investmentName; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getExpectedReturn() { return expectedReturn; }
    public LocalDate getMaturityDate() { return maturityDate; }
    public String getStatus() { return status; }
    public LocalDateTime getInvestmentDate() { return investmentDate; }
    public void setStatus(String status) { this.status = status; }
}
