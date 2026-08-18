import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "../lib/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SupportFAB from "../components/SupportFAB";
import MustChangePasswordModal from "../components/MustChangePasswordModal";
import PwaInstallPrompt from "../components/PwaInstallPrompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "HO Rentals | Find Rooms, Hostels & Apartments in Ho & Volta Region",
    template: "%s | HO Rentals"
  },
  description: "Browse and rent rooms, apartments, self-contains, student hostels, shops and lands in Ho, Hohoe and across the Volta Region of Ghana. Find your perfect place with HO Rentals.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://horentals.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "HO Rentals | Rooms, Hostels & Apartments in Volta Region",
    description: "Find affordable rooms, self-contains, student hostels, and properties for rent in Ho & across the Volta Region of Ghana.",
    url: "/",
    siteName: "HO Rentals",
    locale: "en_GH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HO Rentals | Find Properties in Ho & Volta Region",
    description: "Browse rooms, hostels, and apartments for rent in Ho & Volta Region.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#C1121F" />


        {/* Google Analytics */}
        {gaMeasurementId && gaMeasurementId !== 'G-placeholder' && (
          <>
            <Script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}');
              `}
            </Script>
          </>
        )}
      </head>
      <body>
        <AuthProvider>
          <MustChangePasswordModal />
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <main style={{ flexGrow: 1, paddingTop: '70px' }}>
              {children}
            </main>
            <Footer />
            <SupportFAB />
            <PwaInstallPrompt />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
