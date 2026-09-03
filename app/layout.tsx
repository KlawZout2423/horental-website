import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AuthProvider } from "../lib/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SupportFAB from "../components/SupportFAB";
import MustChangePasswordModal from "../components/MustChangePasswordModal";
import PwaInstallPrompt from "../components/PwaInstallPrompt";
import { GoogleOAuthProvider } from '@react-oauth/google';
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
    default: "HO Rentals Ghana | Find Rooms, Hostels, Apartments & Furnitures in Ho & Ghana",
    template: "%s | HO Rentals Ghana"
  },
  description: "Browse and rent rooms, apartments, self-contains, student hostels, furniture, shops and lands in Ho, Volta Region, Accra, Kumasi and across Ghana. Find your perfect place with HO Rentals.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://horentals.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "HO Rentals Ghana | Rooms, Hostels, Furnitures & Apartments in Ghana",
    description: "Find affordable rooms, self-contains, student hostels, furniture and properties for rent in Ho & across Ghana.",
    url: "/",
    siteName: "HO Rentals Ghana",
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

        {/* Google AdSense Meta Verification & Script */}
        <meta name="google-adsense-account" content="ca-pub-4874960067589615" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4874960067589615"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "519451721356-ilcn2flc6ue3rqj9npgraevm8csg5uhc.apps.googleusercontent.com"}>
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
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
