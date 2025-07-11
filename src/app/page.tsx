"use client";

import { useAuth } from "@/context/auth-context";
import { LoginForm } from "@/components/auth/login-form";

export default function Home() {
  const { loading, user } = useAuth();

  // The AuthProvider now handles redirection and shows a loading screen.
  // This page will only render the LoginForm when loading is complete AND there's no user.
  // If a user is logged in, the AuthProvider will have already redirected them.
  if (loading || user) {
    // AuthProvider shows its own loader, but as a fallback, we can show one here too.
    return null;
  }

  return <LoginForm />;
}
