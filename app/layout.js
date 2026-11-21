import './globals.css';

export const metadata = {
  title: 'Annapurna',
  description: 'Connect campus food donors with nearby community kitchens, shelters, and NGOs.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
