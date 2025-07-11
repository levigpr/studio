"use client";

import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { Toaster } from "@/components/ui/toaster"
import { Loader2 } from 'lucide-react';

// Note: Metadata export is not supported in client components.
// If you need to set metadata, you would typically do this in a parent server component
// or a dedicated metadata export in a page.tsx/layout.tsx file that remains a server component.
// For now, we will comment it out to resolve the immediate error.
/*
export const metadata: Metadata = {
  title: 'FisioApp',
  description: 'App de fisioterapia para terapeutas y pacientes',
};
*/

function AppContent({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <title>FisioApp</title>
        <meta name="description" content="App de fisioterapia para terapeutas y pacientes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <AppContent>{children}</AppContent>
        </AuthProvider>
      </body>
    </html>
  );
}
