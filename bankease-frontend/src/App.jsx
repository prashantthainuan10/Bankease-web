import { useState } from "react";
import "./App.css";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin(event) {
    event.preventDefault();
    alert("Login interface is working! Backend authentication comes next.");
  }

  return (
    <div className="app">
      <header className="navbar">
        <h2>
          Bank<span>Ease</span>
        </h2>
        <p>Secure Digital Banking</p>
      </header>

      <main className="login-container">
        <section className="welcome">
          <p className="tagline">YOUR MONEY. YOUR CONTROL.</p>
          <h1>
            Banking made
            <br />
            simple and secure.
          </h1>
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

        <section className="login-card">
          <h2>Welcome back!</h2>
          <p className="subtitle">Sign in to access your banking dashboard.</p>

          <form onSubmit={handleLogin}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button type="submit">Sign In →</button>
          </form>

          <p className="register-text">
            New to BankEase? <span>Create an account soon</span>
          </p>
          <p className="security">◆ Your security matters to us</p>
        </section>
      </main>

      <footer>© 2026 BankEase | NextGen Net Banking</footer>
    </div>
  );
}

export default App;
