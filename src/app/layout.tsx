import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sharad Utsav 2026 | Radha Krishna Temple",
  description: "Book your tickets for Sharad Utsav 2026 at Radha Krishna Temple, Allen, Texas. November 10–14, 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
