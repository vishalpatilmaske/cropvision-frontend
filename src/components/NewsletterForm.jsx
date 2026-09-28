import { useState } from "react";
import { emailSuggestion, extractErrorMessage } from "../api/client";
import { subscribeToNewsletter } from "../api/newsletterApi";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Footer newsletter sign-up: validates, shows progress, then a success or error line.
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | done | error
  const [message, setMessage] = useState("");
  const [suggestion, setSuggestion] = useState(null);

  async function submit(e) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setState("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    setState("sending");
    setSuggestion(null);
    try {
      const result = await subscribeToNewsletter(value);
      setState("done");
      setMessage(result.message);
      setEmail("");
    } catch (err) {
      setState("error");
      setMessage(extractErrorMessage(err));
      setSuggestion(emailSuggestion(err));
    }
  }

  return (
    <form className="subscribe-form" onSubmit={submit} noValidate>
      <div className="subscribe-box">
        <input
          type="email"
          placeholder="Enter your email"
          aria-label="Email address"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "sending") setState("idle");
          }}
          disabled={state === "sending"}
        />
        <button type="submit" disabled={state === "sending"}>
          {state === "sending" ? <i className="fa-solid fa-spinner fa-spin" aria-label="Subscribing"></i> : "Subscribe"}
        </button>
      </div>
      {(state === "done" || state === "error") && (
        <p className={`subscribe-message ${state}`} role={state === "error" ? "alert" : "status"}>
          <i className={`fa-solid ${state === "done" ? "fa-circle-check" : "fa-circle-exclamation"}`} aria-hidden="true"></i>{" "}
          {message}
          {suggestion && (
            <button
              type="button"
              className="subscribe-fix"
              onClick={() => {
                setEmail(suggestion);
                setSuggestion(null);
                setState("idle");
              }}
            >
              Use {suggestion}
            </button>
          )}
        </p>
      )}
    </form>
  );
}
