// picker.ts — the element picker of the request button (blueprint 1.0.0-rc32).
// The client selects one element of the page. The picker reads no form value: a field
// gives only its label, its name or its placeholder.
import { oneLine, redactText } from "./core";
import type { Box, PickedElement } from "./core";
import type { BrowserCapture } from "./capture";

const OWN = "[data-baxter-request]";

// A CSS path of the element: a test id or a unique id stops the path; else at most 6
// levels of tag and position.
function selectorOf(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== document.documentElement && parts.length < 6) {
    const current: Element = node;
    const testId = current.getAttribute("data-testid");
    if (testId) {
      parts.unshift(`[data-testid="${CSS.escape(testId)}"]`);
      break;
    }
    if (current.id && !/\d{4,}|:/.test(current.id) && document.querySelectorAll(`#${CSS.escape(current.id)}`).length === 1) {
      parts.unshift(`#${CSS.escape(current.id)}`);
      break;
    }
    const tag = current.tagName.toLowerCase();
    const parent: Element | null = current.parentElement;
    const same = parent ? Array.from(parent.children).filter((c) => c.tagName === current.tagName) : [];
    parts.unshift(same.length > 1 ? `${tag}:nth-of-type(${same.indexOf(current) + 1})` : tag);
    node = parent;
  }
  return redactText(parts.join(" > ")).slice(0, 300);
}

function textOf(el: Element): string {
  const field = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
  const own =
    el.getAttribute("aria-label") ||
    el.getAttribute("alt") ||
    el.getAttribute("title") ||
    (field ? el.getAttribute("name") || el.getAttribute("placeholder") || "" : (el as HTMLElement).innerText || el.textContent || "");
  return redactText(oneLine(own)).slice(0, 120);
}

export function describe(el: Element): PickedElement {
  const r = el.getBoundingClientRect();
  return {
    selector: selectorOf(el),
    tag: el.tagName.toLowerCase(),
    text: textOf(el),
    box: { x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY), width: Math.round(r.width), height: Math.round(r.height) },
  };
}

// Let the client select one element. A frame follows the pointer; a click selects; Escape
// or the cancel button gives null. The page gets no click while the picker is on.
export function pickElement(hint: string, cancel: string): Promise<PickedElement | null> {
  return new Promise((resolve) => {
    const frame = document.createElement("div");
    frame.setAttribute("data-baxter-request", "picker");
    frame.className = "bxr bxr-pick-frame";
    const tip = document.createElement("div");
    tip.setAttribute("data-baxter-request", "picker");
    tip.setAttribute("role", "status");
    tip.className = "bxr bxr-pick-tip";
    const label = document.createElement("span");
    label.textContent = hint;
    const stop = document.createElement("button");
    stop.type = "button";
    stop.textContent = cancel;
    tip.append(label, stop);
    document.body.append(frame, tip);

    const at = (e: MouseEvent): Element | null => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      return el && !el.closest(OWN) ? el : null;
    };
    const move = (e: PointerEvent) => {
      const el = at(e);
      if (!el) return;
      const r = el.getBoundingClientRect();
      Object.assign(frame.style, { display: "block", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    };
    const block = (e: Event) => {
      if (at(e as MouseEvent)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const click = (e: MouseEvent) => {
      const el = at(e);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      finish(describe(el));
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      finish(null);
    };
    const events: [string, EventListener][] = [
      ["pointermove", move as EventListener],
      ["pointerdown", block],
      ["mousedown", block],
      ["mouseup", block],
      ["click", click as EventListener],
      ["keydown", key as EventListener],
    ];
    function finish(value: PickedElement | null) {
      for (const [name, fn] of events) document.removeEventListener(name, fn, true);
      frame.remove();
      tip.remove();
      resolve(value);
    }
    stop.addEventListener("click", () => finish(null));
    for (const [name, fn] of events) document.addEventListener(name, fn, true);
    stop.focus();
  });
}

// The picture with a frame around the selected element. On a fault: the picture as it is.
export async function outline(taken: BrowserCapture, box: Box): Promise<string | null> {
  if (!taken.screenshot) return null;
  try {
    const image = new Image();
    image.src = taken.screenshot;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return taken.screenshot;
    context.drawImage(image, 0, 0);
    const scale = canvas.width / taken.view.width;
    context.strokeStyle = "#e11d48";
    context.lineWidth = Math.max(3, 3 * scale);
    context.strokeRect(
      (box.x - taken.view.scrollX) * scale,
      (box.y - taken.view.scrollY) * scale,
      box.width * scale,
      box.height * scale,
    );
    const png = canvas.toDataURL("image/png");
    return png.length < 3_000_000 ? png : canvas.toDataURL("image/jpeg", 0.75);
  } catch {
    return taken.screenshot;
  }
}
