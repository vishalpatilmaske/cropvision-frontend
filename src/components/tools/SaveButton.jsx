import { useEffect, useState } from "react";

// "Save to my records" with idle / saving / saved / error states. Resets to
// idle whenever `resetKey` changes (i.e. the inputs changed).
export default function SaveButton({ onSave, resetKey }) {
  const [state, setState] = useState("idle");

  useEffect(() => {
    setState("idle");
  }, [resetKey]);

  async function save() {
    setState("saving");
    try {
      await onSave();
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <span className="save-button">
      <button type="button" className="btn btn-secondary" onClick={save} disabled={state === "saving" || state === "saved"}>
        {state === "saved" ? (
          <>
            <i className="fa-solid fa-check"></i> Saved to My Records
          </>
        ) : state === "saving" ? (
          <>
            <i className="fa-solid fa-spinner fa-spin"></i> Saving...
          </>
        ) : (
          <>
            <i className="fa-solid fa-bookmark"></i> Save to My Records
          </>
        )}
      </button>
      {state === "error" && <span className="save-error">Couldn't save — try again.</span>}
    </span>
  );
}
