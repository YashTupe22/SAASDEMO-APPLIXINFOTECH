import type { Metadata } from "next";
import "./globals.css";
import { AppStoreProvider } from "@/lib/appStore";

export const metadata: Metadata = {
  title: "Applix Infotech — Business Dashboard",
  description: "Modern SaaS business management platform for Applix Infotech Services.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppStoreProvider>{children}</AppStoreProvider>
      </body>
    </html>
  );
}
