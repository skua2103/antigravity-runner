import "./globals.css";

export const metadata = {
  title: "Neon Runner",
  description: "A cyberpunk themed 2D infinite runner game",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
