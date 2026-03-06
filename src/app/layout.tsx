import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'MockView AI — AI-Powered Mock Interviews & Resume Analysis',
  description:
    'Ace your next interview with AI-powered voice mock interviews, real-time coaching, resume intelligence scanning, and performance analytics.',
  keywords: ['mock interview', 'AI interview', 'resume analysis', 'career prep', 'voice interview'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
