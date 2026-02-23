/* global chrome */

const DEFAULT_APP_URL = "http://localhost:3000";
const APP_URL_KEY = "job_tracker_app_url";

function byId(id) {
  return document.getElementById(id);
}

function clean(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function setStatus(message, isError = false) {
  const node = byId("status");
  node.textContent = message;
  node.style.color = isError ? "#b91c1c" : "#475569";
}

function readForm() {
  return {
    role: clean(byId("role").value),
    company: clean(byId("company").value),
    location: clean(byId("location").value),
    jobUrl: clean(byId("jobUrl").value),
    jobText: byId("jobText").value.trim()
  };
}

function fillForm(data) {
  byId("role").value = data.role || "";
  byId("company").value = data.company || "";
  byId("location").value = data.location || "";
  byId("jobUrl").value = data.jobUrl || "";
  byId("jobText").value = data.jobText || "";
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function extractFromLinkedIn() {
  const tab = await getActiveTab();
  if (!tab || !tab.id || !tab.url) {
    setStatus("No active tab found.", true);
    return;
  }

  if (!tab.url.includes("linkedin.com/jobs")) {
    setStatus("Open a LinkedIn job page first.", true);
    return;
  }

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const clean = (value) => (value || "").replace(/\s+/g, " ").trim();

        const textFromSelectors = (selectors) => {
          for (const selector of selectors) {
            const node = document.querySelector(selector);
            const text = clean(node?.textContent || "");
            if (text) return text;
          }
          return "";
        };

        const meta = (key) => {
          const byProp = document.querySelector(`meta[property="${key}"]`);
          const byName = document.querySelector(`meta[name="${key}"]`);
          return clean(byProp?.getAttribute("content") || byName?.getAttribute("content") || "");
        };

        const titleFromMeta = meta("og:title") || clean(document.title || "");
        let role = textFromSelectors([
          ".job-details-jobs-unified-top-card__job-title h1",
          ".jobs-unified-top-card__job-title h1",
          ".top-card-layout__title",
          "h1",
        ]);
        let company = textFromSelectors([
          ".job-details-jobs-unified-top-card__company-name a",
          ".job-details-jobs-unified-top-card__company-name",
          ".jobs-unified-top-card__company-name a",
          ".jobs-unified-top-card__company-name",
          ".topcard__org-name-link",
        ]);
        let location = textFromSelectors([
          ".job-details-jobs-unified-top-card__primary-description-container .tvm__text",
          ".jobs-unified-top-card__primary-description-container .tvm__text",
          ".topcard__flavor--bullet",
        ]);
        const jobText = textFromSelectors([
          ".jobs-description__content .jobs-box__html-content",
          ".jobs-description-content__text",
          ".show-more-less-html__markup",
          ".jobs-description",
        ]);

        if (titleFromMeta && (!role || !company)) {
          const normalized = titleFromMeta.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
          const parts = normalized.split(" - ").map((x) => clean(x)).filter(Boolean);
          if (!role && parts.length > 0) role = parts[0];
          if (!company && parts.length > 1) company = parts[parts.length - 1];
          if (!location && parts.length > 2) {
            location = parts.slice(1, parts.length - 1).join(", ");
          }
        }

        return {
          role: role || "",
          company: company || "",
          location: location || "",
          jobText: jobText || meta("description") || "",
          jobUrl: window.location.href.split("?")[0] || "",
        };
      },
    });

    const data = result?.result || {};
    fillForm(data);
    const hasCore = Boolean(data.company) || Boolean(data.role);
    setStatus(
      hasCore
        ? "Extracted fields from LinkedIn."
        : "No strong match found. Fill manually and continue.",
      !hasCore,
    );
  } catch {
    setStatus("Could not read page. Reload LinkedIn tab and try again.", true);
  }
}

function normalizeAppUrl(value) {
  const fallback = DEFAULT_APP_URL;
  const input = clean(value) || fallback;

  try {
    const url = new URL(input);
    return `${url.protocol}//${url.host}`;
  } catch {
    return fallback;
  }
}

async function saveAppUrl(url) {
  await chrome.storage.sync.set({ [APP_URL_KEY]: url });
}

async function loadAppUrl() {
  return normalizeAppUrl(DEFAULT_APP_URL);
}

function buildAppPrefillUrl(baseUrl, data, autoCreate) {
  const target = new URL("/app", baseUrl);
  const params = target.searchParams;

  params.set("import", "1");
  if (autoCreate) params.set("import_autocreate", "1");
  if (data.role) params.set("import_role", data.role);
  if (data.company) params.set("import_company", data.company);
  if (data.location) params.set("import_location", data.location);
  if (data.jobUrl) params.set("import_job_url", data.jobUrl);
  if (data.jobText) params.set("import_job_text", data.jobText.slice(0, 5000));

  return target.toString();
}

async function openInApp() {
  const appUrl = normalizeAppUrl(byId("appUrl").value);
  byId("appUrl").value = appUrl;
  await saveAppUrl(appUrl);

  const payload = readForm();
  const url = buildAppPrefillUrl(appUrl, payload, false);
  await chrome.tabs.create({ url });
}

async function createInDb() {
  const appUrl = normalizeAppUrl(byId("appUrl").value);
  byId("appUrl").value = appUrl;
  await saveAppUrl(appUrl);

  const payload = readForm();
  if (!payload.company || !payload.role) {
    setStatus("Company and role are required to create directly.", true);
    return;
  }

  const url = buildAppPrefillUrl(appUrl, payload, true);
  await chrome.tabs.create({ url });
}

document.addEventListener("DOMContentLoaded", async () => {
  byId("appUrl").value = await loadAppUrl();

  byId("refresh").addEventListener("click", () => {
    void extractFromLinkedIn();
  });

  byId("open").addEventListener("click", () => {
    void openInApp();
  });
  byId("create").addEventListener("click", () => {
    void createInDb();
  });

  await extractFromLinkedIn();
});
