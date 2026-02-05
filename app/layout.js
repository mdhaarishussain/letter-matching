import './globals.css';

export const metadata = {
  title: 'Alphabet Matching Game',
  description: 'Kindergarten-friendly uppercase and lowercase alphabet matching game.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
