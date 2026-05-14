import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "АртРест Бонус",
  description: "Закрытый корпоративный портал",
  icons: {
    icon: "/site-icon.svg",
    shortcut: "/site-icon.svg",
    apple: "/site-icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
