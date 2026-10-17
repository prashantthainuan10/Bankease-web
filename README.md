# BankEase Web Demo

BankEase Web is the React/Vite and Spring Boot web companion to the BankEase desktop demo. Both applications use the existing local MySQL `bankease` database. The web loan and investment features use the existing `loans` and `investments` tables; this project does not alter those schemas.

## Prerequisites

- MySQL running locally with the existing `bankease` database and desktop application tables.
- Java 25 and Node.js/npm installed.
- A MySQL password for the local backend connection.

The backend uses `spring.jpa.hibernate.ddl-auto=validate`, so it checks existing tables and will not create or rewrite the desktop schema. Keep the current database and data in place.

## Start the backend

Open a VS Code terminal in `bankease-backend`. Set the password for this terminal session without putting it in the command history, then start Spring Boot:

```powershell
$secure = Read-Host "MySQL password" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
# Optional: set a comma-separated list of existing user emails allowed to review loans.
$env:BANKEASE_ADMIN_EMAILS = "existing-admin@example.com"
.\mvnw.cmd spring-boot:run
```

Wait for the message that the application started on port 8080. If port 8080 is already in use, check the existing backend terminal first; do not start a second backend instance. To stop the backend, press **Ctrl+C** in its terminal. After it stops, clear the session variable with:

```powershell
Remove-Item Env:DB_PASSWORD
```

## Start the frontend

Open a second VS Code terminal in `bankease-frontend`:

```powershell
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

## Demo features

- Sign in with an existing active BankEase user.
- View account balances and transaction history; filter transactions and download a CSV statement.
- Transfer demo funds between supported accounts and submit demo bill payments.
- Estimate loan EMIs, inspect or export an illustrative amortization schedule, and submit loan applications to the shared `loans` table.
- Read and record investment entries in the shared `investments` table, view illustrative SIP projections, track maturity dates, and mark eligible records matured or closed.
- Search, filter, and export loan and investment records. Account ownership is checked by the backend for submitted records and status changes.
- Create a web account with a BCrypt password hash and sign in to the web app. Existing desktop-created accounts continue to use their legacy login value.
- Review and approve or reject pending shared loan records from an administrator view.

Loan and investment entries are demo records. The web investment workflow does not debit account balances or purchase real products. The return and repayment estimates are illustrative.

## Verification

From `bankease-frontend`:

```powershell
npm run lint
npm run build
```

From `bankease-backend`:

```powershell
.\mvnw.cmd test
```

For a local end-to-end demo, sign in with an existing desktop user, check the dashboard and transaction list, submit a small demo loan application and investment record, verify they appear in the shared tables/desktop app, and check that marking an investment matured updates only its status. Do not use a real account or real financial data.

## Current demo scope

Set `BANKEASE_ADMIN_EMAILS` in the backend terminal to a comma-separated list of existing user emails that should get the administrator view. Leave it empty to disable web admin access. The setting is enforced by the backend; registering an account does not grant administrator access unless its email is explicitly configured.

New web registrations use BCrypt in the existing `users.password_hash` column and can sign in to the web app. Registration also creates a zero-balance `SAVINGS` demo account for the new profile in the existing `accounts` table, using a demo IFSC value. It does not deposit funds or alter existing accounts. The desktop app currently compares the legacy password value directly, so new web registrations cannot sign in to the desktop app until its login is updated. Existing desktop users keep working in both apps.

Loan decisions update only `loans.status` from `PENDING` to `APPROVED` or `REJECTED`. They do not disburse money. This is college demo software, not production banking software.
