"use client";

import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { getFirebaseClientApp } from "@/lib/firebase/client";

let analyticsInit: Promise<ReturnType<typeof getAnalytics> | null> | null = null;

async function getFirebaseAnalytics() {
  if (typeof window === "undefined") return null;
  if (!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) return null;

  if (!analyticsInit) {
    analyticsInit = isSupported()
      .then((supported) =>
        supported ? getAnalytics(getFirebaseClientApp()) : null,
      )
      .catch(() => null);
  }

  return analyticsInit;
}

export async function trackPageView(pagePath: string) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  logEvent(analytics, "page_view", { page_path: pagePath });
}

export async function trackAnalyticsEvent(
  name: string,
  params: Record<string, string | number | boolean> = {},
) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  logEvent(analytics, name, params);
}
