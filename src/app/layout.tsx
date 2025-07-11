import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'FisioApp',
  description: 'App de fisioterapia para terapeutas y pacientes',
};

function AppContent({ children }: { children: React.ReactNode }) {
  // This component now exists inside AuthProvider's scope
  // But we don't need to use the hook here, it's just for structure
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
