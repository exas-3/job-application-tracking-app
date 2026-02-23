"use client";

import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { toast } from "sonner";
import { trackAnalyticsEvent } from "@/lib/firebase/analytics";
import { firebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        await signOut(firebaseAuth);
        await fetch("/api/session/logout", { method: "POST" });
        await trackAnalyticsEvent("logout");
        toast.message("Logged out.");
        router.push("/login");
      }}
    >
      <LogOut className="mr-2 h-4 w-4" /> Logout
    </Button>
  );
}
