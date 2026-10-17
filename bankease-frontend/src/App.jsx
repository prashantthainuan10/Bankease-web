import { useEffect, useRef, useState } from "react";
import "./App.css";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function displayAmount(value, hidden) {
  return hidden ? "₹ ••••" : currency.format(Number(value || 0));
}

function displayAccountLabel(accounts, accountId) {
  if (accountId == null) return "Unlinked legacy record";
  const account = accounts.find((item) => item.accountId === accountId);
  return account ? `${account.accountType || "Account"} · ${account.accountNumber}` : "Account unavailable";
}

function estimatedInvestmentValue(investment, asOfTime) {
  const investmentTime = new Date(investment.investmentDate).getTime();
  const amount = Number(investment.amount);
  const annualRate = Number(investment.expectedReturn);
  if (investment.status?.toUpperCase() !== "ACTIVE" || investment.expectedReturn == null
    || !Number.isFinite(investmentTime) || !Number.isFinite(amount) || !Number.isFinite(annualRate) || asOfTime <= 0) {
    return null;
  }
  const yearsInvested = Math.max(0, asOfTime - investmentTime) / (365.25 * 86400000);
  return amount * ((1 + annualRate / 100) ** yearsInvested);
}

function daysUntilMaturity(maturityDate, asOfTime) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(maturityDate || "") || asOfTime <= 0) return null;
  const dueAt = Date.parse(`${maturityDate}T00:00:00Z`);
  if (!Number.isFinite(dueAt)) return null;
  const today = new Date(asOfTime);
  const todayAt = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dueAt - todayAt) / 86400000);
}

async function readResponse(response) {
  return response.json().catch(() => ({}));
}

function TransactionDetailDialog({ transaction, onClose, hideAmounts }) {
  const dialogRef = useRef(null);
  const [copyStatus, setCopyStatus] = useState("Copy reference");
  const biller = transaction.referenceNumber?.match(/^BE-BILL-([A-Z]+)-/)?.[1];
  const title = transaction.transactionType === "BILL_PAYMENT"
    ? `${biller ? `${biller.charAt(0)}${biller.slice(1).toLowerCase()} ` : ""}bill payment`
    : transaction.transactionType === "TRANSFER" ? "BankEase transfer" : transaction.transactionType || "Transaction";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  async function copyReference() {
    if (!transaction.referenceNumber) return;
    try {
      await navigator.clipboard.writeText(transaction.referenceNumber);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy unavailable");
    }
  }

  function downloadReceipt() {
    const date = transaction.createdAt
      ? new Date(transaction.createdAt).toLocaleString("en-IN")
      : "Unavailable";
    const amount = currency.format(Number(transaction.amount || 0));
    const receipt = [
      "BankEase — Transaction receipt",
      "Demo banking record; not a bank-issued statement.",
      "",
      `Transaction ID: ${transaction.transactionId ?? "Unavailable"}`,
      `Type: ${title}`,
      `Direction: ${transaction.direction || "Unavailable"}`,
      `Amount: ${amount}`,
      `Status: ${transaction.status || "Unavailable"}`,
      `Date and time: ${date}`,
      `Reference number: ${transaction.referenceNumber || "Unavailable"}`,
      "",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([receipt], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `bankease-receipt-${transaction.transactionId ?? "transaction"}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <dialog className="transaction-dialog" ref={dialogRef} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="transaction-dialog-content">
        <button className="dialog-close" type="button" aria-label="Close transaction details" onClick={onClose}>×</button>
        <p className="tagline">TRANSACTION</p>
        <h2>{title}</h2>
        <dl className="transaction-detail-list">
          <div><dt>Amount</dt><dd>{hideAmounts ? "₹ ••••" : `${transaction.direction === "Sent" ? "−" : "+"}${displayAmount(transaction.amount, false)}`}</dd></div>
          <div><dt>Direction</dt><dd>{transaction.direction}</dd></div>
          <div><dt>Status</dt><dd>{transaction.status || "Unavailable"}</dd></div>
          <div><dt>Date and time</dt><dd>{transaction.createdAt ? new Date(transaction.createdAt).toLocaleString("en-IN") : "Unavailable"}</dd></div>
          <div><dt>Reference number</dt><dd className="reference-value">{transaction.referenceNumber || "Unavailable"}</dd></div>
        </dl>
        <div className="dialog-actions">
          {transaction.referenceNumber && <button className="statement-button" type="button" onClick={copyReference}>{copyStatus}</button>}
          <button className="statement-button" type="button" onClick={downloadReceipt} disabled={hideAmounts}
            title={hideAmounts ? "Show amounts before downloading a receipt" : undefined}>
            {hideAmounts ? "Show amounts for receipt" : "Download receipt"}
          </button>
          <button className="transfer-submit" type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </dialog>
  );
}

function TransactionRows({ transactions, hideAmounts = false }) {
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  if (!transactions.length) return <div className="empty-state">No transactions to show yet.</div>;

  return (
    <>
      <div className="transaction-list">
        {transactions.map((transaction) => (
          <article className="transaction-row" key={transaction.transactionId}>
            <span className={`transaction-icon ${transaction.direction.toLowerCase()}`} aria-hidden="true">
              {transaction.direction === "Sent" ? "↗" : "↙"}
            </span>
            <div className="transaction-details">
              <button className="transaction-detail-button" type="button" onClick={() => setSelectedTransaction(transaction)}>
                <strong>{transaction.transactionType === "BILL_PAYMENT" ? "Bill payment" : transaction.transactionType || `Money ${transaction.direction.toLowerCase()}`}</strong>
                <span>{transaction.direction} · {transaction.createdAt ? new Date(transaction.createdAt).toLocaleString("en-IN") : "Date unavailable"}</span>
                <small>View details</small>
              </button>
            </div>
            <div className="transaction-amount">
              <strong className={transaction.direction === "Sent" ? "amount-out" : "amount-in"}>
                {hideAmounts ? "₹ ••••" : `${transaction.direction === "Sent" ? "−" : "+"}${displayAmount(transaction.amount, false)}`}
              </strong>
              <span>{transaction.status}</span>
            </div>
          </article>
        ))}
      </div>
      {selectedTransaction && <TransactionDetailDialog transaction={selectedTransaction} hideAmounts={hideAmounts} onClose={() => setSelectedTransaction(null)} />}
    </>
  );
}

function PrivacyToggle({ hidden, onToggle }) {
  return (
    <button className="logout-button privacy-toggle" type="button" aria-pressed={hidden} onClick={onToggle}>
      {hidden ? "Show amounts" : "Hide amounts"}
    </button>
  );
}

function MonthlyBudgetCard({ fullName, spent, hideAmounts }) {
  const [initialBudget] = useState(() => {
    try {
      return window.localStorage.getItem(`bankease-monthly-budget-${fullName}`) || "";
    } catch {
      return "";
    }
  });
  const initialAmount = Number(initialBudget);
  const [monthlyBudget, setMonthlyBudget] = useState(
    initialBudget && Number.isFinite(initialAmount) ? initialAmount : 0,
  );
  const [monthlyBudgetDraft, setMonthlyBudgetDraft] = useState(initialBudget);
  const [budgetMessage, setBudgetMessage] = useState("");

  function saveMonthlyBudget(event) {
    event.preventDefault();
    const amount = Number(monthlyBudgetDraft);
    if (!Number.isFinite(amount) || amount <= 0) {
      setBudgetMessage("Enter a budget greater than ₹0.");
      return;
    }
    try {
      window.localStorage.setItem(`bankease-monthly-budget-${fullName}`, String(amount));
      setMonthlyBudget(amount);
      setBudgetMessage("Monthly budget saved in this browser.");
    } catch {
      setBudgetMessage("Could not save the budget in this browser.");
    }
  }

  const remaining = monthlyBudget - spent;
  const progress = monthlyBudget > 0 ? Math.min(100, (spent / monthlyBudget) * 100) : 0;

  return (
    <section className="dashboard-section budget-section" aria-labelledby="budget-heading">
      <div className="section-heading">
        <div><h2 id="budget-heading">Monthly spending budget</h2><p>Track this month’s successful money out against a target you set.</p></div>
      </div>
      <div className="budget-card">
        <form className="budget-form" onSubmit={saveMonthlyBudget}>
          <label htmlFor="monthly-budget">Your monthly budget (INR)</label>
          <div className="budget-input-row">
            <input id="monthly-budget" type={hideAmounts ? "password" : "number"} inputMode="decimal"
              min="0.01" max="9999999999999.99" step="0.01" value={monthlyBudgetDraft}
              onChange={(event) => { setMonthlyBudgetDraft(event.target.value); setBudgetMessage(""); }}
              placeholder="Enter a monthly target" required />
            <button className="transfer-submit" type="submit">Save budget</button>
          </div>
        </form>
        {budgetMessage && <p className="budget-message" role="status">{budgetMessage}</p>}
        {monthlyBudget > 0 ? (
          <div className="budget-progress-wrap">
            <div className="budget-progress-labels">
              <span>{hideAmounts ? "Spent: ₹ ••••" : `Spent: ${currency.format(spent)}`}</span>
              <span>{hideAmounts ? "Budget: ₹ ••••" : `Budget: ${currency.format(monthlyBudget)}`}</span>
            </div>
            <progress className={remaining < 0 ? "over-budget" : ""} value={progress} max="100"
              aria-label={`Monthly budget used: ${Math.round(progress)} percent`} />
            <p className={remaining < 0 ? "budget-over" : "budget-remaining"}>
              {remaining < 0
                ? `Over budget by ${displayAmount(Math.abs(remaining), hideAmounts)}`
                : `${displayAmount(remaining, hideAmounts)} remaining this month`}
            </p>
          </div>
        ) : <p className="budget-hint">Set a target to see your monthly spending progress. Your budget is saved in this browser.</p>}
      </div>
    </section>
  );
}

function LoanCalculator({ fullName, accounts, hideAmounts, onTogglePrivacy, onLogout, onBack }) {
  const [principal, setPrincipal] = useState("500000");
  const [annualRate, setAnnualRate] = useState("10.5");
  const [termMonths, setTermMonths] = useState("60");
  const calculatorRef = useRef(null);
  const [loanType, setLoanType] = useState("Personal");
  const [accountId, setAccountId] = useState(accounts[0]?.accountId ?? "");
  const [purpose, setPurpose] = useState("");
  const [applications, setApplications] = useState([]);
  const [loanStatusFilter, setLoanStatusFilter] = useState("ALL");
  const [loanAccountFilter, setLoanAccountFilter] = useState("ALL");
  const [loanSearch, setLoanSearch] = useState("");
  const [showFullAmortizationSchedule, setShowFullAmortizationSchedule] = useState(false);
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);
  const [loanApplicationsError, setLoanApplicationsError] = useState("");
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState(null);

  useEffect(() => {
    let active = true;
    fetch("/api/loans/applications")
      .then(async (response) => {
        const result = await readResponse(response);
        if (!response.ok) throw new Error(result.message || result.detail || "Could not load loan applications.");
        if (active) {
          setApplications(Array.isArray(result) ? result : []);
          setLoanApplicationsError("");
        }
      })
      .catch((error) => {
        if (active) setLoanApplicationsError(error.message || "Could not load loan applications.");
      })
      .finally(() => { if (active) setIsLoadingApplications(false); });
    return () => { active = false; };
  }, []);

  const amount = Number(principal);
  const rate = Number(annualRate);
  const months = Number(termMonths);
  const monthlyRate = rate / 1200;
  const valid = Number.isFinite(amount) && amount > 0 && amount <= 9999999999999.99
    && Number.isFinite(rate) && rate >= 0 && rate <= 100
    && Number.isInteger(months) && months > 0 && months <= 480;
  const emi = !valid ? 0 : monthlyRate === 0 ? amount / months
    : amount * monthlyRate * ((1 + monthlyRate) ** months) / (((1 + monthlyRate) ** months) - 1);
  const totalPayment = emi * months;
  const totalInterest = totalPayment - amount;
  const amortizationSchedule = [];
  if (valid) {
    const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
    const scheduledPayment = roundMoney(emi);
    let remainingBalance = roundMoney(amount);
    for (let month = 1; month <= months; month += 1) {
      const interest = roundMoney(remainingBalance * monthlyRate);
      let payment = Math.min(scheduledPayment, roundMoney(remainingBalance + interest));
      let principalPaid = roundMoney(Math.max(0, payment - interest));
      if (month === months || principalPaid >= remainingBalance) {
        payment = roundMoney(remainingBalance + interest);
        principalPaid = remainingBalance;
      }
      remainingBalance = roundMoney(Math.max(0, remainingBalance - principalPaid));
      amortizationSchedule.push({ month, payment, principalPaid, interest, remainingBalance });
      if (remainingBalance === 0) break;
    }
  }
  const openLoanApplications = applications.filter((application) =>
    ["SUBMITTED", "PENDING", "APPROVED", "ACTIVE"].includes(application.status?.toUpperCase()));
  const openLoanPrincipal = openLoanApplications.reduce((total, application) =>
    total + Number(application.principalAmount || 0), 0);
  const openLoanMonthlyEmi = openLoanApplications.reduce((total, application) =>
    total + Number(application.monthlyEmi || 0), 0);
  const visibleLoanApplications = applications.filter((application) =>
    (loanStatusFilter === "ALL" || application.status?.toUpperCase() === loanStatusFilter)
    && (loanAccountFilter === "ALL"
      || (loanAccountFilter === "UNLINKED" ? application.accountId == null
        : String(application.accountId) === loanAccountFilter))
    && `${application.loanType || ""} ${application.status || ""} ${application.applicationId || ""}`
      .toLowerCase().includes(loanSearch.trim().toLowerCase()));

  function exportLoanApplications() {
    downloadCsv(`bankease-loans-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Loan Type", "Principal Amount INR", "Annual Interest Rate %", "Tenure Months", "Estimated Monthly EMI INR", "Status", "Application Date"],
      visibleLoanApplications.map((application) => [application.loanType, application.principalAmount,
        application.annualInterestRate, application.tenureMonths, application.monthlyEmi,
        application.status, application.createdAt]));
  }

  function exportAmortizationSchedule() {
    downloadCsv(`bankease-loan-schedule-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Payment Number", "Payment INR", "Principal INR", "Interest INR", "Remaining Balance INR"],
      amortizationSchedule.map((row) => [row.month, row.payment, row.principalPaid, row.interest, row.remainingBalance]));
  }

  function loadLoanIntoCalculator(application) {
    setPrincipal(String(application.principalAmount));
    setAnnualRate(String(application.annualInterestRate));
    setTermMonths(String(application.tenureMonths));
    setShowFullAmortizationSchedule(false);
    calculatorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function submitApplication(event) {
    event.preventDefault();
    if (!valid) return;
    setApplicationMessage(null);
    setIsSubmittingApplication(true);
    try {
      const response = await fetch("/api/loans/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: Number(accountId),
          loanType,
          principalAmount: amount,
          annualInterestRate: rate,
          tenureMonths: months,
          purpose,
        }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.message || result.detail || "Could not submit the loan application.");
      setApplications((current) => [result, ...current]);
      setApplicationMessage({ type: "success", text: "Demo application submitted. No funds were disbursed." });
    } catch (error) {
      setApplicationMessage({ type: "error", text: error.message || "Could not reach BankEase." });
    } finally {
      setIsSubmittingApplication(false);
    }
  }

  return (
    <div className="app dashboard-app">
      <header className="navbar dashboard-navbar">
        <h2>Bank<span>Ease</span></h2>
        <div className="dashboard-nav-actions">
          <span className="signed-in-label">Signed in as {fullName}</span>
          <PrivacyToggle hidden={hideAmounts} onToggle={onTogglePrivacy} />
          <button className="logout-button" type="button" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      <main className="dashboard-main history-main">
        <button className="back-button" type="button" onClick={onBack}>← Back to dashboard</button>
        <section className="dashboard-heading history-heading">
          <p className="tagline">LOAN TOOLS</p>
          <h1>Loan EMI calculator</h1>
          <p className="description">Estimate a monthly repayment using the amount, rate, and term you enter.</p>
        </section>
        <p className="loan-demo-notice">Demo estimate only. It is not a loan offer, approval, or financial advice.</p>
        <div className="loan-calculator-layout" ref={calculatorRef}>
          <form className="loan-input-card" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="loan-principal">Loan amount (INR)</label>
            <input id="loan-principal" type={hideAmounts ? "password" : "number"} inputMode="decimal"
              min="1" max="9999999999999.99" step="0.01" value={principal}
              onChange={(event) => setPrincipal(event.target.value)} required />
            <label htmlFor="loan-rate">Annual interest rate (%)</label>
            <input id="loan-rate" type="number" min="0" max="100" step="0.01" value={annualRate}
              onChange={(event) => setAnnualRate(event.target.value)} required />
            <label htmlFor="loan-term">Loan term (months)</label>
            <input id="loan-term" type="number" min="1" max="480" step="1" value={termMonths}
              onChange={(event) => setTermMonths(event.target.value)} required />
          </form>
          <section className="loan-results" aria-live="polite" aria-label="Estimated loan repayment">
            <article className="loan-result-card loan-emi-result">
              <p>Estimated monthly EMI</p>
              <strong>{valid ? displayAmount(emi, hideAmounts) : "Enter valid values"}</strong>
              <span>For {valid ? `${months} monthly payments` : "the selected loan term"}</span>
            </article>
            <article className="loan-result-card">
              <p>Estimated total interest</p>
              <strong>{valid ? displayAmount(totalInterest, hideAmounts) : "—"}</strong>
            </article>
            <article className="loan-result-card">
              <p>Estimated total repayment</p>
              <strong>{valid ? displayAmount(totalPayment, hideAmounts) : "—"}</strong>
            </article>
          </section>
        </div>
        <section className="amortization-section" aria-labelledby="amortization-heading">
          <div className="section-heading amortization-heading">
            <div><h2 id="amortization-heading">Estimated payment schedule</h2><p>See how principal, interest, and balance change with each monthly payment.</p></div>
            <button className="statement-button" type="button" onClick={exportAmortizationSchedule}
              disabled={!valid || hideAmounts}>Download schedule CSV</button>
          </div>
          {!valid ? <div className="empty-state">Enter valid loan values to view the schedule.</div> : (
            <>
              <p className="amortization-note">Illustrative schedule using the calculator’s rate and term. The final payment may differ slightly because of rounding.</p>
              <div className="amortization-table-wrap">
                <table className="amortization-table">
                  <thead><tr><th>Payment</th><th>Monthly payment</th><th>Principal</th><th>Interest</th><th>Balance after payment</th></tr></thead>
                  <tbody>{amortizationSchedule.slice(0, showFullAmortizationSchedule ? amortizationSchedule.length : 12).map((row) => (
                    <tr key={row.month}><td>{row.month}</td><td>{displayAmount(row.payment, hideAmounts)}</td>
                      <td>{displayAmount(row.principalPaid, hideAmounts)}</td><td>{displayAmount(row.interest, hideAmounts)}</td>
                      <td>{displayAmount(row.remainingBalance, hideAmounts)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
              {amortizationSchedule.length > 12 && <button className="text-button amortization-toggle" type="button"
                onClick={() => setShowFullAmortizationSchedule((show) => !show)}>
                {showFullAmortizationSchedule ? "Show first 12 payments" : `Show all ${amortizationSchedule.length} payments`}
              </button>}
            </>
          )}
        </section>
        <section className="loan-application-section" aria-labelledby="loan-application-heading">
          <div className="section-heading">
            <div><h2 id="loan-application-heading">Apply for a demo loan</h2><p>Submit the estimate above as a sample application tied to your profile.</p></div>
          </div>
          <form className="loan-application-card" onSubmit={submitApplication}>
            <label htmlFor="loan-account">Deposit account</label>
            <select id="loan-account" value={accountId} onChange={(event) => setAccountId(event.target.value)} required>
              <option value="">Choose your account</option>
              {accounts.map((account) => <option key={account.accountId} value={account.accountId}>{account.accountType} · {account.accountNumber}</option>)}
            </select>
            <label htmlFor="loan-type">Loan type</label>
            <select id="loan-type" value={loanType} onChange={(event) => setLoanType(event.target.value)}>
              <option value="Personal">Personal</option>
              <option value="Home">Home</option>
              <option value="Vehicle">Vehicle</option>
              <option value="Education">Education</option>
            </select>
            <label htmlFor="loan-purpose">Purpose (optional)</label>
            <input id="loan-purpose" maxLength="255" value={purpose} onChange={(event) => setPurpose(event.target.value)} />
            <p className="loan-application-summary">
              {valid
                ? `${displayAmount(amount, hideAmounts)} · ${rate.toFixed(2)}% annual rate · ${months} months`
                : "Enter valid loan details above before submitting."}
            </p>
            {applicationMessage && <p className={`transfer-message ${applicationMessage.type}`} role={applicationMessage.type === "error" ? "alert" : "status"}>{applicationMessage.text}</p>}
            <button className="transfer-submit" type="submit" disabled={!valid || !accountId || !accounts.length || isSubmittingApplication}>
              {isSubmittingApplication ? "Submitting…" : "Submit demo application"}
            </button>
            <p className="loan-application-disclaimer">This records a pending demo application in the shared loans table. It does not approve a loan or change your balance.</p>
          </form>
        </section>
        <section className="loan-applications-section" aria-labelledby="loan-applications-heading">
          <div className="section-heading">
            <div><h2 id="loan-applications-heading">My loan applications</h2><p>Only applications linked to your signed-in profile are shown.</p></div>
          </div>
          <div className="loan-overview" aria-label="Open loan overview">
            <article className="loan-overview-card">
              <span>Open loan requests</span>
              <strong>{isLoadingApplications ? "Loading…" : openLoanApplications.length}</strong>
              <small>Pending, approved, or active</small>
            </article>
            <article className="loan-overview-card">
              <span>Recorded principal</span>
              <strong>{isLoadingApplications ? "Loading…" : displayAmount(openLoanPrincipal, hideAmounts)}</strong>
              <small>Across open loan records</small>
            </article>
            <article className="loan-overview-card">
              <span>Combined estimated monthly EMI</span>
              <strong>{isLoadingApplications ? "Loading…" : displayAmount(openLoanMonthlyEmi, hideAmounts)}</strong>
              <small>Illustrative total if open requests were approved</small>
            </article>
          </div>
          <div className="module-filter-row module-filter-actions">
            <label htmlFor="loan-search">Search loans
              <input id="loan-search" type="search" value={loanSearch} onChange={(event) => setLoanSearch(event.target.value)} placeholder="Loan type or status" />
            </label>
            <label htmlFor="loan-status-filter">Filter applications by status</label>
            <select id="loan-status-filter" value={loanStatusFilter} onChange={(event) => setLoanStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="ACTIVE">Active</option>
              <option value="REJECTED">Rejected</option>
              <option value="CLOSED">Closed</option>
            </select>
            <label htmlFor="loan-account-filter">Account</label>
            <select id="loan-account-filter" value={loanAccountFilter} onChange={(event) => setLoanAccountFilter(event.target.value)}>
              <option value="ALL">All accounts</option>
              {accounts.map((account) => <option key={account.accountId} value={account.accountId}>{account.accountType} · {account.accountNumber}</option>)}
              {applications.some((application) => application.accountId == null) && <option value="UNLINKED">Unlinked legacy records</option>}
            </select>
            <button className="statement-button" type="button" onClick={exportLoanApplications}
              disabled={!visibleLoanApplications.length || hideAmounts || isLoadingApplications}>
              Export filtered CSV
            </button>
          </div>
          {isLoadingApplications ? (
            <div className="empty-state" role="status">Loading loan applications…</div>
          ) : loanApplicationsError ? (
            <div className="history-error" role="alert">{loanApplicationsError}</div>
          ) : visibleLoanApplications.length ? (
            <div className="loan-application-list">
              {visibleLoanApplications.map((application) => (
                <article className="loan-application-item" key={application.applicationId}>
                  <div><strong>{application.loanType} loan</strong>
                    <span>Submitted {application.createdAt ? new Date(application.createdAt).toLocaleString("en-IN") : "date unavailable"}</span></div>
                  <div className="loan-application-values">
                    <span>Account: {displayAccountLabel(accounts, application.accountId)}</span>
                    <span>Amount: {displayAmount(application.principalAmount, hideAmounts)}</span>
                    <span>Estimated EMI: {displayAmount(application.monthlyEmi, hideAmounts)}</span>
                    <span>Term: {application.tenureMonths} months</span>
                  </div>
                  <div className="loan-record-actions">
                    <span className={`status-pill ${application.status.toLowerCase()}`}>{application.status.replaceAll("_", " ").toLowerCase()}</span>
                    <button className="statement-button" type="button" onClick={() => loadLoanIntoCalculator(application)}>
                      Estimate this loan
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">{applications.length ? "No applications match this status." : "No loan applications found for your accounts."}</div>
          )}
        </section>
      </main>
      <footer>© 2026 BankEase | NextGen Net Banking</footer>
    </div>
  );
}

function InvestmentCalculator({ fullName, accounts, hideAmounts, onTogglePrivacy, onLogout, onBack }) {
  const [monthlyContribution, setMonthlyContribution] = useState("5000");
  const [annualReturn, setAnnualReturn] = useState("12");
  const [termYears, setTermYears] = useState("10");
  const [investmentType, setInvestmentType] = useState("Mutual Fund");
  const [investmentTypeFilter, setInvestmentTypeFilter] = useState("ALL");
  const [investmentStatusFilter, setInvestmentStatusFilter] = useState("ALL");
  const [investmentAccountFilter, setInvestmentAccountFilter] = useState("ALL");
  const [investmentSearch, setInvestmentSearch] = useState("");
  const [investmentName, setInvestmentName] = useState("");
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.accountId ?? "");
  const [investments, setInvestments] = useState([]);
  const [investmentError, setInvestmentError] = useState("");
  const [investmentMessage, setInvestmentMessage] = useState(null);
  const [investmentStatusMessage, setInvestmentStatusMessage] = useState(null);
  const [isUpdatingInvestmentId, setIsUpdatingInvestmentId] = useState(null);
  const [isSubmittingInvestment, setIsSubmittingInvestment] = useState(false);
  const [isLoadingInvestments, setIsLoadingInvestments] = useState(true);
  const [portfolioAsOf, setPortfolioAsOf] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/investments")
      .then(async (response) => {
        const result = await readResponse(response);
        if (!response.ok) throw new Error(result.message || result.detail || "Could not load investments.");
        if (active) {
          setInvestments(Array.isArray(result) ? result : []);
          setPortfolioAsOf(Date.now());
        }
      })
      .catch((error) => { if (active) setInvestmentError(error.message || "Could not load investments."); })
      .finally(() => { if (active) setIsLoadingInvestments(false); });
    return () => { active = false; };
  }, []);

  async function submitInvestment(event) {
    event.preventDefault();
    setInvestmentMessage(null);
    setInvestmentError("");
    setIsSubmittingInvestment(true);
    try {
      const response = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: Number(accountId), investmentType, investmentName, amount: Number(investmentAmount),
          expectedReturn: expectedReturn === "" ? null : Number(expectedReturn),
          maturityDate: maturityDate || null,
        }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.message || result.detail || "Could not save the investment record.");
      setInvestments((current) => [result, ...current]);
      setPortfolioAsOf(Date.now());
      setInvestmentName(""); setInvestmentAmount(""); setExpectedReturn(""); setMaturityDate("");
      setInvestmentMessage({ type: "success", text: "Demo investment record saved. No money was invested or deducted." });
    } catch (error) {
      setInvestmentMessage({ type: "error", text: error.message || "Could not reach BankEase." });
    } finally { setIsSubmittingInvestment(false); }
  }

  async function updateInvestmentStatus(investmentId, status) {
    setInvestmentStatusMessage(null);
    setIsUpdatingInvestmentId(investmentId);
    try {
      const response = await fetch(`/api/investments/${investmentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.message || result.detail || "Could not update this investment.");
      setInvestments((current) => current.map((investment) =>
        investment.investmentId === result.investmentId ? result : investment));
      setInvestmentStatusMessage({ type: "success", text: `Investment marked ${status.toLowerCase()}.` });
    } catch (error) {
      setInvestmentStatusMessage({ type: "error", text: error.message || "Could not reach BankEase." });
    } finally { setIsUpdatingInvestmentId(null); }
  }
  const contribution = Number(monthlyContribution);
  const rate = Number(annualReturn);
  const years = Number(termYears);
  const months = Math.round(years * 12);
  const monthlyRate = rate / 1200;
  const valid = Number.isFinite(contribution) && contribution > 0 && contribution <= 9999999999999.99
    && Number.isFinite(rate) && rate >= 0 && rate <= 100
    && Number.isInteger(years) && years > 0 && years <= 40;
  const invested = valid ? contribution * months : 0;
  const futureValue = !valid ? 0 : monthlyRate === 0 ? invested
    : contribution * (((1 + monthlyRate) ** months - 1) / monthlyRate);
  const estimatedGrowth = futureValue - invested;
  const sipProjection = valid ? Array.from({ length: years }, (_, index) => {
    const year = index + 1;
    const contributed = contribution * year * 12;
    const projected = monthlyRate === 0 ? contributed
      : contribution * (((1 + monthlyRate) ** (year * 12) - 1) / monthlyRate);
    return { year, contributed, projected };
  }) : [];
  const activeInvestments = investments.filter((investment) => investment.status?.toUpperCase() === "ACTIVE");
  const maturityReminders = activeInvestments.map((investment) => ({
    ...investment,
    daysRemaining: daysUntilMaturity(investment.maturityDate, portfolioAsOf),
  })).filter((investment) => investment.daysRemaining !== null && investment.daysRemaining <= 30)
    .sort((first, second) => first.daysRemaining - second.daysRemaining);
  const activePrincipal = activeInvestments.reduce((total, investment) => total + Number(investment.amount || 0), 0);
  const estimateInputs = activeInvestments.filter((investment) =>
    investment.expectedReturn != null && investment.investmentDate
      && Number.isFinite(Number(investment.expectedReturn))
      && Number.isFinite(new Date(investment.investmentDate).getTime())
      && Number.isFinite(Number(investment.amount)));
  const estimatedPortfolioValue = estimateInputs.reduce((total, investment) =>
    total + (estimatedInvestmentValue(investment, portfolioAsOf) || 0), 0);
  const visibleInvestments = investments.filter((investment) =>
    (investmentTypeFilter === "ALL" || investment.investmentType === investmentTypeFilter)
    && (investmentStatusFilter === "ALL" || investment.status?.toUpperCase() === investmentStatusFilter)
    && (investmentAccountFilter === "ALL" || String(investment.accountId) === investmentAccountFilter)
    && `${investment.investmentName || ""} ${investment.investmentType || ""} ${investment.status || ""}`
      .toLowerCase().includes(investmentSearch.trim().toLowerCase()));

  function exportInvestments() {
    downloadCsv(`bankease-investments-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Investment Name", "Investment Type", "Amount INR", "Expected Return %", "Maturity Date", "Status", "Investment Date"],
      visibleInvestments.map((investment) => [investment.investmentName, investment.investmentType,
        investment.amount, investment.expectedReturn, investment.maturityDate, investment.status,
        investment.investmentDate]));
  }

  function downloadSipProjection() {
    downloadCsv(`bankease-sip-projection-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Year", "Total Contributions INR", "Hypothetical Projected Value INR", "Illustrative Growth INR"],
      sipProjection.map((point) => [point.year, point.contributed, point.projected, point.projected - point.contributed]));
  }

  return (
    <div className="app dashboard-app">
      <header className="navbar dashboard-navbar">
        <h2>Bank<span>Ease</span></h2>
        <div className="dashboard-nav-actions">
          <span className="signed-in-label">Signed in as {fullName}</span>
          <PrivacyToggle hidden={hideAmounts} onToggle={onTogglePrivacy} />
          <button className="logout-button" type="button" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      <main className="dashboard-main history-main">
        <button className="back-button" type="button" onClick={onBack}>← Back to dashboard</button>
        <section className="dashboard-heading history-heading">
          <p className="tagline">INVESTMENT TOOLS</p>
          <h1>SIP growth calculator</h1>
          <p className="description">Explore how regular monthly contributions could grow under an assumed annual return.</p>
        </section>
        <p className="investment-demo-notice">Illustration only. Returns are not guaranteed and this is not investment advice or an actual investment product.</p>
        <section className="portfolio-overview" aria-label="Investment portfolio overview">
          <article className="portfolio-overview-card">
            <span>Active recorded amount</span>
            <strong>{isLoadingInvestments ? "Loading…" : displayAmount(activePrincipal, hideAmounts)}</strong>
            <small>{isLoadingInvestments ? "Loading your records" : `${activeInvestments.length} active ${activeInvestments.length === 1 ? "record" : "records"}`}</small>
          </article>
          <article className="portfolio-overview-card estimated-portfolio-card">
            <span>Hypothetical value today</span>
            <strong>{isLoadingInvestments ? "Loading…" : estimateInputs.length ? displayAmount(estimatedPortfolioValue, hideAmounts) : "Not available"}</strong>
            <small>{isLoadingInvestments ? "Calculating from your records" : `${estimateInputs.length} of ${activeInvestments.length} active records have an expected return`}</small>
          </article>
        </section>
        <p className="portfolio-estimate-note">The estimate assumes annual compounding from each record’s entry date using its expected return. It is not a market price or actual investment valuation.</p>
        <section className="maturity-tracker" aria-labelledby="maturity-tracker-heading">
          <div className="section-heading">
            <div><h2 id="maturity-tracker-heading">Maturity tracker</h2><p>Active investments overdue or due within the next 30 days.</p></div>
          </div>
          {isLoadingInvestments ? <div className="empty-state" role="status">Checking maturity dates…</div>
            : maturityReminders.length ? <div className="maturity-reminder-list">{maturityReminders.map((investment) => {
              const days = investment.daysRemaining;
              const reminderText = days < 0 ? `Overdue by ${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"}`
                : days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due in ${days} days`;
              const urgency = days < 0 ? "overdue" : days <= 7 ? "due-soon" : "upcoming";
              return <article className="maturity-reminder" key={investment.investmentId}>
                <div><strong>{investment.investmentName}</strong><span>{investment.investmentType} · Maturity {investment.maturityDate}</span></div>
                <div className="maturity-reminder-actions">
                  <span className={`maturity-urgency ${urgency}`}>{reminderText}</span>
                  {days <= 0 && <button className="statement-button" type="button"
                    disabled={isUpdatingInvestmentId === investment.investmentId}
                    onClick={() => updateInvestmentStatus(investment.investmentId, "MATURED")}>
                    {isUpdatingInvestmentId === investment.investmentId ? "Updating…" : "Mark matured"}
                  </button>}
                </div>
              </article>;
            })}</div>
              : <div className="empty-state">No active investment maturities are due within 30 days.</div>}
        </section>
        <div className="loan-calculator-layout">
          <form className="loan-input-card" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor="sip-contribution">Monthly contribution (INR)</label>
            <input id="sip-contribution" type={hideAmounts ? "password" : "number"} inputMode="decimal"
              min="1" max="9999999999999.99" step="0.01" value={monthlyContribution}
              onChange={(event) => setMonthlyContribution(event.target.value)} required />
            <label htmlFor="sip-return">Assumed annual return (%)</label>
            <input id="sip-return" type="number" min="0" max="100" step="0.01" value={annualReturn}
              onChange={(event) => setAnnualReturn(event.target.value)} required />
            <label htmlFor="sip-term">Contribution period (years)</label>
            <input id="sip-term" type="number" min="1" max="40" step="1" value={termYears}
              onChange={(event) => setTermYears(event.target.value)} required />
          </form>
          <section className="loan-results" aria-live="polite" aria-label="Illustrative investment results">
            <article className="loan-result-card loan-emi-result investment-value-result">
              <p>Illustrative future value</p>
              <strong>{valid ? displayAmount(futureValue, hideAmounts) : "Enter valid values"}</strong>
              <span>Estimated value after {valid ? `${months} monthly contributions` : "the selected period"}</span>
            </article>
            <article className="loan-result-card">
              <p>Total contributions</p>
              <strong>{valid ? displayAmount(invested, hideAmounts) : "—"}</strong>
            </article>
            <article className="loan-result-card">
              <p>Illustrative growth</p>
              <strong>{valid ? displayAmount(estimatedGrowth, hideAmounts) : "—"}</strong>
            </article>
          </section>
        </div>
        <section className="sip-projection-section" aria-labelledby="sip-projection-heading">
          <div className="flow-chart-heading">
            <h3 id="sip-projection-heading">Year-by-year SIP projection</h3>
            <div className="flow-legend" aria-hidden="true">
              <span><i className="sip-contributed" />Contributions</span>
              <span><i className="sip-projected" />Projected value</span>
            </div>
            <button className="statement-button" type="button" onClick={downloadSipProjection}
              disabled={!valid || hideAmounts}>Download projection CSV</button>
          </div>
          {!valid ? <div className="empty-state">Enter valid contribution, return, and period values to view the projection.</div>
            : hideAmounts ? <p className="flow-chart-hidden">Chart hidden while amounts are hidden.</p>
              : <div className="sip-projection-chart" role="list" aria-label="Year-by-year SIP contribution and projected value">
                {sipProjection.map((point) => {
                  const contributionHeight = Math.max(3, (point.contributed / futureValue) * 100);
                  const projectedHeight = Math.max(3, (point.projected / futureValue) * 100);
                  return <div className="sip-projection-year" key={point.year} role="listitem"
                    aria-label={`Year ${point.year}: contributed ${currency.format(point.contributed)}, projected value ${currency.format(point.projected)}`}>
                    <div className="sip-projection-bars">
                      <span className="sip-projection-bar sip-contributed" style={{ height: `${contributionHeight}%` }} title={`Contributions: ${currency.format(point.contributed)}`} />
                      <span className="sip-projection-bar sip-projected" style={{ height: `${projectedHeight}%` }} title={`Projected value: ${currency.format(point.projected)}`} />
                    </div>
                    <span className="sip-projection-label">Year {point.year}</span>
                  </div>;
                })}
              </div>}
          <p className="amortization-note">Illustrative values assume the same monthly contribution and annual return for the full term. Actual returns can differ.</p>
        </section>
        <section className="loan-application-section" aria-labelledby="investment-record-heading">
          <div className="section-heading"><div><h2 id="investment-record-heading">Record a demo investment</h2><p>Save a sample record to the same investments table used by the desktop app.</p></div></div>
          <form className="loan-application-card" onSubmit={submitInvestment}>
            <label htmlFor="investment-account">Account</label>
            <select id="investment-account" value={accountId} onChange={(event) => setAccountId(event.target.value)} required>
              <option value="">Choose your account</option>
              {accounts.map((account) => <option key={account.accountId} value={account.accountId}>{account.accountType} · {account.accountNumber}</option>)}
            </select>
            <label htmlFor="investment-type">Investment type</label>
            <select id="investment-type" value={investmentType} onChange={(event) => setInvestmentType(event.target.value)}>
              <option>Fixed Deposit</option><option>Mutual Fund</option><option>Stocks</option>
            </select>
            <label htmlFor="investment-name">Investment name</label>
            <input id="investment-name" maxLength="100" value={investmentName} onChange={(event) => setInvestmentName(event.target.value)} required />
            <label htmlFor="investment-amount">Amount (INR)</label>
            <input id="investment-amount" type={hideAmounts ? "password" : "number"} min="0.01" max="9999999999999.99" step="0.01" value={investmentAmount} onChange={(event) => setInvestmentAmount(event.target.value)} required />
            <label htmlFor="investment-expected-return">Expected annual return (%) (optional)</label>
            <input id="investment-expected-return" type="number" min="0" max="100" step="0.01" value={expectedReturn} onChange={(event) => setExpectedReturn(event.target.value)} />
            <label htmlFor="investment-maturity">Maturity date (optional)</label>
            <input id="investment-maturity" type="date" value={maturityDate} onChange={(event) => setMaturityDate(event.target.value)} />
            {investmentMessage && <p className={`transfer-message ${investmentMessage.type}`} role={investmentMessage.type === "error" ? "alert" : "status"}>{investmentMessage.text}</p>}
            <button className="transfer-submit" type="submit" disabled={!accountId || !accounts.length || !investmentName.trim() || !Number(investmentAmount) || isSubmittingInvestment}>{isSubmittingInvestment ? "Saving…" : "Save demo record"}</button>
          </form>
          <p className="investment-demo-notice">Demo record only. This does not purchase an investment and does not change your account balance.</p>
        </section>
        <section className="loan-applications-section" aria-labelledby="my-investments-heading">
          <div className="section-heading"><div><h2 id="my-investments-heading">My investments</h2><p>Records tied to your accounts, including entries from the desktop app.</p></div></div>
          {investmentStatusMessage && <p className={`transfer-message ${investmentStatusMessage.type}`} role={investmentStatusMessage.type === "error" ? "alert" : "status"}>{investmentStatusMessage.text}</p>}
          <div className="module-filter-row investment-filter-row module-filter-actions">
            <label htmlFor="investment-search">Search investments
              <input id="investment-search" type="search" value={investmentSearch} onChange={(event) => setInvestmentSearch(event.target.value)} placeholder="Name, type, or status" />
            </label>
            <label htmlFor="investment-type-filter">Type
              <select id="investment-type-filter" value={investmentTypeFilter} onChange={(event) => setInvestmentTypeFilter(event.target.value)}>
                <option value="ALL">All types</option><option>Fixed Deposit</option><option>Mutual Fund</option><option>Stocks</option>
              </select>
            </label>
            <label htmlFor="investment-status-filter">Status
              <select id="investment-status-filter" value={investmentStatusFilter} onChange={(event) => setInvestmentStatusFilter(event.target.value)}>
                <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="MATURED">Matured</option><option value="CLOSED">Closed</option>
              </select>
            </label>
            <label htmlFor="investment-account-filter">Account
              <select id="investment-account-filter" value={investmentAccountFilter} onChange={(event) => setInvestmentAccountFilter(event.target.value)}>
                <option value="ALL">All accounts</option>
                {accounts.map((account) => <option key={account.accountId} value={account.accountId}>{account.accountType} · {account.accountNumber}</option>)}
              </select>
            </label>
            <button className="statement-button" type="button" onClick={exportInvestments}
              disabled={!visibleInvestments.length || hideAmounts || isLoadingInvestments}>
              Export filtered CSV
            </button>
          </div>
          {isLoadingInvestments ? <div className="empty-state" role="status">Loading investments…</div>
            : investmentError ? <div className="history-error" role="alert">{investmentError}</div>
              : visibleInvestments.length ? <div className="loan-application-list">{visibleInvestments.map((investment) => {
                const estimatedValue = estimatedInvestmentValue(investment, portfolioAsOf);
                return (
                  <article className="loan-application-item" key={investment.investmentId}>
                    <div><strong>{investment.investmentName}</strong><span>{investment.investmentType} · {investment.status.toLowerCase()}</span></div>
                    <div className="loan-application-values"><span>Amount: {displayAmount(investment.amount, hideAmounts)}</span>
                      <span>Account: {displayAccountLabel(accounts, investment.accountId)}</span>
                      {investment.expectedReturn != null && <span>Expected: {investment.expectedReturn}%</span>}
                      <span>Hypothetical value: {estimatedValue == null ? "—" : displayAmount(estimatedValue, hideAmounts)}</span>
                      {investment.maturityDate && <span>Maturity: {investment.maturityDate}</span>}</div>
                    <div className="investment-record-actions">
                      <span>{investment.investmentDate ? new Date(investment.investmentDate).toLocaleDateString("en-IN") : "—"}</span>
                      {investment.status?.toUpperCase() === "ACTIVE" && <>
                        <button className="statement-button" type="button" disabled={isUpdatingInvestmentId === investment.investmentId}
                          onClick={() => updateInvestmentStatus(investment.investmentId, "MATURED")}>Mark matured</button>
                        <button className="statement-button" type="button" disabled={isUpdatingInvestmentId === investment.investmentId}
                          onClick={() => updateInvestmentStatus(investment.investmentId, "CLOSED")}>Close</button>
                      </>}
                      {investment.status?.toUpperCase() === "MATURED" && <button className="statement-button" type="button"
                        disabled={isUpdatingInvestmentId === investment.investmentId}
                        onClick={() => updateInvestmentStatus(investment.investmentId, "CLOSED")}>Close</button>}
                    </div>
                  </article>
                );
              })}</div>
                : <div className="empty-state">{investments.length ? "No investments match these filters." : "No investment records found for your accounts."}</div>}
        </section>
      </main>
      <footer>© 2026 BankEase | NextGen Net Banking</footer>
    </div>
  );
}

function csvCell(value) {
  const text = String(value ?? "");
  const safeText = /^[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function downloadCsv(filename, headers, rows) {
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function AdminLoanApplications() {
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  async function loadApplications(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/loan-applications");
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.detail || result.message || "Could not load loan applications.");
      setApplications(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(loadError.message || "Could not load loan applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/loan-applications")
      .then(async (response) => {
        const result = await readResponse(response);
        if (!response.ok) throw new Error(result.detail || result.message || "Could not load loan applications.");
        if (active) setApplications(Array.isArray(result) ? result : []);
      })
      .catch((loadError) => { if (active) setError(loadError.message || "Could not load loan applications."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function decide(loanId, status) {
    setSavingId(loanId);
    setError("");
    try {
      const response = await fetch(`/api/admin/loan-applications/${loanId}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.detail || result.message || "Could not update this application.");
      setApplications((current) => current.map((item) => item.loanId === loanId ? result : item));
    } catch (decisionError) {
      setError(decisionError.message || "Could not update this application.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="dashboard-section admin-loans-section">
      <div className="section-heading">
        <div><h2>Loan applications</h2><p>Review pending demo applications in the shared loans table.</p></div>
        <button className="text-button" type="button" onClick={() => loadApplications()} disabled={loading}>Refresh</button>
      </div>
      <p className="loan-application-disclaimer">Approvals here update the demo application status only. They do not create a loan balance or disburse funds.</p>
      {error && <p className="history-error" role="alert">{error}</p>}
      {loading ? <div className="empty-state">Loading loan applications…</div>
        : applications.length ? <div className="loan-application-list">
          {applications.map((application) => (
            <article className="loan-application-item admin-loan-item" key={application.loanId}>
              <div><strong>{application.loanType} loan · #{application.loanId}</strong>
                <span>Account {application.accountId} · {application.status}</span></div>
              <div className="loan-application-values">
                <span>Amount: {currency.format(Number(application.loanAmount || 0))}</span>
                <span>Rate: {application.interestRate}% · Term: {application.tenureMonths} months</span>
                <span>{application.purpose || "No purpose provided"}</span>
              </div>
              {application.status === "PENDING" ? <div className="admin-loan-actions">
                <button type="button" className="admin-reject-button" disabled={savingId === application.loanId}
                  onClick={() => decide(application.loanId, "REJECTED")}>Reject</button>
                <button type="button" className="admin-approve-button" disabled={savingId === application.loanId}
                  onClick={() => decide(application.loanId, "APPROVED")}>{savingId === application.loanId ? "Saving…" : "Approve"}</button>
              </div> : <span className={`status-pill ${application.status?.toLowerCase() || ""}`}>{application.status}</span>}
            </article>
          ))}
        </div> : <div className="empty-state">No loan applications are available.</div>}
    </section>
  );
}

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [registration, setRegistration] = useState({ fullName: "", email: "", phone: "", password: "", dateOfBirth: "", address: "" });
  const [view, setView] = useState("dashboard");
  const [transactionPage, setTransactionPage] = useState(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionError, setTransactionError] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("");
  const [transactionStatusFilter, setTransactionStatusFilter] = useState("");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionAccountFilter, setTransactionAccountFilter] = useState("");
  const [transactionFromDate, setTransactionFromDate] = useState("");
  const [transactionToDate, setTransactionToDate] = useState("");
  const [transferSourceId, setTransferSourceId] = useState("");
  const [recipientAccountNumber, setRecipientAccountNumber] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferMessage, setTransferMessage] = useState(null);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [isDownloadingStatement, setIsDownloadingStatement] = useState(false);
  const [statementMessage, setStatementMessage] = useState("");
  const [billSourceId, setBillSourceId] = useState("");
  const [billType, setBillType] = useState("ELECTRICITY");
  const [billAmount, setBillAmount] = useState("");
  const [billMessage, setBillMessage] = useState(null);
  const [isPayingBill, setIsPayingBill] = useState(false);
  const [ifscCopyStatus, setIfscCopyStatus] = useState({ accountId: null, text: "" });
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/dashboard")
      .then(async (response) => {
        const result = await readResponse(response);
        if (active && response.ok) setDashboard(result);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsCheckingSession(false);
      });

    return () => { active = false; };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await readResponse(response);

      if (!response.ok) {
        setMessage(result.message || "Unable to sign in. Please try again.");
        return;
      }

      const dashboardResponse = await fetch("/api/dashboard");
      const dashboardResult = await readResponse(dashboardResponse);
      if (!dashboardResponse.ok) {
        setMessage(dashboardResult.message || "Signed in, but could not load your dashboard.");
        return;
      }
      setDashboard(dashboardResult);
      setView("dashboard");
      setPassword("");
    } catch {
      setMessage("Could not reach BankEase. Check that the backend is running on port 8080.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegistration(event) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registration),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.detail || result.message || "Unable to create your account.");
      const dashboardResponse = await fetch("/api/dashboard");
      const dashboardResult = await readResponse(dashboardResponse);
      if (!dashboardResponse.ok) throw new Error(dashboardResult.detail || dashboardResult.message || "Account created, but the dashboard could not be loaded.");
      setDashboard(dashboardResult);
      setView("dashboard");
      setRegistration({ fullName: "", email: "", phone: "", password: "", dateOfBirth: "", address: "" });
    } catch (error) {
      setMessage(error.message || "Unable to create your account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyIfsc(account) {
    try {
      await navigator.clipboard.writeText(account.ifscCode);
      setIfscCopyStatus({ accountId: account.accountId, text: "Copied" });
    } catch {
      setIfscCopyStatus({ accountId: account.accountId, text: "Copy unavailable" });
    }
    window.setTimeout(() => setIfscCopyStatus({ accountId: null, text: "" }), 2000);
  }

  async function loadTransactions(page, filters = {
    type: transactionTypeFilter,
    status: transactionStatusFilter,
    search: transactionSearch,
    accountId: transactionAccountFilter,
    from: transactionFromDate,
    to: transactionToDate,
  }) {
    setIsLoadingTransactions(true);
    setTransactionError("");
    try {
      const query = new URLSearchParams({ page: String(page), size: "20" });
      if (filters.type) query.set("type", filters.type);
      if (filters.status) query.set("status", filters.status);
      if (filters.search.trim()) query.set("search", filters.search.trim());
      if (filters.accountId) query.set("accountId", filters.accountId);
      if (filters.from) query.set("from", filters.from);
      if (filters.to) query.set("to", filters.to);
      const response = await fetch(`/api/dashboard/transactions?${query.toString()}`);
      const result = await readResponse(response);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setDashboard(null);
          setView("dashboard");
          setMessage("Your session has expired. Please sign in again.");
          return;
        }
        throw new Error(result.message || "Could not load transaction history.");
      }
      setTransactionPage(result);
      setView("transactions");
    } catch (error) {
      setTransactionError(error.message || "Could not load transaction history.");
      setView("transactions");
    } finally {
      setIsLoadingTransactions(false);
    }
  }

  function applyDatePreset(days) {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - (days - 1));
    const asDateInput = (date) => {
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
      return localDate.toISOString().slice(0, 10);
    };
    const fromDate = asDateInput(from);
    const toDate = asDateInput(to);
    setTransactionFromDate(fromDate);
    setTransactionToDate(toDate);
    loadTransactions(0, {
      type: transactionTypeFilter,
      status: transactionStatusFilter,
      search: transactionSearch,
      accountId: transactionAccountFilter,
      from: fromDate,
      to: toDate,
    });
  }

  async function downloadStatement() {
    setStatementMessage("");
    setIsDownloadingStatement(true);
    try {
      const query = new URLSearchParams({ page: "0", size: "50" });
      if (transactionTypeFilter) query.set("type", transactionTypeFilter);
      if (transactionStatusFilter) query.set("status", transactionStatusFilter);
      if (transactionSearch.trim()) query.set("search", transactionSearch.trim());
      if (transactionAccountFilter) query.set("accountId", transactionAccountFilter);
      if (transactionFromDate) query.set("from", transactionFromDate);
      if (transactionToDate) query.set("to", transactionToDate);
      const firstResponse = await fetch(`/api/dashboard/transactions?${query.toString()}`);
      const firstPage = await readResponse(firstResponse);
      if (!firstResponse.ok) {
        if (firstResponse.status === 401 || firstResponse.status === 403) {
          setDashboard(null);
          setView("dashboard");
          setMessage("Your session has expired. Please sign in again.");
          return;
        }
        throw new Error(firstPage.message || firstPage.detail || "Could not download your statement.");
      }

      const transactions = [...(firstPage.transactions || [])];
      for (let page = 1; page < firstPage.totalPages; page += 1) {
        const pageQuery = new URLSearchParams(query);
        pageQuery.set("page", String(page));
        const response = await fetch(`/api/dashboard/transactions?${pageQuery.toString()}`);
        const result = await readResponse(response);
        if (!response.ok) throw new Error(result.message || result.detail || "Could not download your full statement.");
        transactions.push(...(result.transactions || []));
      }

      const rows = [
        ["Transaction ID", "Date", "Type", "Direction", "Status", "Reference", "Amount (INR)"],
        ...transactions.map((transaction) => [
          transaction.transactionId,
          transaction.createdAt ? new Date(transaction.createdAt).toLocaleString("en-IN") : "",
          transaction.transactionType,
          transaction.direction,
          transaction.status,
          transaction.referenceNumber,
          transaction.amount,
        ]),
      ];
      const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `bankease-statement-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatementMessage(`${transactions.length} ${transactions.length === 1 ? "transaction" : "transactions"} downloaded.`);
    } catch (error) {
      setStatementMessage(error.message || "Could not download your statement.");
    } finally {
      setIsDownloadingStatement(false);
    }
  }

  async function handleTransfer(event) {
    event.preventDefault();
    if (!window.confirm(`Send ${currency.format(Number(transferAmount))} to account ${recipientAccountNumber.trim()}?`)) return;
    setTransferMessage(null);
    setIsSubmittingTransfer(true);
    try {
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceAccountId: Number(transferSourceId),
          recipientAccountNumber,
          amount: transferAmount,
        }),
      });
      const result = await readResponse(response);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setDashboard(null);
          setMessage("Your session has expired. Please sign in again.");
          setView("dashboard");
          return;
        }
        throw new Error(result.detail || result.message || "Could not complete the transfer.");
      }

      setTransferMessage({ type: "success", text: `${result.message} Reference: ${result.referenceNumber}` });
      setRecipientAccountNumber("");
      setTransferAmount("");
      const dashboardResponse = await fetch("/api/dashboard");
      if (dashboardResponse.ok) setDashboard(await readResponse(dashboardResponse));
    } catch (error) {
      setTransferMessage({ type: "error", text: error.message || "Could not reach BankEase." });
    } finally {
      setIsSubmittingTransfer(false);
    }
  }

  async function handleBillPayment(event) {
    event.preventDefault();
    if (!window.confirm(`Record a ${billType.toLowerCase()} bill payment of ${currency.format(Number(billAmount))} in the BankEase demo ledger?`)) return;
    setBillMessage(null);
    setIsPayingBill(true);
    try {
      const response = await fetch("/api/bill-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceAccountId: Number(billSourceId), biller: billType, amount: billAmount }),
      });
      const result = await readResponse(response);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          setDashboard(null);
          setMessage("Your session has expired. Please sign in again.");
          setView("dashboard");
          return;
        }
        throw new Error(result.detail || result.message || "Could not record the bill payment.");
      }

      setBillMessage({ type: "success", text: `${result.message} Reference: ${result.referenceNumber}` });
      setBillAmount("");
      const dashboardResponse = await fetch("/api/dashboard");
      if (dashboardResponse.ok) setDashboard(await readResponse(dashboardResponse));
    } catch (error) {
      setBillMessage({ type: "error", text: error.message || "Could not reach BankEase." });
    } finally {
      setIsPayingBill(false);
    }
  }

  function showDashboard() {
    setView("dashboard");
    setTransactionError("");
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setDashboard(null);
      setView("dashboard");
      setTransactionPage(null);
      setEmail("");
      setPassword("");
      setMessage("You have signed out.");
    }
  }

  if (isCheckingSession) {
    return <div className="page-loading" role="status">Loading BankEase…</div>;
  }

  if (dashboard) {
    const totalBalance = dashboard.accounts.reduce(
      (total, account) => total + Number(account.balance || 0), 0,
    );
    const monthNet = Number(dashboard.monthlySummary?.netMovement || 0);
    const monthlyFlows = dashboard.monthlySummary?.lastSixMonths || [];
    const flowMax = Math.max(0, ...monthlyFlows.flatMap((month) => [Number(month.moneyIn || 0), Number(month.moneyOut || 0)]));

    if (view === "admin-loans") {
      return (
        <div className="app dashboard-app">
          <header className="navbar dashboard-navbar">
            <h2>Bank<span>Ease</span></h2>
            <div className="dashboard-nav-actions">
              <span className="signed-in-label">Administrator · {dashboard.fullName}</span>
              <button className="logout-button" type="button" onClick={() => setView("dashboard")}>Back to dashboard</button>
              <button className="logout-button" type="button" onClick={handleLogout}>Sign out</button>
            </div>
          </header>
          <main className="dashboard-main"><section className="dashboard-heading">
            <p className="tagline">BANK EASE ADMIN</p><h1>Loan review</h1>
            <p className="description">Review and decide pending loan applications.</p>
          </section><AdminLoanApplications /></main>
          <footer>© 2026 BankEase | College demo</footer>
        </div>
      );
    }

    if (view === "transactions") {
      return (
        <div className="app dashboard-app">
          <header className="navbar dashboard-navbar">
            <h2>Bank<span>Ease</span></h2>
            <div className="dashboard-nav-actions">
              <span className="signed-in-label">Signed in as {dashboard.fullName}</span>
              <PrivacyToggle hidden={isPrivacyMode} onToggle={() => setIsPrivacyMode((hidden) => !hidden)} />
              <button className="logout-button" type="button" onClick={handleLogout}>Sign out</button>
            </div>
          </header>
          <main className="dashboard-main history-main">
            <button className="back-button" type="button" onClick={showDashboard}>← Back to dashboard</button>
            <section className="dashboard-heading history-heading">
              <p className="tagline">ACCOUNT ACTIVITY</p>
              <h1>Transaction history</h1>
              <p className="description">Review activity across your linked accounts.</p>
            </section>
            {isLoadingTransactions ? (
              <div className="empty-state" role="status">Loading transaction history…</div>
            ) : transactionError ? (
              <div className="history-error" role="alert">{transactionError}</div>
            ) : transactionPage ? (
              <>
                <p className="history-count">{transactionPage.totalElements} {transactionPage.totalElements === 1 ? "transaction" : "transactions"}</p>
                <form className="transaction-filters" onSubmit={(event) => { event.preventDefault(); loadTransactions(0); }}>
                  <label htmlFor="transaction-search">Reference number
                    <input id="transaction-search" type="search" maxLength="60" placeholder="Search reference"
                      value={transactionSearch} onChange={(event) => setTransactionSearch(event.target.value)} />
                  </label>
                  <label htmlFor="transaction-type-filter">Type
                    <select id="transaction-type-filter" value={transactionTypeFilter} onChange={(event) => setTransactionTypeFilter(event.target.value)}>
                      <option value="">All types</option>
                      <option value="TRANSFER">Transfers</option>
                      <option value="BILL_PAYMENT">Bill payments</option>
                    </select>
                  </label>
                  <label htmlFor="transaction-account-filter">Account
                    <select id="transaction-account-filter" value={transactionAccountFilter}
                      onChange={(event) => setTransactionAccountFilter(event.target.value)}>
                      <option value="">All accounts</option>
                      {dashboard.accounts.map((account) => (
                        <option key={account.accountId} value={account.accountId}>
                          {account.accountType} · {account.accountNumber}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label htmlFor="transaction-status-filter">Status
                    <select id="transaction-status-filter" value={transactionStatusFilter} onChange={(event) => setTransactionStatusFilter(event.target.value)}>
                      <option value="">All statuses</option>
                      <option value="SUCCESS">Success</option>
                      <option value="PENDING">Pending</option>
                      <option value="FAILED">Failed</option>
                    </select>
                  </label>
                  <label htmlFor="transaction-from-date">From date
                    <input id="transaction-from-date" type="date" max={transactionToDate || undefined} value={transactionFromDate}
                      onChange={(event) => setTransactionFromDate(event.target.value)} />
                  </label>
                  <label htmlFor="transaction-to-date">To date
                    <input id="transaction-to-date" type="date" min={transactionFromDate || undefined} value={transactionToDate}
                      onChange={(event) => setTransactionToDate(event.target.value)} />
                  </label>
                  <div className="date-presets" aria-label="Quick date ranges">
                    <span>Last</span>
                    {[7, 30, 90].map((days) => (
                      <button className="logout-button" key={days} type="button" onClick={() => applyDatePreset(days)}>
                        {days} days
                      </button>
                    ))}
                  </div>
                  <div className="filter-buttons">
                    <button className="transfer-submit" type="submit" disabled={isLoadingTransactions}>Apply filters</button>
                    <button className="logout-button" type="button" disabled={isLoadingTransactions}
                      onClick={() => {
                        setTransactionTypeFilter("");
                        setTransactionStatusFilter("");
                        setTransactionSearch("");
                        setTransactionAccountFilter("");
                        setTransactionFromDate("");
                        setTransactionToDate("");
                        loadTransactions(0, { type: "", status: "", search: "", accountId: "", from: "", to: "" });
                      }}>Clear</button>
                  </div>
                </form>
                {transactionError && <div className="history-error" role="alert">{transactionError}</div>}
                <div className="statement-actions">
                  <button className="statement-button" type="button" onClick={downloadStatement} disabled={isDownloadingStatement}>
                    {isDownloadingStatement ? "Preparing statement…" : "Download CSV statement"}
                  </button>
                  {statementMessage && <span className="statement-message" role="status">{statementMessage}</span>}
                </div>
                <TransactionRows transactions={transactionPage.transactions} hideAmounts={isPrivacyMode} />
                {transactionPage.totalPages > 1 && (
                  <nav className="pagination" aria-label="Transaction history pages">
                    <button type="button" disabled={!transactionPage.hasPrevious || isLoadingTransactions}
                      onClick={() => loadTransactions(transactionPage.page - 1)}>Previous</button>
                    <span>Page {transactionPage.page + 1} of {transactionPage.totalPages}</span>
                    <button type="button" disabled={!transactionPage.hasNext || isLoadingTransactions}
                      onClick={() => loadTransactions(transactionPage.page + 1)}>Next</button>
                  </nav>
                )}
              </>
            ) : (
              <div className="empty-state">Transaction history hasn’t loaded yet.</div>
            )}
          </main>
          <footer>© 2026 BankEase | NextGen Net Banking</footer>
        </div>
      );
    }

    if (view === "loan-calculator") {
      return <LoanCalculator fullName={dashboard.fullName} accounts={dashboard.accounts} hideAmounts={isPrivacyMode}
        onTogglePrivacy={() => setIsPrivacyMode((hidden) => !hidden)} onLogout={handleLogout} onBack={showDashboard} />;
    }

    if (view === "investment-calculator") {
      return <InvestmentCalculator fullName={dashboard.fullName} accounts={dashboard.accounts} hideAmounts={isPrivacyMode}
        onTogglePrivacy={() => setIsPrivacyMode((hidden) => !hidden)} onLogout={handleLogout} onBack={showDashboard} />;
    }

    if (view === "transfer") {
      const sourceAccounts = dashboard.accounts.filter((account) => account.status?.toLowerCase() === "active");
      return (
        <div className="app dashboard-app">
          <header className="navbar dashboard-navbar">
            <h2>Bank<span>Ease</span></h2>
            <div className="dashboard-nav-actions">
              <span className="signed-in-label">Signed in as {dashboard.fullName}</span>
              <PrivacyToggle hidden={isPrivacyMode} onToggle={() => setIsPrivacyMode((hidden) => !hidden)} />
              <button className="logout-button" type="button" onClick={handleLogout}>Sign out</button>
            </div>
          </header>
          <main className="dashboard-main history-main">
            <button className="back-button" type="button" onClick={showDashboard}>← Back to dashboard</button>
            <section className="dashboard-heading history-heading">
              <p className="tagline">MOVE MONEY</p>
              <h1>Transfer funds</h1>
              <p className="description">Send money to an active BankEase account using its account number.</p>
            </section>
            <form className="transfer-card" onSubmit={handleTransfer}>
              <label htmlFor="source-account">From account</label>
              <select id="source-account" value={transferSourceId} onChange={(event) => setTransferSourceId(event.target.value)} required>
                <option value="">Choose an account</option>
                {sourceAccounts.map((account) => (
                  <option key={account.accountId} value={account.accountId}>
                    {account.accountType} · {account.accountNumber} · {displayAmount(account.balance, isPrivacyMode)}
                  </option>
                ))}
              </select>
              <label htmlFor="recipient-account">Recipient account number</label>
              <input id="recipient-account" type="text" inputMode="numeric" autoComplete="off"
                value={recipientAccountNumber} onChange={(event) => setRecipientAccountNumber(event.target.value)}
                placeholder="Enter the recipient’s account number" required />
              <label htmlFor="transfer-amount">Amount (INR)</label>
              <input id="transfer-amount" type="number" min="0.01" step="0.01" max="9999999999999.99"
                value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)}
                placeholder="0.00" required />
              {transferMessage && <p className={`transfer-message ${transferMessage.type}`} role={transferMessage.type === "error" ? "alert" : "status"}>{transferMessage.text}</p>}
              <div className="transfer-actions">
                <button className="logout-button" type="button" onClick={showDashboard}>Cancel</button>
                <button className="transfer-submit" type="submit" disabled={isSubmittingTransfer || !sourceAccounts.length}>
                  {isSubmittingTransfer ? "Processing…" : "Send transfer"}
                </button>
              </div>
              {!sourceAccounts.length && <p className="transfer-hint">There are no active accounts available to send from.</p>}
            </form>
          </main>
          <footer>© 2026 BankEase | NextGen Net Banking</footer>
        </div>
      );
    }

    if (view === "bill-payment") {
      const sourceAccounts = dashboard.accounts.filter((account) => account.status?.toLowerCase() === "active");
      return (
        <div className="app dashboard-app">
          <header className="navbar dashboard-navbar">
            <h2>Bank<span>Ease</span></h2>
            <div className="dashboard-nav-actions">
              <span className="signed-in-label">Signed in as {dashboard.fullName}</span>
              <PrivacyToggle hidden={isPrivacyMode} onToggle={() => setIsPrivacyMode((hidden) => !hidden)} />
              <button className="logout-button" type="button" onClick={handleLogout}>Sign out</button>
            </div>
          </header>
          <main className="dashboard-main history-main">
            <button className="back-button" type="button" onClick={showDashboard}>← Back to dashboard</button>
            <section className="dashboard-heading history-heading">
              <p className="tagline">BILL PAYMENTS</p>
              <h1>Record a bill payment</h1>
              <p className="description">Record a demo payment against one of your BankEase accounts.</p>
            </section>
            <p className="bill-payment-notice">Demo only: this updates the BankEase balance and transaction history. It does not contact or pay an external utility provider.</p>
            <form className="transfer-card" onSubmit={handleBillPayment}>
              <label htmlFor="bill-source-account">Pay from</label>
              <select id="bill-source-account" value={billSourceId} onChange={(event) => setBillSourceId(event.target.value)} required>
                <option value="">Choose an account</option>
                {sourceAccounts.map((account) => (
                  <option key={account.accountId} value={account.accountId}>
                    {account.accountType} · {account.accountNumber} · {displayAmount(account.balance, isPrivacyMode)}
                  </option>
                ))}
              </select>
              <label htmlFor="bill-type">Bill type</label>
              <select id="bill-type" value={billType} onChange={(event) => setBillType(event.target.value)}>
                <option value="ELECTRICITY">Electricity</option>
                <option value="WATER">Water</option>
                <option value="INTERNET">Internet</option>
                <option value="MOBILE">Mobile</option>
                <option value="GAS">Gas</option>
              </select>
              <label htmlFor="bill-amount">Amount (INR)</label>
              <input id="bill-amount" type="number" min="0.01" step="0.01" max="9999999999999.99"
                value={billAmount} onChange={(event) => setBillAmount(event.target.value)} placeholder="0.00" required />
              {billMessage && <p className={`transfer-message ${billMessage.type}`} role={billMessage.type === "error" ? "alert" : "status"}>{billMessage.text}</p>}
              <div className="transfer-actions">
                <button className="logout-button" type="button" onClick={showDashboard}>Cancel</button>
                <button className="transfer-submit" type="submit" disabled={isPayingBill || !sourceAccounts.length}>
                  {isPayingBill ? "Processing…" : "Record demo payment"}
                </button>
              </div>
              {!sourceAccounts.length && <p className="transfer-hint">There are no active accounts available for payment.</p>}
            </form>
          </main>
          <footer>© 2026 BankEase | NextGen Net Banking</footer>
        </div>
      );
    }

    return (
      <div className="app dashboard-app">
        <header className="navbar dashboard-navbar">
          <h2>Bank<span>Ease</span></h2>
          <div className="dashboard-nav-actions">
            <span className="signed-in-label">Signed in as {dashboard.fullName}</span>
            <PrivacyToggle hidden={isPrivacyMode} onToggle={() => setIsPrivacyMode((hidden) => !hidden)} />
            <button className="logout-button" type="button" onClick={() => { setTransferMessage(null); setView("transfer"); }}>Transfer funds</button>
            <button className="logout-button" type="button" onClick={() => { setBillMessage(null); setView("bill-payment"); }}>Pay a bill</button>
            <button className="logout-button" type="button" onClick={() => setView("loan-calculator")}>Loan calculator</button>
            <button className="logout-button" type="button" onClick={() => setView("investment-calculator")}>Investment calculator</button>
            {dashboard.administrator && <button className="logout-button" type="button" onClick={() => setView("admin-loans")}>Review loans</button>}
            <button className="logout-button" type="button" onClick={handleLogout}>Sign out</button>
          </div>
        </header>
        <main className="dashboard-main">
          <section className="dashboard-heading">
            <p className="tagline">YOUR MONEY. YOUR CONTROL.</p>
            <h1>Good to see you, {dashboard.fullName.split(" ")[0]}.</h1>
            <p className="description">Here is an overview of your BankEase accounts.</p>
          </section>

          <section className="summary-grid" aria-label="Banking summary">
            <article className="summary-card balance-card">
              <p>Total balance</p>
              <strong>{displayAmount(totalBalance, isPrivacyMode)}</strong>
              <span>Across {dashboard.accounts.length} {dashboard.accounts.length === 1 ? "account" : "accounts"}</span>
            </article>
            <article className="summary-card">
              <p>My accounts</p>
              <strong>{dashboard.accounts.length}</strong>
              <span>Linked to your profile</span>
            </article>
            <article className="summary-card">
              <p>Recent activity</p>
              <strong>{dashboard.transactions.length}</strong>
              <span>Latest transactions</span>
            </article>
          </section>

          {dashboard.monthlySummary && (
            <section className="dashboard-section monthly-overview" aria-label="This month’s money movement">
              <div className="section-heading">
                <div><h2>This month</h2><p>Based on successful entries in your BankEase ledger</p></div>
              </div>
              <div className="monthly-summary-grid">
                <article className="summary-card">
                  <p>Money out</p>
                  <strong>{displayAmount(dashboard.monthlySummary.moneyOut, isPrivacyMode)}</strong>
                  <span>Transfers and demo bill payments</span>
                </article>
                <article className="summary-card">
                  <p>Money in</p>
                  <strong>{displayAmount(dashboard.monthlySummary.moneyIn, isPrivacyMode)}</strong>
                  <span>Received transfers</span>
                </article>
                <article className="summary-card">
                  <p>Net movement</p>
                  <strong className={monthNet < 0 ? "net-negative" : "net-positive"}>
                    {isPrivacyMode ? displayAmount(monthNet, true) : `${monthNet < 0 ? "−" : "+"}${currency.format(Math.abs(monthNet))}`}
                  </strong>
                  <span>Money in minus money out</span>
                </article>
              </div>
              <div className="spending-breakdown-section">
                <h3>Where money went this month</h3>
                {isPrivacyMode ? (
                  <p className="flow-chart-hidden">Spending breakdown hidden while amounts are hidden.</p>
                ) : (
                  <div className="spending-breakdown">
                    {(dashboard.monthlySummary.spendingBreakdown || []).map((category) => {
                      const amount = Number(category.amount || 0);
                      const percentage = Number(dashboard.monthlySummary.moneyOut) > 0
                        ? (amount / Number(dashboard.monthlySummary.moneyOut)) * 100 : 0;
                      const label = category.transactionType === "BILL_PAYMENT" ? "Demo bill payments" : "Transfers";
                      return (
                        <div className="spending-row" key={category.transactionType}>
                          <div className="spending-row-header">
                            <span>{label}</span><strong>{displayAmount(amount, false)}</strong>
                          </div>
                          <div className="spending-track" aria-hidden="true">
                            <span className={category.transactionType === "BILL_PAYMENT" ? "bill-spending" : "transfer-spending"}
                              style={{ width: `${percentage}%` }} />
                          </div>
                          <small>{percentage.toFixed(1)}% of money out</small>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flow-chart-heading">
                <h3>Six-month money flow</h3>
                <div className="flow-legend" aria-hidden="true">
                  <span><i className="money-in" />Money in</span>
                  <span><i className="money-out" />Money out</span>
                </div>
              </div>
              {isPrivacyMode ? (
                <p className="flow-chart-hidden">Chart hidden while amounts are hidden.</p>
              ) : (
                <div className="flow-chart" role="img" aria-label="Six-month comparison of successful money in and money out">
                  {monthlyFlows.map((month) => {
                    const moneyIn = Number(month.moneyIn || 0);
                    const moneyOut = Number(month.moneyOut || 0);
                    const inHeight = flowMax === 0 ? 2 : Math.max(2, (moneyIn / flowMax) * 100);
                    const outHeight = flowMax === 0 ? 2 : Math.max(2, (moneyOut / flowMax) * 100);
                    const label = new Date(`${month.monthKey}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
                    return (
                      <div className="flow-month" key={month.monthKey}>
                        <div className="flow-bars">
                          <span className="flow-bar money-in" style={{ height: `${inHeight}%` }} title={`Money in: ${currency.format(moneyIn)}`} />
                          <span className="flow-bar money-out" style={{ height: `${outHeight}%` }} title={`Money out: ${currency.format(moneyOut)}`} />
                        </div>
                        <span className="flow-month-label">{label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <MonthlyBudgetCard fullName={dashboard.fullName}
            spent={Number(dashboard.monthlySummary?.moneyOut || 0)} hideAmounts={isPrivacyMode} />

          <section className="dashboard-section">
            <div className="section-heading">
              <div><h2>Your accounts</h2><p>Balances from your BankEase profile</p></div>
            </div>
            {dashboard.accounts.length ? (
              <div className="account-grid">
                {dashboard.accounts.map((account) => (
                  <article className="account-card" key={account.accountId}>
                    <div className="account-card-top">
                      <span className="account-icon" aria-hidden="true">▤</span>
                      <span className={`status-pill ${account.status?.toLowerCase() || ""}`}>{account.status || "Account"}</span>
                    </div>
                    <p className="account-type">{account.accountType || "Bank account"}</p>
                    <p className="account-number">{account.accountNumber}</p>
                    <div className="ifsc-row">
                      <span>IFSC</span>
                      <strong>{account.ifscCode || "Unavailable"}</strong>
                      {account.ifscCode && <button type="button" className="ifsc-copy-button" onClick={() => copyIfsc(account)}>
                        {ifscCopyStatus.accountId === account.accountId ? ifscCopyStatus.text : "Copy"}
                      </button>}
                    </div>
                    <strong className="account-balance">{displayAmount(account.balance, isPrivacyMode)}</strong>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">No accounts are linked to this profile yet.</div>
            )}
          </section>

          <section className="dashboard-section transactions-section">
            <div className="section-heading">
              <div><h2>Recent transactions</h2><p>Your latest account activity</p></div>
              <button className="text-button" type="button" onClick={() => loadTransactions(0)}>
                View all
              </button>
            </div>
            <TransactionRows transactions={dashboard.transactions} hideAmounts={isPrivacyMode} />
          </section>
        </main>
        <footer>© 2026 BankEase | NextGen Net Banking</footer>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="navbar">
        <h2>Bank<span>Ease</span></h2>
        <p>Secure Digital Banking</p>
      </header>

      <main className={`login-container${authMode === "register" ? " register-container" : ""}`}>
        <section className="welcome">
          <p className="tagline">YOUR MONEY. YOUR CONTROL.</p>
          <h1>Banking made<br />simple and secure.</h1>
          <p className="description">
            Manage your accounts, transfer funds, pay bills and plan your
            financial future in one place.
          </p>
          <ul>
            <li>✓ Easy account management</li>
            <li>✓ Convenient fund transfers</li>
            <li>✓ Simple bill payments</li>
          </ul>
        </section>

        <section className={`login-card${authMode === "register" ? " register-mode" : ""}`}>
          <h2>{authMode === "login" ? "Welcome back!" : "Create your account"}</h2>
          <p className="subtitle">{authMode === "login" ? "Sign in to access your banking dashboard." : "Register for web access to BankEase."}</p>

          <form onSubmit={authMode === "login" ? handleLogin : handleRegistration}>
            {authMode === "register" && <>
              <label htmlFor="register-name">Full name</label>
              <input id="register-name" maxLength="100" autoComplete="name" value={registration.fullName}
                onChange={(event) => setRegistration({ ...registration, fullName: event.target.value })} required />
              <label htmlFor="register-phone">Phone number</label>
              <input id="register-phone" type="tel" maxLength="20" autoComplete="tel" value={registration.phone}
                onChange={(event) => setRegistration({ ...registration, phone: event.target.value })} required />
              <label htmlFor="register-dob">Date of birth</label>
              <input id="register-dob" type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={registration.dateOfBirth}
                onChange={(event) => setRegistration({ ...registration, dateOfBirth: event.target.value })} required />
              <label htmlFor="register-address">Address</label>
              <input id="register-address" maxLength="255" autoComplete="street-address" value={registration.address}
                onChange={(event) => setRegistration({ ...registration, address: event.target.value })} required />
            </>}
            <label htmlFor={authMode === "login" ? "email" : "register-email"}>Email address</label>
            <input id={authMode === "login" ? "email" : "register-email"} type="email"
              autoComplete={authMode === "login" ? "username" : "email"} maxLength="100"
              placeholder="you@example.com" value={authMode === "login" ? email : registration.email}
              onChange={(event) => authMode === "login" ? setEmail(event.target.value)
                : setRegistration({ ...registration, email: event.target.value })} required />

            <label htmlFor={authMode === "login" ? "password" : "register-password"}>Password</label>
            <input id={authMode === "login" ? "password" : "register-password"} type="password"
              autoComplete={authMode === "login" ? "current-password" : "new-password"}
              minLength={authMode === "register" ? "8" : undefined} maxLength="72"
              placeholder={authMode === "login" ? "Enter your password" : "At least 8 characters"}
              value={authMode === "login" ? password : registration.password}
              onChange={(event) => authMode === "login" ? setPassword(event.target.value)
                : setRegistration({ ...registration, password: event.target.value })} required />

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (authMode === "login" ? "Signing in…" : "Creating account…")
                : authMode === "login" ? "Sign In →" : "Create account →"}
            </button>
          </form>

          {message && <p className="login-message" role="status">{message}</p>}

          {authMode === "register" && <p className="registration-note">
            This creates a web profile and a zero-balance demo savings account. It does not add funds.
          </p>}
          <p className="register-text">
            {authMode === "login" ? <>New to BankEase? <button type="button" onClick={() => { setMessage(""); setAuthMode("register"); }}>Create an account</button></>
              : <>Already have an account? <button type="button" onClick={() => { setMessage(""); setAuthMode("login"); }}>Sign in</button></>}
          </p>
          <p className="security">◆ Your security matters to us</p>
        </section>
      </main>

      <footer>© 2026 BankEase | NextGen Net Banking</footer>
    </div>
  );
}

export default App;
