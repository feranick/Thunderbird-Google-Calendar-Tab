// --- SPACES TOOLBAR BUTTON ---

browser.spacesToolbar.addButton('GoogleCalendar', {
  title: browser.i18n.getMessage("toolbarButtonTitle"),
  defaultIcons: "skin/google_calendar_icon.svg",
  url: "https://calendar.google.com/"
});

// --- USER-AGENT SPOOFING ---

browser.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    for (let header of details.requestHeaders) {
      if (header.name.toLowerCase() === "user-agent") {
        header.value = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:147.0) Gecko/20100101 Firefox/147.0";
        break;
      }
    }
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ["https://calendar.google.com/*", "https://*.google.com/*"] },
  ["blocking", "requestHeaders"]
);

// --- CALENDAR EVENT NOTIFICATION CODE ---
//
// The content script (calendar-monitor.js) scans the calendar page every
// minute and reports upcoming events with parsed start times. For each
// event we schedule a precise setTimeout to fire exactly at
// (startMs - leadMinutes), so the reminder is on time regardless of how
// often the scan runs. Notifications can be toggled and the lead time
// adjusted via the Options page.

let notificationsEnabled = true;       // cached setting
let leadMinutes = 10;                  // cached setting
const notifiedEvents = new Set();      // event ids already notified today
const scheduledTimers = new Map();     // event id -> setTimeout handle

// --- Load settings on startup ---

browser.storage.local.get({ notificationsEnabled: true, leadMinutes: 10 }).then((items) => {
  notificationsEnabled = items.notificationsEnabled;
  leadMinutes = items.leadMinutes;
});

// --- Keep cached settings in sync with Options changes ---

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  if (changes.notificationsEnabled) {
    notificationsEnabled = changes.notificationsEnabled.newValue;
  }

  if (changes.leadMinutes) {
    leadMinutes = changes.leadMinutes.newValue;
    // Lead time changed: cancel all pending timers; the next scan will
    // reschedule them using the new lead time.
    for (const handle of scheduledTimers.values()) {
      clearTimeout(handle);
    }
    scheduledTimers.clear();
  }
});

// --- Clear per-day state at midnight so events recur correctly ---

function scheduleMidnightReset() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  setTimeout(() => {
    notifiedEvents.clear();
    for (const handle of scheduledTimers.values()) {
      clearTimeout(handle);
    }
    scheduledTimers.clear();
    scheduleMidnightReset();
  }, midnight.getTime() - now.getTime());
}
scheduleMidnightReset();

// --- Receive scanned events and schedule precise notifications ---

browser.runtime.onMessage.addListener((message) => {
  if (message.type !== "calendar-events") return;
  if (!notificationsEnabled) return;

  const now = Date.now();
  const leadMs = leadMinutes * 60 * 1000;

  for (const ev of message.events) {
    // Skip if already scheduled or already fired.
    if (scheduledTimers.has(ev.id)) continue;
    if (notifiedEvents.has(ev.id)) continue;

    const fireAt = ev.startMs - leadMs;
    const delay = fireAt - now;

    // Skip events that are already well underway (fire time passed by more
    // than the lead window).
    if (delay < -leadMs) continue;

    // If we discovered the event slightly late, fire almost immediately;
    // otherwise wait until the precise fire time.
    const wait = Math.max(0, delay);

    const handle = setTimeout(() => {
      scheduledTimers.delete(ev.id);
      if (notifiedEvents.has(ev.id)) return;
      notifiedEvents.add(ev.id);

      // Recompute minutes-until at fire time for an accurate message.
      const minutes = Math.max(1, Math.round((ev.startMs - Date.now()) / 60000));
      const title = ev.title || browser.i18n.getMessage("notificationEventFallback");
      const body = browser.i18n.getMessage("notificationEventBody", [title, String(minutes)]);

      browser.notifications.create("calendar-event-" + ev.id, {
        type: "basic",
        iconUrl: "skin/google_calendar_icon.png",
        title: browser.i18n.getMessage("notificationTitle"),
        message: body
      }).catch((error) => {
        console.error("Failed to create notification:", error);
      });
    }, wait);

    scheduledTimers.set(ev.id, handle);
  }
});

// --- Focus the Calendar tab when a notification is clicked ---

browser.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith("calendar-event-")) {
    browser.tabs.query({ url: "*://calendar.google.com/*" }).then((tabs) => {
      if (tabs.length > 0) {
        browser.tabs.update(tabs[0].id, { active: true });
        if (tabs[0].windowId) {
          browser.windows.update(tabs[0].windowId, { focused: true });
        }
      }
    }).catch((error) => {
      console.error("Error focusing Calendar tab via notification click: ", error);
    });
  }
});
