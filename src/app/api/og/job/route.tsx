/* eslint-disable @typescript-eslint/no-explicit-any */
import { ImageResponse } from "next/og";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import Company from "@/models/Company";

void JobAd;
void Company;

export const runtime = "nodejs";
export const revalidate = 3600;

function formatSalary(job: any): string | null {
  if (!job || job.hideSalary) return null;
  const min = job.salaryMin;
  if (min == null || min === "" || Number(min) === 0) {
    // Match site logic: salaryMin falsy => no display. But keep check for 0 edge.
    // FindJobsBoard checks !job.salaryMin, so 0 is falsy -> omit.
    if (!min) return null;
  }
  const salaryMinNum = Number(min);
  if (!salaryMinNum) return null;
  const cur = String(job.salaryCurrency || "").toUpperCase();
  const symbolMap: Record<string, string> = { USD: "$", NGN: "₦", GBP: "£", EUR: "€" };
  const sym = symbolMap[cur] ?? (cur ? cur + " " : "");
  const periodMap: Record<string, string> = { yearly: "/yr", monthly: "/mo", hourly: "/hr" };
  const period = periodMap[String(job.salaryPeriod || "").toLowerCase()] ?? (job.salaryPeriod ? `/${job.salaryPeriod}` : "");
  const periodSuffix = period ? ` ${period}` : "";
  const minStr = salaryMinNum.toLocaleString();
  const maxVal = job.salaryMax != null ? Number(job.salaryMax) : null;
  if (!maxVal) return `${sym}${minStr}${periodSuffix}`.trim();
  return `${sym}${minStr} - ${sym}${maxVal.toLocaleString()}${periodSuffix}`.trim();
}

function truncateTitle(title: string, max = 80): string {
  const t = String(title || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

export async function GET(req: Request) {
  let title = "Job Opportunity";
  let subtitle = "";

  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug")?.trim() || "";

    if (slug) {
      await dbConnect();
      const job: any = await JobAd.findOne({
        $or: [
          { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null },
          { slug },
        ],
      })
        .populate("companyId", "name")
        .lean();

      if (job) {
        const rawTitle = String(job.title || "").trim() || "Job Opportunity";
        title = truncateTitle(rawTitle, 80);

        // Company: omit if unspecified variants or empty
        let rawCompany = "";
        if (job.companyId && typeof job.companyId === "object" && "name" in job.companyId) {
          rawCompany = String((job.companyId as any).name || "").trim();
        }
        const lowered = rawCompany.toLowerCase();
        const isUnspecified = !lowered || lowered === "unspecified" || lowered === "unspecified company";
        const company = isUnspecified ? "" : rawCompany;

        const location = String(job.location || "").trim();
        const jobType = String(job.jobType || "").trim();
        const salary = formatSalary(job);

        const parts: string[] = [];
        if (company) parts.push(company);
        if (location) parts.push(location);
        if (jobType) parts.push(jobType);
        if (salary) parts.push(salary);

        subtitle = parts.filter(Boolean).join(" · ");
      }
    }
  } catch {
    // fall through to defaults: title "Job Opportunity", empty subtitle
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#f6efdd",
          display: "flex",
          padding: "48px",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
            border: "3px solid #779f6d",
            borderRadius: "12px",
            padding: "60px 72px",
            background: "#f6efdd",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: "88%",
            }}
          >
            <div
              style={{
                color: "#2f3b2c",
                fontSize: "60px",
                fontWeight: 500,
                lineHeight: 1.1,
                display: "flex",
              }}
            >
              {title}
            </div>
            {subtitle ? (
              <div
                style={{
                  color: "#5c6b57",
                  fontSize: "22px",
                  marginTop: "16px",
                  display: "flex",
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>

          <div
            style={{
              position: "absolute",
              bottom: "38px",
              right: "43px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <svg width="35" height="28.22" viewBox="0 0 110 89" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M61.083 15.114a7.62 7.62 0 0 0 0-7.621l-1.194-2.07a10.847 10.847 0 0 0-18.788 0L1.287 74.384a9.607 9.607 0 0 0 8.281 14.411L60.891 89a5.203 5.203 0 0 0 4.548-7.767L59.66 71.032a7.76 7.76 0 0 0-6.676-3.935l-21.791-.211z"
                fill="#779f6d"
              />
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M64.372 25.209a3.172 3.172 0 0 0-5.541.059l-8.316 15.3a5.36 5.36 0 0 0-.032 5.057l21.96 41.667a2.19 2.19 0 0 0 1.886 1.168c2.184.05 4.793-4.073 5.195-4.758 5.987-10.183 20.678-37.029 29.084-51.325a5.006 5.006 0 0 0-4.315-7.542h-10.96c-3.975 0-6.131 5.873-6.131 5.873l-10.69 18.916s-7.803-16.83-12.14-24.415"
                fill="#779f6d"
              />
            </svg>
            <div
              style={{
                color: "#5c6b57",
                fontWeight: 500,
                fontSize: "30px",
                display: "flex",
              }}
            >
              AgenticApp.cv
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
