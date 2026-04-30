import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Lora, Limelight} from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";
import "../styles/variables.css";
import styles from "./layout.module.css";
import Header from "@/components/header/header";

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
  title: "Resumy AI",
  description: "Resumy AI helps you create polished, ATS-ready resumes with AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
 
  return (
    <ClerkProvider>
      <html lang="en" 
        className={`
          ${geistSans.variable} 
          ${lora.variable} 
          ${jakarta.variable} 
          ${logoFont.variable}
          ${geistMono.variable} 
          ${styles.html}`}
      >
        <body className={styles.body}>
          
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
