import type { Metadata } from "next";
import { buildJobMetadata } from "@/lib/jobMetadata";
import JobDetailClient from "./JobDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return buildJobMetadata(slug);
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <JobDetailClient params={params} />;
}

