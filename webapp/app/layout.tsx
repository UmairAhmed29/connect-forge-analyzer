import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Connect → Forge Migration Analyzer',
  description:
    'Analyze an Atlassian Connect descriptor for Forge migration readiness — module-by-module mapping, blockers, platform risks and an effort estimate. Connect end of support: 31 January 2027.',
  openGraph: {
    title: 'Connect → Forge Migration Analyzer',
    description:
      'Module-by-module Forge migration readiness for your Atlassian Connect app. Every equivalent, every blocker, an effort estimate.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
