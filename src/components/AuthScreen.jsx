import { useState } from "react";

export default function AuthScreen({ onLogin, onRegister, onResetPassword }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (showForgot) {
        if (!email) {
          setError("Please enter your email address first.");
          setLoading(false);
          return;
        }
        await onResetPassword(email);
        setSuccess("Password reset email sent! Please check your inbox.");
      } else if (isRegistering) {
        if (!email || !password) {
          setError("Email and password are required.");
          setLoading(false);
          return;
        }
        await onRegister(email, password);
        setSuccess("Account created successfully! Logging you in...");
      } else {
        if (!email || !password) {
          setError("Email and password are required.");
          setLoading(false);
          return;
        }
        await onLogin(email, password);
        setSuccess("Signed in successfully!");
      }
    } catch (err) {
      setError(err.message || "An authentication error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen-overlay animated">
      <div className="auth-card">
        <header className="auth-header">
          <h1 className="auth-title">Home Gym Hypertrophy</h1>
          <p className="auth-subtitle">Premium Autoregulated Tracker</p>
        </header>

        <form onSubmit={handleSubmit} className="auth-form">
          <h2 className="auth-card-title">
            {showForgot ? "Reset Password" : isRegistering ? "Create Account" : "Sign In"}
          </h2>
          <p className="auth-card-desc">
            {showForgot 
              ? "Enter your email address to receive a secure reset link." 
              : "Sync your workout logs and settings automatically across all devices."}
          </p>

          <div className="form-group">
            <label className="form-label-small">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. gym@sync.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {!showForgot && (
            <div className="form-group">
              <label className="form-label-small">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          {error && <div className="auth-banner banner-error">{error}</div>}
          {success && <div className="auth-banner banner-success">{success}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Processing..." : showForgot ? "✉️ Send Reset Link" : isRegistering ? "📝 Create Account" : "🔑 Sign In"}
          </button>

          <div className="auth-links">
            {!showForgot ? (
              <>
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError("");
                    setSuccess("");
                  }}
                  disabled={loading}
                >
                  {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Register"}
                </button>
                <button
                  type="button"
                  className="auth-link-btn"
                  onClick={() => {
                    setShowForgot(true);
                    setError("");
                    setSuccess("");
                  }}
                  disabled={loading}
                >
                  Forgot Password?
                </button>
              </>
            ) : (
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => {
                  setShowForgot(false);
                  setError("");
                  setSuccess("");
                }}
                disabled={loading}
              >
                Back to Sign In
              </button>
            )}
          </div>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .auth-screen-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--bg-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 10000;
        }
        .auth-card {
          width: 100%;
          max-width: 440px;
          background: var(--bg-card-solid);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }
        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .auth-title {
          font-family: var(--font-family);
          font-size: 1.8rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
          margin-bottom: 0.25rem;
        }
        .auth-subtitle {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .auth-card-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-main);
          margin-bottom: 0.4rem;
        }
        .auth-card-desc {
          font-size: 0.85rem;
          color: var(--color-text-muted);
          line-height: 1.4;
          margin-bottom: 1.5rem;
        }
        .btn-block {
          width: 100%;
          height: 44px;
          margin-top: 1.25rem;
          font-size: 0.95rem;
          font-weight: 700;
        }
        .auth-banner {
          padding: 0.75rem;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          text-align: center;
          margin-top: 1rem;
        }
        .banner-success {
          background: color-mix(in srgb, var(--color-primary) 10%, transparent);
          border: 1px solid var(--color-primary);
          color: var(--color-primary);
        }
        .banner-error {
          background: rgba(255, 56, 96, 0.1);
          border: 1px solid var(--color-error);
          color: var(--color-error);
        }
        .auth-links {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: center;
          margin-top: 1.5rem;
          border-top: 1px dashed var(--border-color);
          padding-top: 1.25rem;
        }
        .auth-link-btn {
          background: none;
          border: none;
          color: var(--color-text-muted);
          font-size: 0.8rem;
          cursor: pointer;
          transition: color 0.2s;
          text-decoration: underline;
        }
        .auth-link-btn:hover {
          color: var(--color-primary);
        }
      ` }} />
    </div>
  );
}
