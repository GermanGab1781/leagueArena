import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RotateCameraAlert from "@/components/rotateCameraAlert";
import { AudioSettingsProvider } from "@/components/Settings/audioSettings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "League Arena",
  description: "Rogelike",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AudioSettingsProvider>
          <RotateCameraAlert/>
          {children}
        </AudioSettingsProvider>
      </body>
    </html>
  );
}
