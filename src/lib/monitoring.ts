import { log } from "@/lib/logging";

type MonitoringContext = Record<string, unknown>;

export function reportError(
  event: string,
  error: unknown,
  context: MonitoringContext = {},
) {
  const details = error as { code?: string | number; message?: string };
  log.error(event, {
    ...context,
    code: details.code ?? null,
    message: details.message ?? "unknown",
  });

  if (!process.env.SENTRY_DSN) return;

  void import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.captureException(error, {
        tags: { event },
        extra: context,
      });
    })
    .catch(() => {
      // Ignore optional monitoring backend failures.
    });
}
