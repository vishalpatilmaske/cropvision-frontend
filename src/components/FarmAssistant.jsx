import { Fragment, useEffect, useRef, useState } from "react";
import { sendAssistantMessage } from "../api/assistantApi";
import { extractErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import useFarmLocation from "../hooks/useFarmLocation";
import "../styles/assistant.css";

// Other pages open the assistant with:
//   window.dispatchEvent(new CustomEvent(ASK_ASSISTANT_EVENT, { detail: { message, reportId } }))
export const ASK_ASSISTANT_EVENT = "cropvision:ask-assistant";

export function askKrishiMitra(message, reportId) {
  window.dispatchEvent(new CustomEvent(ASK_ASSISTANT_EVENT, { detail: { message, reportId } }));
}

const HISTORY_LIMIT = 20;

const SUGGESTIONS = [
  "How are my crops doing?",
  "Which crop should I grow this season?",
  "Fertilizer plan for wheat",
  "Will it rain here this week? Can I spray?",
  "Should I irrigate today?",
];

const TOOL_LABELS = {
  get_my_farms: "Checked your farms",
  get_crop_health_checks: "Checked your health reports",
  get_crop_health_report: "Read your health report",
  get_weather_forecast: "Checked the weather",
  get_irrigation_advice: "Checked irrigation need",
  find_place: "Looked up the place",
  recommend_crops: "Ran crop recommendation",
  recommend_fertilizer: "Ran fertilizer plan",
  estimate_yield: "Estimated yield",
};

function storageKey(userId) {
  return `cropvision_chat_${userId}`;
}

function loadHistory(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(userId)) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveHistory(userId, messages) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(messages.slice(-HISTORY_LIMIT)));
  } catch {
    // Storage full or blocked -- the chat still works for this session.
  }
}

export default function FarmAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadHistory(user.id));
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [reportId, setReportId] = useState(null);
  const { coords, status: locationStatus, locate } = useFarmLocation({ auto: false });
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    saveHistory(user.id, messages);
  }, [user.id, messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    // Ask for location the first time the chat opens, so weather questions just work.
    if (open && locationStatus === "idle") locate();
  }, [open, locationStatus, locate]);

  async function send(text, forReportId = reportId) {
    const content = text.trim();
    if (!content || sending) return;

    const next = [...messagesRef.current, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError("");
    setSending(true);
    try {
      const history = next.slice(-HISTORY_LIMIT).map(({ role, content: c }) => ({ role, content: c }));
      const data = await sendAssistantMessage(history, { reportId: forReportId, location: coords });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, tools: data.tools_used }]);
    } catch (err) {
      setError(extractErrorMessage(err));
      setMessages((prev) => prev.slice(0, -1));
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    function onAsk(event) {
      const { message, reportId: rid } = event.detail || {};
      setOpen(true);
      if (rid) setReportId(rid);
      if (message) send(message, rid || reportId);
    }
    window.addEventListener(ASK_ASSISTANT_EVENT, onAsk);
    return () => window.removeEventListener(ASK_ASSISTANT_EVENT, onAsk);
  });

  function clearChat() {
    setMessages([]);
    setReportId(null);
    setError("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const firstName = user.name?.split(" ")[0] || "there";

  return (
    <div className="fa-root">
      {open && (
        <section className="fa-panel" role="dialog" aria-label="Farm assistant chat">
          <header className="fa-header">
            <div className="fa-avatar">
              <i className="fa-solid fa-seedling"></i>
            </div>
            <div className="fa-header-text">
              <strong>Krishi Mitra</strong>
              <span>
                <span className="fa-online-dot"></span> AI farm assistant
              </span>
            </div>
            {messages.length > 0 && (
              <button type="button" className="fa-icon-btn" onClick={clearChat} title="New chat" aria-label="Start a new chat">
                <i className="fa-solid fa-rotate-right"></i>
              </button>
            )}
            <button type="button" className="fa-icon-btn" onClick={() => setOpen(false)} aria-label="Close chat">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </header>

          <div className="fa-location-bar">
            {locationStatus === "on" ? (
              <span>
                <i className="fa-solid fa-location-dot"></i> Using your location for weather
              </span>
            ) : locationStatus === "locating" ? (
              <span>
                <i className="fa-solid fa-spinner fa-spin"></i> Finding your location...
              </span>
            ) : (
              <button type="button" onClick={locate}>
                <i className="fa-solid fa-location-crosshairs"></i> Share location for local weather
              </button>
            )}
          </div>

          {reportId && (
            <div className="fa-context">
              <i className="fa-solid fa-file-medical"></i> Discussing your latest crop health report
              <button type="button" onClick={() => setReportId(null)} aria-label="Stop discussing this report">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}

          <div className="fa-messages" ref={listRef}>
            {messages.length === 0 && (
              <div className="fa-welcome">
                <div className="fa-welcome-icon">🌱</div>
                <p className="fa-welcome-title">Namaste, {firstName}!</p>
                <p>
                  Ask me about your crops, diseases, fertilizer, weather, irrigation or what to sow. I can check live
                  weather for your location or any village, and look up your farms and past crop health reports.
                </p>
                <div className="fa-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`fa-msg fa-msg-${m.role}`}>
                {m.role === "assistant" && m.tools?.length > 0 && (
                  <div className="fa-tools">
                    {[...new Set(m.tools)].map((t) => (
                      <span key={t}>
                        <i className="fa-solid fa-check"></i> {TOOL_LABELS[t] || t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="fa-bubble">
                  {m.role === "assistant" ? <RichText text={m.content} /> : m.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="fa-msg fa-msg-assistant">
                <div className="fa-bubble fa-typing" aria-label="Assistant is typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>

          {error && <div className="fa-error">{error}</div>}

          <form
            className="fa-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={2000}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your crops..."
              aria-label="Message"
            />
            <button type="submit" className="fa-send" disabled={sending || !input.trim()} aria-label="Send">
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
          <p className="fa-disclaimer">AI advice — confirm serious problems with your local KVK.</p>
        </section>
      )}

      <button
        type="button"
        className={`fa-launcher${open ? " open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close farm assistant" : "Open farm assistant"}
      >
        <i className={`fa-solid ${open ? "fa-xmark" : "fa-comment-dots"}`}></i>
        {!open && <span className="fa-launcher-label">Ask Krishi Mitra</span>}
      </button>
    </div>
  );
}

// Minimal, safe markdown: **bold**, "- " / "1. " lists and paragraphs. Builds React
// elements (no innerHTML), so model output can never inject markup.
function RichText({ text }) {
  const blocks = [];
  let list = null;

  for (const raw of (text || "").split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (bullet) {
      const ordered = /^\d/.test(line);
      if (!list || list.ordered !== ordered) {
        list = { ordered, items: [] };
        blocks.push(list);
      }
      list.items.push(bullet[1]);
    } else {
      list = null;
      if (line) blocks.push(line.replace(/^#+\s*/, ""));
    }
  }

  return blocks.map((block, i) => {
    if (typeof block === "string") return <p key={i}>{inline(block)}</p>;
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag key={i}>
        {block.items.map((item, j) => (
          <li key={j}>{inline(item)}</li>
        ))}
      </Tag>
    );
  });
}

function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}
