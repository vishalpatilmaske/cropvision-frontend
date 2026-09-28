import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchDiseaseHistoryDetail } from "../api/diseaseApi";
import { extractErrorMessage } from "../api/client";
import AnalysisResult from "../components/AnalysisResult";

export default function HistoryDetail() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchDiseaseHistoryDetail(id)
      .then((data) => !cancelled && setResult(data))
      .catch((err) => !cancelled && setError(extractErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="container page" style={{ maxWidth: 720 }}>
      <Link to="/history" className="btn btn-ghost history-back" style={{ marginBottom: 20, display: "inline-flex" }}>
        ← Back to History
      </Link>
      {loading && <div className="spinner" />}
      {error && <div className="error-banner">{error}</div>}
      {!loading && result && (
        <div className="card">
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 0 }}>
            Analyzed on {new Date(result.created_at).toLocaleString()}
          </p>
          <AnalysisResult result={result} />
        </div>
      )}
    </div>
  );
}
