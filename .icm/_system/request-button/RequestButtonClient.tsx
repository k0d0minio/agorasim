"use client";
// RequestButtonClient.tsx — the button, the form and the list of the client's requests
// (blueprint 1.0.0-rc32). RequestButton.tsx shows it only in a test environment.
// The look comes from the CSS variables --baxter-* of the app (THEME of setup/request-button.md),
// each one with a neutral fallback.
import { useState } from "react";
import type { FormEvent } from "react";
import { collect, watch } from "./capture";
import type { BrowserCapture } from "./capture";
import { outline, pickElement } from "./picker";
import type { CaptureUser, ClientStatus, Kind, PickedElement, Urgency } from "./core";

watch();

const TEXT = {
  en: {
    open: "Feedback", title: "Ask for a change", tabNew: "New request", tabMine: "My requests",
    kind: "What is it about?", problem: "A problem", change: "A change", idea: "An idea",
    words: "Describe your request", placeholder: "What you see, and what you expect",
    urgency: "How urgent?", low: "It can wait", normal: "Soon", high: "It blocks me",
    pick: "Show it on the page", picking: "Click the element you mean. Escape to cancel.",
    element: "Selected element:", remove: "Remove",
    note: "We also send a picture of this page and technical details. No password, no form value.",
    send: "Send", cancel: "Cancel", wait: "One moment", sending: "Sending",
    sent: "Thank you, we received your request", ref: "Reference", follow: "You can follow it in My requests.",
    fail: "The request was not sent:", retry: "Try again", close: "Close",
    empty: "No request sent from this browser yet.",
    status: { received: "Received", started: "In progress", done: "Done", closed: "Closed" },
  },
  fr: {
    open: "Une remarque ?", title: "Demander un changement", tabNew: "Nouvelle demande", tabMine: "Mes demandes",
    kind: "De quoi s'agit-il ?", problem: "Un problème", change: "Une modification", idea: "Une idée",
    words: "Décrivez votre demande", placeholder: "Ce que vous voyez, et ce que vous attendez",
    urgency: "Quelle urgence ?", low: "Ça peut attendre", normal: "Bientôt", high: "Ça me bloque",
    pick: "Montrer sur la page", picking: "Cliquez sur l'élément concerné. Échap pour annuler.",
    element: "Élément choisi :", remove: "Retirer",
    note: "Nous joignons une image de cette page et des détails techniques. Aucun mot de passe, aucune valeur de formulaire.",
    send: "Envoyer", cancel: "Annuler", wait: "Un instant", sending: "Envoi en cours",
    sent: "Merci, votre demande est bien reçue", ref: "Référence", follow: "Vous pouvez la suivre dans Mes demandes.",
    fail: "La demande n'a pas été envoyée :", retry: "Réessayer", close: "Fermer",
    empty: "Aucune demande envoyée depuis ce navigateur.",
    status: { received: "Reçue", started: "En cours", done: "Faite", closed: "Close" },
  },
  pt: {
    open: "Comentário", title: "Pedir uma alteração", tabNew: "Novo pedido", tabMine: "Os meus pedidos",
    kind: "De que se trata?", problem: "Um problema", change: "Uma alteração", idea: "Uma ideia",
    words: "Descreva o seu pedido", placeholder: "O que vê, e o que espera",
    urgency: "Qual a urgência?", low: "Pode esperar", normal: "Em breve", high: "Está a bloquear-me",
    pick: "Mostrar na página", picking: "Clique no elemento em causa. Escape para cancelar.",
    element: "Elemento escolhido:", remove: "Retirar",
    note: "Também enviamos uma imagem desta página e detalhes técnicos. Sem palavras-passe nem valores de formulários.",
    send: "Enviar", cancel: "Cancelar", wait: "Um momento", sending: "A enviar",
    sent: "Obrigado, recebemos o seu pedido", ref: "Referência", follow: "Pode acompanhá-lo em Os meus pedidos.",
    fail: "O pedido não foi enviado:", retry: "Tentar de novo", close: "Fechar",
    empty: "Ainda nenhum pedido enviado deste navegador.",
    status: { received: "Recebido", started: "Em curso", done: "Feito", closed: "Fechado" },
  },
};
type Lang = keyof typeof TEXT;
function pick(lang: string): Lang {
  const code = lang.slice(0, 2).toLowerCase();
  return code === "fr" || code === "pt" ? code : "en";
}

// The look. Each value is a CSS variable of the app, with a neutral fallback.
const Z = 2147483000;
const CSS = `
.bxr{--bxr-a:var(--baxter-accent,#111);--bxr-at:var(--baxter-accent-text,#fff);--bxr-s:var(--baxter-surface,#fff);--bxr-t:var(--baxter-text,#111);--bxr-m:var(--baxter-muted,#555);--bxr-b:var(--baxter-border,#bbb);--bxr-c:var(--baxter-chip,var(--baxter-accent,#111));--bxr-ct:var(--baxter-chip-text,var(--baxter-accent-text,#fff));--bxr-r:var(--baxter-radius,12px);--bxr-cr:var(--baxter-control-radius,999px);--bxr-f:var(--baxter-font,system-ui,sans-serif);font-family:var(--bxr-f)}
.bxr *,.bxr *::before,.bxr *::after{box-sizing:border-box}
.bxr button{font-family:var(--bxr-f)}
.bxr-launch{position:fixed;right:16px;bottom:16px;z-index:${Z};display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border:0;border-radius:var(--bxr-cr);background:var(--bxr-a);color:var(--bxr-at);font-size:15px;font-weight:600;line-height:1.2;cursor:pointer;box-shadow:var(--baxter-launcher-shadow,0 4px 16px rgba(0,0,0,.25))}
.bxr-launch svg{width:18px;height:18px;flex:none}
@media (max-width:640px){.bxr-launch{padding:12px}.bxr-launch-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}}
.bxr :focus-visible{outline:2px solid var(--baxter-focus,var(--bxr-a));outline-offset:2px}
.bxr-overlay{position:fixed;inset:0;z-index:${Z};background:var(--baxter-overlay,rgba(0,0,0,.45));display:flex;align-items:center;justify-content:center;padding:16px}
.bxr-panel{background:var(--bxr-s);color:var(--bxr-t);border-radius:var(--bxr-r);padding:24px;width:100%;max-width:480px;max-height:90vh;overflow:auto;box-shadow:var(--baxter-shadow,0 10px 40px rgba(0,0,0,.3));font-size:15px;line-height:1.5}
@media (max-width:640px){.bxr-overlay{align-items:flex-end;padding:0}.bxr-panel{max-width:none;max-height:92vh;border-radius:var(--bxr-r) var(--bxr-r) 0 0;padding:20px 16px}}
.bxr-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 12px}
.bxr-title{margin:0;font-family:var(--baxter-heading-font,var(--bxr-f));font-size:20px;font-weight:600;line-height:1.2;text-transform:var(--baxter-heading-transform,none);color:var(--baxter-heading-color,var(--bxr-t))}
.bxr-x{border:0;background:transparent;color:var(--bxr-m);font-size:24px;line-height:1;cursor:pointer;padding:4px 10px;border-radius:var(--bxr-cr)}
.bxr-tabs{display:flex;gap:4px;margin:0 0 20px;border-bottom:1px solid var(--bxr-b)}
.bxr-tab{border:0;border-bottom:2px solid transparent;margin-bottom:-1px;background:transparent;color:var(--bxr-m);font-size:14px;font-weight:600;padding:8px 12px;cursor:pointer}
.bxr-tab[aria-selected=true]{color:var(--bxr-t);border-bottom-color:var(--bxr-a)}
.bxr-label{display:block;font-weight:600;margin:0 0 8px;padding:0}
.bxr-fs{border:0;margin:0 0 18px;padding:0;min-width:0}
.bxr-chips{display:flex;flex-wrap:wrap;gap:8px}
.bxr-chip{position:relative;display:inline-block}
.bxr-chip input{position:absolute;opacity:0;width:1px;height:1px;margin:0}
.bxr-chip span{display:inline-block;padding:7px 14px;border-radius:var(--bxr-cr);border:1px solid var(--bxr-b);background:var(--bxr-s);color:var(--bxr-t);cursor:pointer;font-size:14px;line-height:1.2}
.bxr-chip input:checked+span{background:var(--bxr-c);color:var(--bxr-ct);border-color:var(--bxr-c)}
.bxr-chip input:focus-visible+span{outline:2px solid var(--baxter-focus,var(--bxr-a));outline-offset:2px}
.bxr-text{display:block;width:100%;min-height:120px;margin:0 0 12px;padding:10px 12px;border:1px solid var(--bxr-b);border-radius:var(--baxter-field-radius,10px);font:inherit;color:var(--bxr-t);background:var(--bxr-s);resize:vertical}
.bxr-element{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 18px;font-size:14px}
.bxr-element code{font-family:inherit;font-weight:600;overflow-wrap:anywhere}
.bxr-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:var(--bxr-cr);font-size:15px;font-weight:600;line-height:1.2;cursor:pointer;border:1px solid var(--bxr-a)}
.bxr-btn svg{width:16px;height:16px}
.bxr-btn:disabled{opacity:.6;cursor:default}
.bxr-primary{background:var(--bxr-a);color:var(--bxr-at)}
.bxr-ghost{background:transparent;color:var(--bxr-t)}
.bxr-small{padding:6px 14px;font-size:14px}
.bxr-note{font-size:13px;color:var(--bxr-m);margin:0 0 18px}
.bxr-row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.bxr-msg{margin:0 0 18px}
.bxr-ref{display:block;font-size:13px;color:var(--bxr-m)}
.bxr-ref strong{font-size:18px;color:var(--bxr-t)}
.bxr-list{list-style:none;margin:0;padding:0}
.bxr-item{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--bxr-b)}
.bxr-item:last-child{border-bottom:0}
.bxr-item-title{font-weight:600;overflow-wrap:anywhere}
.bxr-meta{display:block;font-size:13px;color:var(--bxr-m)}
.bxr-pill{flex:none;font-size:12px;font-weight:600;padding:4px 10px;border-radius:var(--bxr-cr);background:var(--baxter-status,var(--bxr-b));color:var(--bxr-t)}
.bxr-pill[data-status=started],.bxr-pill[data-status=done]{background:var(--bxr-c);color:var(--bxr-ct)}
.bxr-pick-frame{position:fixed;z-index:${Z};pointer-events:none;display:none;border:2px solid var(--baxter-accent,#111);border-radius:4px;background:rgba(0,0,0,.06)}
.bxr-pick-tip{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:${Z};display:flex;align-items:center;gap:12px;max-width:calc(100vw - 32px);padding:10px 12px 10px 18px;border-radius:var(--baxter-control-radius,999px);background:var(--baxter-accent,#111);color:var(--baxter-accent-text,#fff);font-family:var(--baxter-font,system-ui,sans-serif);font-size:14px;font-weight:600;line-height:1.3}
.bxr-pick-tip button{flex:none;padding:6px 14px;border:1px solid currentColor;border-radius:var(--baxter-control-radius,999px);background:transparent;color:inherit;font:inherit;cursor:pointer}
`;

const Bubble = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M12 3C6.5 3 2 6.6 2 11c0 2.4 1.3 4.5 3.4 6L4.6 21l4.3-2.3c1 .2 2 .3 3.1.3 5.5 0 10-3.6 10-8s-4.5-8-10-8Z" />
  </svg>
);
const Target = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" />
  </svg>
);

// The requests sent from this browser. Browser storage only: a convenience, never the store.
type Sent = { id: string; title: string; date: string; status?: ClientStatus };
const KEY = "baxter-requests";
function readSent(): Sent[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((s) => s && typeof s.id === "string").slice(0, 30) : [];
  } catch {
    return [];
  }
}
function writeSent(list: Sent[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    // no storage: the list stays for this page only
  }
}

type Props = { env: string; user: CaptureUser; lang?: string; dom?: boolean; endpoint?: string };
type Step =
  | { step: "capturing" }
  | { step: "form" }
  | { step: "picking" }
  | { step: "sending" }
  | { step: "done"; id: string }
  | { step: "failed"; reason: string };

export default function RequestButtonClient({ env, user, lang = "", dom = true, endpoint = "/api/baxter-request" }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"new" | "mine">("new");
  const [state, setState] = useState<Step>({ step: "capturing" });
  const [taken, setTaken] = useState<BrowserCapture | null>(null);
  const [language, setLanguage] = useState<Lang>(pick(lang || "en"));
  const [kind, setKind] = useState<Kind>("problem");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [words, setWords] = useState("");
  const [element, setElement] = useState<PickedElement | null>(null);
  const [sent, setSent] = useState<Sent[]>([]);
  const t = TEXT[language];

  function reset() {
    setKind("problem");
    setUrgency("normal");
    setWords("");
    setElement(null);
    setTaken(null);
  }

  async function start() {
    setLanguage(pick(lang || document.documentElement.lang || navigator.language));
    reset();
    setSent(readSent());
    setTab("new");
    setState({ step: "capturing" });
    setOpen(true);
    setTaken(await collect(user, dom));
    setState({ step: "form" });
  }

  async function choose() {
    setState({ step: "picking" });
    const picked = await pickElement(t.picking, t.cancel);
    if (picked) setElement(picked);
    setState({ step: "form" });
  }

  async function refresh(list: Sent[]) {
    if (!list.length) return;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: list.map((s) => s.id) }),
      });
      const answer = (await response.json()) as { statuses?: Record<string, ClientStatus> };
      const statuses = answer.statuses ?? {};
      const next = list.map((s) => ({ ...s, status: statuses[s.id] ?? s.status }));
      setSent(next);
      writeSent(next);
    } catch {
      // the list keeps the last known status
    }
  }

  function showMine() {
    setTab("mine");
    const list = readSent();
    setSent(list);
    void refresh(list);
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taken || !words.trim()) return;
    setState({ step: "sending" });
    try {
      const screenshot = element ? await outline(taken, element.box) : taken.screenshot;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          form: { kind, urgency, words, element, where: element ? "" : document.title },
          capture: taken.capture,
          screenshot,
        }),
      });
      const answer = (await response.json()) as { ok?: boolean; id?: string; error?: string };
      if (answer.ok && answer.id) {
        const title = words.replace(/\s+/g, " ").trim().slice(0, 80);
        const next = [{ id: answer.id, title, date: new Date().toISOString().slice(0, 10), status: "received" as const }, ...readSent()];
        setSent(next);
        writeSent(next);
        setState({ step: "done", id: answer.id });
      } else setState({ step: "failed", reason: answer.error ?? `HTTP ${response.status}` });
    } catch (reason) {
      setState({ step: "failed", reason: String(reason) });
    }
  }

  const close = () => {
    setOpen(false);
    reset();
  };
  const chips = <T extends string>(name: string, value: T, set: (v: T) => void, options: [T, string][]) => (
    <div className="bxr-chips">
      {options.map(([v, label]) => (
        <label key={v} className="bxr-chip">
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => set(v)} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div data-baxter-request={env} className="bxr">
      <style>{CSS}</style>
      {!open && (
        <button type="button" onClick={start} aria-label={t.title} className="bxr-launch">
          <Bubble />
          <span className="bxr-launch-label">{t.open}</span>
        </button>
      )}
      {open && state.step !== "picking" && (
        <div className="bxr-overlay" onKeyDown={(e) => e.key === "Escape" && close()}>
          <div role="dialog" aria-modal="true" aria-labelledby="bxr-title" className="bxr-panel">
            <div className="bxr-head">
              <h2 id="bxr-title" className="bxr-title">{t.title}</h2>
              <button type="button" className="bxr-x" onClick={close} aria-label={t.close}>×</button>
            </div>
            <div className="bxr-tabs" role="tablist">
              <button type="button" role="tab" className="bxr-tab" aria-selected={tab === "new"} onClick={() => setTab("new")}>
                {t.tabNew}
              </button>
              <button type="button" role="tab" className="bxr-tab" aria-selected={tab === "mine"} onClick={showMine}>
                {t.tabMine}{sent.length ? ` (${sent.length})` : ""}
              </button>
            </div>

            {tab === "new" && (state.step === "capturing" || state.step === "sending") && (
              <p className="bxr-msg" role="status">{state.step === "sending" ? t.sending : t.wait}</p>
            )}

            {tab === "new" && state.step === "form" && (
              <form onSubmit={send}>
                <fieldset className="bxr-fs">
                  <legend className="bxr-label">{t.kind}</legend>
                  {chips<Kind>("kind", kind, setKind, [["problem", t.problem], ["change", t.change], ["idea", t.idea]])}
                </fieldset>
                <label className="bxr-label" htmlFor="bxr-words">{t.words}</label>
                <textarea
                  id="bxr-words" className="bxr-text" name="words" required rows={5} maxLength={10000}
                  placeholder={t.placeholder} value={words} onChange={(e) => setWords(e.target.value)} autoFocus
                />
                <div className="bxr-element">
                  {element ? (
                    <>
                      <span>{t.element} <code>{element.text || element.selector}</code></span>
                      <button type="button" className="bxr-btn bxr-ghost bxr-small" onClick={() => setElement(null)}>{t.remove}</button>
                    </>
                  ) : (
                    <button type="button" className="bxr-btn bxr-ghost bxr-small" onClick={choose}>
                      <Target />{t.pick}
                    </button>
                  )}
                </div>
                <fieldset className="bxr-fs">
                  <legend className="bxr-label">{t.urgency}</legend>
                  {chips<Urgency>("urgency", urgency, setUrgency, [["low", t.low], ["normal", t.normal], ["high", t.high]])}
                </fieldset>
                <p className="bxr-note">{t.note}</p>
                <div className="bxr-row">
                  <button type="button" onClick={close} className="bxr-btn bxr-ghost">{t.cancel}</button>
                  <button type="submit" className="bxr-btn bxr-primary" disabled={!words.trim()}>{t.send}</button>
                </div>
              </form>
            )}

            {tab === "new" && state.step === "done" && (
              <>
                <p className="bxr-msg" role="status">{t.sent}</p>
                <p className="bxr-msg"><span className="bxr-ref">{t.ref}</span><strong>{state.id}</strong></p>
                <p className="bxr-note">{t.follow}</p>
                <div className="bxr-row">
                  <button type="button" onClick={showMine} className="bxr-btn bxr-ghost">{t.tabMine}</button>
                  <button type="button" onClick={close} className="bxr-btn bxr-primary">{t.close}</button>
                </div>
              </>
            )}

            {tab === "new" && state.step === "failed" && (
              <>
                <p className="bxr-msg" role="alert">{t.fail} {state.reason}</p>
                <div className="bxr-row">
                  <button type="button" onClick={close} className="bxr-btn bxr-ghost">{t.close}</button>
                  <button type="button" onClick={() => setState({ step: "form" })} className="bxr-btn bxr-primary">{t.retry}</button>
                </div>
              </>
            )}

            {tab === "mine" && (
              sent.length ? (
                <ul className="bxr-list">
                  {sent.map((s) => (
                    <li key={s.id} className="bxr-item">
                      <span>
                        <span className="bxr-item-title">{s.title}</span>
                        <span className="bxr-meta">{s.id} · {s.date}</span>
                      </span>
                      <span className="bxr-pill" data-status={s.status ?? "received"}>{t.status[s.status ?? "received"]}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="bxr-note">{t.empty}</p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
