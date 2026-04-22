"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { FileText, Settings, Sparkles, Home, LogOut } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { signOut } = useClerk();

  const handleSignOut = () => {
    signOut({ redirectUrl: "/" });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-20 flex items-center px-6 border-b border-gray-200">
          <Link className="flex items-center gap-2" href="/">
            <Sparkles className="h-6 w-6 text-[var(--primary-1)]" />
            <span className="font-bold text-xl tracking-tight text-foreground text-primary-2">
              Resumy AI
            </span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md bg-[var(--primary-4)] text-[var(--primary-1)] font-medium transition-colors">
            <Home className="h-5 w-5" />
            Dashboard
          </Link>
          <Link href="/editor/new" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700 font-medium transition-colors">
            <FileText className="h-5 w-5" />
            Create Resume
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700 font-medium transition-colors">
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md hover:bg-red-50 text-red-600 font-medium transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
