import { useEffect, useRef, useState } from "react";
import { extractErrorMessage } from "../api/client";

const LENGTH = 6;

// Step 2 of sign in / sign up: enter the 6-digit code that was emailed.
// Submits automatically once all digits are in; paste of a full code works.
export default function OtpStep({ email, resendInSeconds = 60, onVerify, onResend, onChangeEmail }) {
  const [digits, setDigits] = useState(Array(LENGTH).fill(""));
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(resendInSeconds);
  const [resent, setResent] = useState(false);
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function submit(code) {
    if (verifying) return;
    setVerifying(true);
    setError("");
    try {
      await onVerify(code);
    } catch (err) {
      setError(extractErrorMessage(err));
      setDigits(Array(LENGTH).fill(""));
      inputsRef.current[0]?.focus();
      setVerifying(false);
    }
  }

  function setAt(index, value) {
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (next.every(Boolean)) submit(next.join(""));
  }

  function handleChange(index, raw) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      setAt(index, "");
      return;
    }
    if (clean.length > 1) {
      fill(clean, index);
      return;
    }
    setAt(index, clean);
    if (index < LENGTH - 1) inputsRef.current[index + 1]?.focus();
  }

  function fill(text, from = 0) {
    const chars = text.replace(/\D/g, "").slice(0, LENGTH - from).split("");
    const next = [...digits];
    chars.forEach((c, i) => {
      next[from + i] = c;
    });
    setDigits(next);
    inputsRef.current[Math.min(from + chars.length, LENGTH - 1)]?.focus();
    if (next.every(Boolean)) submit(next.join(""));
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
      setAt(index - 1, "");
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  async function resend() {
    setError("");
    try {
      const data = await onResend();
      setCooldown(data?.resend_in_seconds ?? 60);
      setResent(true);
      setDigits(Array(LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  return (
    <div className="otp-step">
      <div className="otp-sent">
        <i className="fa-solid fa-envelope-circle-check"></i>
        <div>
          <p>
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
          <button type="button" className="otp-link" onClick={onChangeEmail} disabled={verifying}>
            Change email
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {resent && !error && <div className="otp-info">A new code is on its way.</div>}

      <div className="otp-boxes" onPaste={(e) => {
        e.preventDefault();
        fill(e.clipboardData.getData("text"));
      }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={LENGTH}
            value={d}
            disabled={verifying}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>

      <button
        type="button"
        className="auth-submit-btn"
        disabled={verifying || !digits.every(Boolean)}
        onClick={() => submit(digits.join(""))}
      >
        {verifying ? (
          <>
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>Verifying...</span>
          </>
        ) : (
          <>
            <i className="fa-solid fa-shield-halved"></i>
            <span>Verify code</span>
          </>
        )}
      </button>

      <p className="otp-resend">
        Didn't get it? Check spam, or{" "}
        {cooldown > 0 ? (
          <span>resend in {cooldown}s</span>
        ) : (
          <button type="button" className="otp-link" onClick={resend} disabled={verifying}>
            send a new code
          </button>
        )}
      </p>
    </div>
  );
}
