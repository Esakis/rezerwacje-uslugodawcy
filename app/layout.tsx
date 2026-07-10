import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SWRegister } from "./sw-register";

export const metadata: Metadata = {
  title: "BookEasy — rezerwacje i przypomnienia SMS",
  description:
    "Kalendarz online i SMS-y przypominające o wizycie dla usługodawców. Bez prowizji.",
  applicationName: "BookEasy",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BookEasy",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body>
        {children}
        <SWRegister />
      </body>
    </html>
  );
}
