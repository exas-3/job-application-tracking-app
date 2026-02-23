"use client";

import { signOut } from "firebase/auth";
import { trackAnalyticsEvent } from "@/lib/firebase/analytics";
import { firebaseAuth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await signOut(firebaseAuth);
        await fetch("/api/session/logout", { method: "POST" });
        await trackAnalyticsEvent("logout");
        router.push("/login");
      }}
      style={{ marginTop: 16 }}
    >
      Logout
    </button>
  );
}
