export const metadata = {
  title: 'AI Will Maker',
  description: 'Write your will with an AI assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}