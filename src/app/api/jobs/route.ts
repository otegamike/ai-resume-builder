import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import JobAd from "@/models/JobAd";
import Company from "@/models/Company";
import User from "@/models/User";

void JobAd;
void Company;
void User;

export async function GET(req: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const jobType = searchParams.get("jobType") || "";
    const workplaceType = searchParams.get("workplaceType") || "";
    const experienceLevel = searchParams.get("experienceLevel") || "";
    const location = searchParams.get("location") || "";
    const mine = searchParams.get("mine") === "true";
    const companyIdFilter = searchParams.get("companyId") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);

    const query: any = {};

    if (mine) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const me = await User.findById(session.user.id).select("organizationId isAdmin");
      if (!me) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (me.isAdmin) {
        // admins see all when mine=true without org filter, unless filtered below
      } else if (me.organizationId) {
        query.companyId = me.organizationId;
      } else {
        return NextResponse.json({ jobs: [], locations: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      }
    } else {
      query.status = "active";
    }

    if (companyIdFilter) query.companyId = companyIdFilter;

    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { skillsRequired: searchRegex },
      ];
    }

    if (category && category !== "All") {
      query.category = category;
    }

    if (jobType) {
      query.jobType = jobType;
    }

    if (workplaceType) {
      query.workplaceType = workplaceType;
    }

    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }

    if (location.trim()) {
      query.location = new RegExp(location.trim(), "i");
    }

    const skip = (page - 1) * limit;

    const locationQuery: any = mine ? {} : { status: "active" };
    if (locationQuery.status) {
      locationQuery.location = { $exists: true, $ne: "" };
    } else {
      locationQuery.location = { $exists: true, $ne: "" };
    }
    const [jobs, total, locations] = await Promise.all([
      JobAd.find(query)
        .sort({ isPinned: -1, isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("companyId", "name logo website industry location isVerified slug"),
      JobAd.countDocuments(query),
      JobAd.distinct("location", locationQuery)
    ]);

    return NextResponse.json({
      jobs,
      locations:  locations.sort((a, b) => a.localeCompare(b)), // Sort locations alphabetically
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const currentUser = await User.findById(session.user.id);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      title,
      companyId,
      jobType,
      workplaceType,
      location,
      category,
      experienceLevel,
      salaryMin,
      salaryMax,
      salaryCurrency,
      salaryPeriod,
      hideSalary,
      description,
      requirements,
      benefits,
      skillsRequired,
      screeningQuestions,
      applicationType,
      externalUrl,
      contactEmail,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Job title is required" }, { status: 400 });
    }

    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

    let targetCompanyId = companyId;

    if (currentUser.isAdmin) {
      const adminCompanyName = typeof body.companyName === "string" ? body.companyName.trim() : "";
      const adminCompanyWebsite = typeof body.companyWebsite === "string" ? body.companyWebsite.trim() : "";
      const adminCompanyLogo = typeof body.companyLogo === "string" ? body.companyLogo.trim() : "";
      const adminCompanyIndustry = typeof body.companyIndustry === "string" ? body.companyIndustry.trim() : "";
      const adminCompanyLocation = typeof body.companyLocation === "string" ? body.companyLocation.trim() : "";
      const adminCompanyDescription = typeof body.companyDescription === "string" ? body.companyDescription.trim() : "";

      if (adminCompanyName) {
        const baseSlug = adminCompanyName
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-");
        let company = await Company.findOne({ slug: baseSlug });
        if (!company) {
          company = await Company.create({
            name: adminCompanyName,
            slug: baseSlug,
            website: adminCompanyWebsite,
            logo: adminCompanyLogo,
            industry: adminCompanyIndustry || "Other",
            location: adminCompanyLocation,
            description: adminCompanyDescription,
            ownerId: currentUser._id,
            members: [{ userId: currentUser._id, role: "owner" }],
            isVerified: true,
            status: "active",
          });
        } else if (adminCompanyWebsite || adminCompanyLogo || adminCompanyDescription) {
          await Company.updateOne(
            { _id: company._id },
            {
              $set: {
                ...(adminCompanyWebsite ? { website: adminCompanyWebsite } : {}),
                ...(adminCompanyLogo ? { logo: adminCompanyLogo } : {}),
                ...(adminCompanyLocation ? { location: adminCompanyLocation } : {}),
                ...(adminCompanyIndustry ? { industry: adminCompanyIndustry } : {}),
                ...(adminCompanyDescription ? { description: adminCompanyDescription } : {}),
              },
            }
          );
        }
        targetCompanyId = company._id;
      } else if (companyId) {
        targetCompanyId = companyId;
      } else {
        if (!currentUser.organizationId) {
          return NextResponse.json(
            { error: "Company name is required for admin job posts" },
            { status: 400 }
          );
        }
        targetCompanyId = currentUser.organizationId;
      }
    } else {
      if (!currentUser.organizationId) {
        return NextResponse.json(
          { error: "You must register an organization before posting job ads" },
          { status: 403 }
        );
      }
      targetCompanyId = currentUser.organizationId;
    }

    const company = await Company.findById(targetCompanyId);
    if (!company) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Slug generation
    let slug = `${title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-")}-${company.slug}`;
    const existingSlug = await JobAd.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    // Admin direct publication vs Employer pending review
    const initialStatus = currentUser.isAdmin ? "active" : "pending_review";

    const newJob = await JobAd.create({
      title: title.trim(),
      slug,
      companyId: company._id,
      postedBy: currentUser._id,
      isFeatured: currentUser.isAdmin ? !!body.isFeatured : false,
      isPinned: currentUser.isAdmin ? !!body.isPinned : false,
      jobType: jobType || "full-time",
      workplaceType: workplaceType || "remote",
      location: location || "Remote",
      category: category || "General",
      experienceLevel: experienceLevel || "mid",
      salaryMin: salaryMin ? Number(salaryMin) : undefined,
      salaryMax: salaryMax ? Number(salaryMax) : undefined,
      salaryCurrency: salaryCurrency || "USD",
      salaryPeriod: salaryPeriod || "yearly",
      hideSalary: !!hideSalary,
      description: description.trim(),
      requirements: Array.isArray(requirements) ? requirements : [],
      benefits: Array.isArray(benefits) ? benefits : [],
      skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : [],
      screeningQuestions: Array.isArray(screeningQuestions) ? screeningQuestions : [],
      status: initialStatus,
      applicationType: applicationType || "on_platform",
      externalUrl: externalUrl || "",
      contactEmail: contactEmail || "",
    });

    return NextResponse.json(
      {
        success: true,
        job: newJob,
        message: currentUser.isAdmin
          ? "Job ad published successfully."
          : "Job ad submitted successfully and is now pending admin review for anti-scam approval.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating job ad:", error);
    return NextResponse.json({ error: error.message || "Failed to create job ad" }, { status: 500 });
  }
}
