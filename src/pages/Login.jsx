import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { emailSuggestion, extractErrorMessage } from "../api/client";
import AuthLayout from "../components/AuthLayout";
import OtpStep from "../components/OtpStep";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState("email");
  const [resendIn, setResendIn] = useState(60);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSendCode(e) {
    e.preventDefault();
    setError("");
    setNotFound(false);
    setSuggestion(null);
    setLoading(true);
    try {
      const data = await requestOtp(email.trim(), "login");
      setResendIn(data.resend_in_seconds);
      setStep("code");
    } catch (err) {
      setNotFound(err?.response?.data?.error?.code === "ACCOUNT_NOT_FOUND");
      setSuggestion(emailSuggestion(err));
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      activeTab="signin"
      title={step === "email" ? "Welcome back! 👋" : "Check your email 📬"}
      subtitle={
        step === "email"
          ? "Enter your email and we'll send you a one-time sign-in code. No password needed."
          : "Enter the code to sign in to your crop advisory dashboard."
      }
    >
      {step === "email" ? (
        <>
          {error && (
            <div className="error-banner">
              {error} {notFound && !suggestion && <Link to="/register">Create an account</Link>}
              {suggestion && (
                <button
                  type="button"
                  className="email-fix-btn"
                  onClick={() => {
                    setEmail(suggestion);
                    setError("");
                    setSuggestion(null);
                  }}
                >
                  Use {suggestion}
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSendCode} noValidate>
            <div className="auth-form-group">
              <label htmlFor="loginEmail">Email address</label>
              <div className="input-icon-wrap">
                <input
                  type="email"
                  id="loginEmail"
                  placeholder="farmer@example.com"
                  required
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <i className="fa-solid fa-envelope field-icon"></i>
              </div>
            </div>

            <button className="auth-submit-btn" type="submit" disabled={loading || !email.trim()}>
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Sending code...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i>
                  <span>Send sign-in code</span>
                </>
              )}
            </button>
          </form>

          <p className="auth-footnote">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </>
      ) : (
        <OtpStep
          email={email.trim()}
          resendInSeconds={resendIn}
          onVerify={async (code) => {
            await verifyOtp(email.trim(), "login", code);
            navigate("/disease-detection");
          }}
          onResend={() => requestOtp(email.trim(), "login")}
          onChangeEmail={() => {
            setStep("email");
            setError("");
          }}
        />
      )}
    </AuthLayout>
  );
}
