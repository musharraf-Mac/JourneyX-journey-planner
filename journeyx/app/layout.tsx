import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
export const metadata: Metadata = {
  title: 'JourneyX — Your next journey, sorted',
  description: 'Compare bus journeys across Colombo by time, fare, transfers, and reliability.',
};
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return <html lang="en"><body>{children}</body></html>;
}
