import * as React from "react";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function Dialog({ open, onClose, title, description, children }: DialogProps) {
  const closeRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          "relative z-10 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="dialog-title" className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-slate-600">{description}</p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
