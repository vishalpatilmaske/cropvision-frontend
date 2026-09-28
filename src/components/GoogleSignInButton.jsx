import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient, { extractErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

const GSI_SCRIPT = "https://accounts.google.com/gsi/client";
let scriptPromise = null;

// Google's sign-in script, loaded once and only when Google sign-in is enabled.
function loadGoogleScript() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GSI_SCRIPT;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Couldn't load Google sign-in. Check your internet connection."));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// "Continue with Google": opens Google's sign-in popup, then exchanges the
// token for our own session. Google sign-in needs GOOGLE_CLIENT_ID in
// backend/.env; until then the button explains it isn't available yet.
export default function GoogleSignInButton() {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const tokenClientRef = useRef(null);
  const [clientId, setClientId] = useState(undefined); // undefined = still checking
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/api/auth/providers")
      .then((res) => !cancelled && setClientId(res.data.data.google_client_id))
      .catch(() => !cancelled && setClientId(null));
    return () => {
      cancelled = true;
    };
  }, []);

  // Prepare the popup ahead of time: browsers only allow it from the click itself.
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "openid email profile",
          callback: async (response) => {
            if (response.error || !response.access_token) {
              setBusy(false);
              setError("Google sign-in was not completed. Please try again.");
              return;
            }
            try {
              await signInWithGoogle(response.access_token);
              navigate("/disease-detection");
            } catch (err) {
              setError(extractErrorMessage(err));
              setBusy(false);
            }
          },
          // Popup closed or blocked: just let the farmer try again.
          error_callback: () => setBusy(false),
        });
      })
      .catch((err) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
    };
  }, [clientId, navigate, signInWithGoogle]);

  function handleClick() {
    setError("");
    if (!clientId) {
      setError("Google sign-in isn't available yet. Please use your email for now.");
      return;
    }
    if (!tokenClientRef.current) {
      setError("Google sign-in is still loading. Please try again in a moment.");
      return;
    }
    setBusy(true);
    tokenClientRef.current.requestAccessToken();
  }

  return (
    <div className="google-signin">
      <div className="auth-divider">
        <span>or</span>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <button
        type="button"
        className="google-signin-btn"
        onClick={handleClick}
        disabled={busy || clientId === undefined}
      >
        <span className="google-signin-icon">
          {busy ? <i className="fa-solid fa-spinner fa-spin"></i> : <GoogleIcon />}
        </span>
        <span>{busy ? "Signing you in..." : "Continue with Google"}</span>
      </button>
    </div>
  );
}
