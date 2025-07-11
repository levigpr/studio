"use client";

import { useAuth } from "@/context/auth-context";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { loading } = useAuth();

  // The AuthProvider will now handle redirection automatically.
  // We just need to show a loading state until the user is redirected.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  // This part should ideally not be reached if redirection is working,
  // but it's a good fallback. It could redirect to login or show a message.
  // For now, we'll keep showing the loader as the redirection should be quick.
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-16 w-16 animate-spin" />
      <p className="ml-4">Redirigiendo...</p>
    </div>
  );
}
