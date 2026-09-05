import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import User from "@/models/User";

void Company;
void User;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, website, industry, companySize, description, location, logo } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    await dbConnect();

    // Check if user already owns an organization
    const existingUser = await User.findById(session.user.id);
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (existingUser.organizationId) {
      const existingCompany = await Company.findById(existingUser.organizationId);
      if (existingCompany) {
        return NextResponse.json(
          { error: "You are already registered with an organization", company: existingCompany },
          { status: 400 }
        );
      }
    }

    // Generate unique slug
    let slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    
    const existingSlug = await Company.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString().slice(-4)}`;
    }

    const newCompany = await Company.create({
      name: name.trim(),
      slug,
      website: website || "",
      industry: industry || "Other",
      companySize: companySize || "1-10",
      description: description || "",
      location: location || "",
      logo: logo || "",
      ownerId: session.user.id,
      members: [{ userId: session.user.id, role: "owner" }],
      isVerified: false,
      status: "active",
    });

    // Update user record
    existingUser.organizationId = newCompany._id;
    existingUser.accountType = existingUser.accountType === "candidate" ? "both" : existingUser.accountType || "employer";
    await existingUser.save();

    return NextResponse.json({ success: true, company: newCompany }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating organization:", error);
    return NextResponse.json({ error: error.message || "Failed to create organization" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const company = await Company.findOne({
      $or: [{ ownerId: session.user.id }, { "members.userId": session.user.id }],
    });

    return NextResponse.json({ company: company || null });
  } catch (error: any) {
    console.error("Error fetching organization:", error);
    return NextResponse.json({ error: "Failed to fetch organization" }, { status: 500 });
  }
}
