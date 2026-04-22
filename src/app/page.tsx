import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Sparkles, FileText, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Header */}
      <header className="px-6 lg:px-14 h-20 flex items-center border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2" href="#">
          <Sparkles className="h-6 w-6 text-primary-1" />
          <span className="font-bold text-xl tracking-tight text-foreground">
            Resumy AI
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium hover:text-[var(--primary-1)] transition-colors" href="#features">
            Features
          </Link>
          <Link className="text-sm font-medium hover:text-[var(--primary-1)] transition-colors" href="#pricing">
            Pricing
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="bg-[var(--primary-1)] hover:bg-[var(--primary-2)] text-white">
              Get Started
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 lg:py-32 relative flex justify-center">
          {/* Subtle gradient background */}
          <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-gradient-to-r from-[var(--primary-4)] to-transparent opacity-50 blur-[120px] -z-10" />
          <div className="absolute top-0 -right-1/4 w-1/2 h-full bg-gradient-to-l from-[var(--primary-3)] to-transparent opacity-30 blur-[120px] -z-10" />
          
          <div className="container px-4 md:px-6 z-10 flex flex-col items-center text-center max-w-6xl mx-auto">
            <div className="inline-flex items-center rounded-full border border-[var(--primary-2)] px-3 py-1 text-sm mb-6 text-[var(--primary-1)] bg-[var(--primary-4)] opacity-80 decoration-solid">
              <Sparkles className="mr-2 h-4 w-4" />
              Meet Resumy AI
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground mb-6 max-w-4xl">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-1)] to-[var(--primary-2)]">Resumy AI</span> builds polished resumes with AI.
            </h1>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed mb-10">
              Create recruiter-ready, ATS-friendly resumes in minutes with guided writing, live previewing, and a workflow designed to help your experience stand out.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl transition-all">
                  Create Resume Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full bg-white">
                  See how it works
                </Button>
              </Link>
            </div>
            
            <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-100 bg-white transform translate-y-4 hover:-translate-y-2 transition-transform duration-500">
              <Image 
                src="/hero.png" 
                alt="App Dashboard Preview" 
                layout="responsive"
                width={1200}
                height={600}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-24 bg-gray-50 flex justify-center border-t border-gray-100">
          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-[var(--primary-1)]">Unlock your career potential</h2>
              <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed">
                Everything you need to create a compelling resume that lands interviews.
              </p>
            </div>
            <div className="mx-auto grid items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col items-center space-y-4 text-center p-8 rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-4 bg-[var(--primary-4)] rounded-full mb-2">
                  <Sparkles className="h-8 w-8 text-[var(--primary-1)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--primary-1)]">AI Content Writer</h3>
                <p className="text-gray-500">
                  Stuck staring at a blank page? Let our AI suggest bullet points, rewrite summaries, and improve your phrasing.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-8 rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-4 bg-[var(--primary-4)] rounded-full mb-2">
                  <CheckCircle2 className="h-8 w-8 text-[var(--primary-1)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--primary-1)]">Live Preview</h3>
                <p className="text-gray-500">
                  See changes instantly as you type. Real-time rendering ensures your resume looks perfect before you export.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center p-8 rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="p-4 bg-[var(--primary-4)] rounded-full mb-2">
                  <FileText className="h-8 w-8 text-[var(--primary-1)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--primary-1)]">PDF Export</h3>
                <p className="text-gray-500">
                  Download your finished resume instantly in a high-quality PDF format, ready to be sent directly to recruiters.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="border-t py-10 text-center flex justify-center bg-white">
        <p className="text-sm text-gray-500">
          (c) {new Date().getFullYear()} Resumy AI. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

