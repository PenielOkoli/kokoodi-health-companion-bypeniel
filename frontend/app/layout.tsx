import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "./components/LanguageContext";

export const metadata: Metadata = {
  title: "Health Information Companion | Kokoodi",
  description: "Plain-language health guidance in English and Nigerian Pidgin.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-900 antialiased">
        <LanguageProvider>
          <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
        </LanguageProvider>
      </body>
    </html>
  );
}
