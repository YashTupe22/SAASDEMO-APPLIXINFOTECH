import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppStoreProvider } from "@/lib/appStore";

export const metadata: Metadata = {
  title: "Synplix — Business Dashboard",
  description: "Modern SaaS business management platform for Synplix.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
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
