"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      style={{ marginTop: 16 }}
    >
      Logout
    </button>
  );
}

