"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Loader2, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const { signOut } = useClerk();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        void signOut({ redirectUrl: "/sign-in" });
      }}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      Cerrar sesión
    </Button>
  );
}
