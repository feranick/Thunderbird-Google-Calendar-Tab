// Runs inside calendar.google.com. Finds events by reading Google's
// structured accessibility strings, which live in leaf elements and are
// reachable only by piercing shadow DOM (like the Messages input box).
//
// Each string looks like:
//   "6:50pm to 7:50pm, test, Nicola Ferralis, No location, June 25, 2026..."

console.log("[Calendar monitor] content script loaded");

const SCAN_INTERVAL_MS = 60000; // re-scan every minute

// Recursively collect leaf-element textContents, descending into shadow roots.
function deepCollectText(root, out = []) {
  const all = root.querySelectorAll("*");
  for (const el of all) {
    if (el.children.length === 0 && el.textContent) {
      out.push(el.textContent.trim());
    }
    if (el.shadowRoot) {
      deepCollectText(el.shadowRoot, out);
    }
  }
  return out;
}

// Parse one structured event string into { title, startMs } or null.
function parseEvent(text) {
  // Must look like "<time> to <time>, <title>, ..."
  // Start time: "6:50pm", "1pm", "11:30am" (am/pm has no preceding space)
  const timeMatch = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s+to\s+/i);
  if (!timeMatch) return null;

  // Date: "June 25, 2026"
  const dateMatch = text.match(/([A-Z][a-z]+ \d{1,2}, \d{4})/);
  if (!dateMatch) return null;

  // Title: the segment between the first and second ", "
  const parts = text.split(", ");
  // parts[0] = "6:50pm to 7:50pm", parts[1] = title
  const title = parts.length > 1 ? parts[1].trim() : "";
  if (!title) return null;

  // Build the start Date from the parsed date + time
  let hours = parseInt(timeMatch[1], 10);
  const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  const ap = timeMatch[3].toLowerCase();
  if (ap === "pm" && hours < 12) hours += 12;
  if (ap === "am" && hours === 12) hours = 0;

  const startDate = new Date(dateMatch[1]); // e.g. "June 25, 2026"
  if (isNaN(startDate.getTime())) return null;
  startDate.setHours(hours, minutes, 0, 0);

  return { title, startMs: startDate.getTime() };
}

function scanEvents() {
  const texts = deepCollectText(document);

  const events = [];
  const seen = new Set();

  for (const text of texts) {
    // Quick pre-filter: must contain " to " and an am/pm time
    if (!/ to /.test(text)) continue;
    if (!/\d{1,2}(:\d{2})?\s*(am|pm)/i.test(text)) continue;

    const ev = parseEvent(text);
    if (ev) {
      const id = ev.title + "@" + ev.startMs;
      if (!seen.has(id)) {
        seen.add(id);
        events.push({ id, title: ev.title, startMs: ev.startMs });
      }
    }
  }

  console.log("[Calendar monitor] found events:", events);

  if (events.length > 0) {
    browser.runtime.sendMessage({ type: "calendar-events", events });
  }
}

scanEvents();
setInterval(scanEvents, SCAN_INTERVAL_MS);
