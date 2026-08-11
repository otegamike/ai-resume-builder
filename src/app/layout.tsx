import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Lora, Limelight} from "next/font/google";
import "./globals.css";
import "../styles/variables.css";
import styles from "./layout.module.css";
import Header from "@/components/header/header";
import AppSessionProvider from "@/components/auth/SessionProvider";
import PageBody from "@/components/page-body/PageBody";
import PageViewTracker from "@/components/PageViewTracker";
import TemplateInitializer from "@/components/TemplateInitializer";
import AlertToast from "@/components/ui/AlertToast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta-variable', 
});

const logoFont = Limelight({
  weight: '400',
  subsets: ['latin'],
  variable: '--logo-font-variable', 
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora-variable', 
});

export const metadata: Metadata = {
  metadataBase: new URL("https://agenticapp.cv"),
  title: {
    default: "Agentic CV | AI Resume Builder & ATS Score Checker",
    template: "%s | Agentic CV",
  },
  description:
    "Build ATS-optimized resumes and personalized cover letters with AI. Get instant ATS compatibility scores, track applications, and generate tailored content that gets you interviews.",
  keywords: [
    "AI resume builder",
    "ATS resume checker",
    "AI cover letter generator",
    "ATS score",
    "job application tracker",
  ],
  alternates: {
    canonical: "https://agenticapp.cv",
  },
  openGraph: {
    type: "website",
    siteName: "Agentic CV",
    locale: "en_US",
    url: "https://agenticapp.cv",
    title: "Agentic CV | AI Resume Builder & ATS Score Checker",
    description:
      "Build ATS-optimized resumes and personalized cover letters with AI in minutes.",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentic CV | AI Resume Builder & ATS Score Checker",
    description:
      "Build ATS-optimized resumes and personalized cover letters with AI in minutes.",
    images: ["/og-default.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
 
  return (
      <html lang="en" 
        className={`
          ${geistSans.variable} 
          ${lora.variable} 
          ${jakarta.variable} 
          ${logoFont.variable}
          ${geistMono.variable} 
          ${styles.html}`}
      >
          
            <PageBody>
              <AppSessionProvider>
                <PageViewTracker />
                <TemplateInitializer />
                <Header />
                {children}
                <AlertToast />
              </AppSessionProvider>
            </PageBody>
      </html>
  );
}
