import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'JourneyX — Your next journey, sorted',
  description: 'Compare public transport journeys across Colombo by time, fare, transfers, and reliability.',
};
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return <html lang="en"><body>{children}</body></html>;
}
