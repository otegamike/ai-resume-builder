"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Plus, FileText, Clock, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Resume {
  _id: string;
  title: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const { isLoaded, userId } = useAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!userId) {
      window.location.href = "/";
      return;
    }

    const fetchResumes = async () => {
      try {
        const response = await fetch('/api/resumes');
        if (response.ok) {
          const data: Resume[] = await response.json();
          setResumes(data);
        } else {
          setError("Failed to load resumes");
        }
      } catch {
        setError("Failed to load resumes");
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, [isLoaded, userId]);

  const deleteResume = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resume?")) return;

    try {
      const response = await fetch(`/api/resumes/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setResumes(resumes.filter((r) => r._id !== id));
      } else {
        alert("Failed to delete resume");
      }
    } catch {
      alert("Failed to delete resume");
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-1)]" />
          <p className="text-gray-500">Loading your resumes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <p className="text-red-500">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Resumes</h1>
          <p className="text-gray-500 mt-1">Manage and edit your created resumes.</p>
        </div>
        <Link href="/editor/new">
          <Button className="gap-2">
            <Plus className="h-5 w-5" />
            Create New
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create New Card */}
        <Link href="/editor/new">
          <div className="h-64 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-[var(--primary-1)] hover:text-[var(--primary-1)] hover:bg-[var(--primary-4)] transition-all cursor-pointer group">
            <div className="h-14 w-14 rounded-full bg-gray-100 group-hover:bg-white flex items-center justify-center mb-4 transition-colors">
              <Plus className="h-6 w-6" />
            </div>
            <span className="font-medium text-lg">Start from scratch</span>
          </div>
        </Link>

        {/* Existing Resumes */}
        {resumes.map((resume) => (
          <div key={resume._id} className="h-64 border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col group overflow-hidden hover:shadow-md transition-shadow relative">
            <div className="flex-1 bg-gray-50 flex items-center justify-center border-b border-gray-100 p-4">
              {/* Preview Placeholder */}
              <div className="w-32 h-44 bg-white shadow-sm border border-gray-200 rounded p-2 flex flex-col gap-2">
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                <div className="h-1 bg-gray-200 rounded w-full"></div>
                <div className="h-1 bg-gray-200 rounded w-full"></div>
                <div className="h-1 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
            
            <div className="p-4 bg-white flex justify-between items-center z-10">
              <div>
                <h3 className="font-semibold text-gray-900 truncate max-w-[200px]">{resume.title}</h3>
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(resume.updatedAt).toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Link href={`/editor/${resume._id}`}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                    <FileText className="h-4 w-4" />
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deleteResume(resume._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
