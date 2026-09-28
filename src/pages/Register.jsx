import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { extractErrorMessage } from "../api/client";
import AuthLayout from "../components/AuthLayout";
import GoogleSignInButton from "../components/GoogleSignInButton";
import OtpStep from "../components/OtpStep";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [step, setStep] = useState("details");
  const [resendIn, setResendIn] = useState(60);
  const [error, setError] = useState("");
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const details = { name: form.name.trim(), phone: form.phone.trim() || undefined };
  const email = form.email.trim();

  async function handleSendCode(e) {
    e.preventDefault();
    setError("");
    setExists(false);
    if (!details.name) {
      setError("Please enter your name.");
      return;
    }
    setLoading(true);
    try {
      const data = await requestOtp(email, "register", details);
      setResendIn(data.resend_in_seconds);
      setStep("code");
    } catch (err) {
      setExists(err?.response?.data?.error?.code === "EMAIL_EXISTS");
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      activeTab="signup"
      title={step === "details" ? "Join CropVision AI 🌱" : "Verify your email 📬"}
      subtitle={
        step === "details"
          ? "Create your farmer account — we'll email you a code to confirm it. No password to remember."
          : "Enter the code to finish creating your account."
      }
    >
      {step === "details" ? (
        <>
          {error && (
            <div className="error-banner">
              {error} {exists && <Link to="/login">Sign in</Link>}
            </div>
          )}

          <form onSubmit={handleSendCode} noValidate>
            <div className="auth-form-group">
              <label htmlFor="regName">Full Name</label>
              <div className="input-icon-wrap">
                <input
                  type="text"
                  id="regName"
                  placeholder="e.g. Ramesh Patil"
                  required
                  autoComplete="name"
                  autoFocus
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                />
                <i className="fa-solid fa-user field-icon"></i>
              </div>
            </div>

            <div className="auth-form-group">
              <label htmlFor="regEmail">Email address</label>
              <div className="input-icon-wrap">
                <input
                  type="email"
                  id="regEmail"
                  placeholder="farmer@example.com"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
                <i className="fa-solid fa-envelope field-icon"></i>
              </div>
            </div>

            <div className="auth-form-group">
              <label htmlFor="regPhone">Phone (optional)</label>
              <div className="input-icon-wrap">
                <input
                  type="tel"
                  id="regPhone"
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
                <i className="fa-solid fa-phone field-icon"></i>
              </div>
            </div>

            <button className="auth-submit-btn" type="submit" disabled={loading || !email || !details.name}>
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <span>Sending code...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane"></i>
                  <span>Send verification code</span>
                </>
              )}
            </button>
          </form>

          <GoogleSignInButton />

          <p className="auth-footnote">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </>
      ) : (
        <OtpStep
          email={email}
          resendInSeconds={resendIn}
          onVerify={async (code) => {
            await verifyOtp(email, "register", code);
            navigate("/disease-detection");
          }}
          onResend={() => requestOtp(email, "register", details)}
          onChangeEmail={() => {
            setStep("details");
            setError("");
          }}
        />
      )}
    </AuthLayout>
  );
}
