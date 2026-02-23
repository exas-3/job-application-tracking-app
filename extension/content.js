/* global chrome */

function cleanText(value) {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

function textFromSelectors(selectors) {
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    const text = cleanText(node?.textContent || "");
    if (text) return text;
  }
  return "";
}

function extractJobData() {
  const role = textFromSelectors([
    ".job-details-jobs-unified-top-card__job-title h1",
    ".top-card-layout__title",
    "h1"
  ]);

  const company = textFromSelectors([
    ".job-details-jobs-unified-top-card__company-name a",
    ".job-details-jobs-unified-top-card__company-name",
    ".topcard__org-name-link",
    ".topcard__flavor-row .topcard__flavor"
  ]);

  const location = textFromSelectors([
    ".job-details-jobs-unified-top-card__bullet",
    ".tvm__text.tvm__text--low-emphasis",
    ".topcard__flavor--bullet"
  ]);

  const description = textFromSelectors([
    ".jobs-description__content .jobs-box__html-content",
    ".jobs-description-content__text",
    ".show-more-less-html__markup",
    "[data-job-id] .jobs-description"
  ]);

  return {
    role,
    company,
    location,
    jobText: description,
    jobUrl: window.location.href.split("?")[0]
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "EXTRACT_LINKEDIN_JOB") {
    return;
  }

  try {
    const data = extractJobData();
    sendResponse({ ok: true, data });
  } catch (error) {
    sendResponse({ ok: false, error: String(error) });
  }
});
