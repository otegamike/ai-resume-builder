import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUser";
import dbConnect from "@/lib/db";
import Resume from "@/models/Resume";
import { ResumeContent } from "@/types/ResumeData";
import { templateDefinitions } from "@/lib/templateCatalog";
import { getRandomTemplateId } from "@/utils/templateUtils";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const runtime = "nodejs";

interface CreateImprovedResumeBody {
  title?: string;
  template?: string;
  improvedResume?: ResumeContent;
}

export const POST = withApiHandler(
  async (request: NextRequest) => {
    try {
      const authUser = await getAuthenticatedUser();
      if (!authUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = (await request.json()) as CreateImprovedResumeBody;
      if (!body.improvedResume) {
        return NextResponse.json(
          { error: "Improved resume content is required" },
          { status: 400 }
        );
      }

      await dbConnect();
      const resume = new Resume({
        user: authUser.userObjectId,
        title: body.title || "Improved Resume",
        template: body.template || getRandomTemplateId(templateDefinitions),
        content: body.improvedResume,
      });

      const savedResume = await resume.save();
      return NextResponse.json(
        { id: savedResume._id, content: savedResume.content },
        { status: 201 }
      );
    } catch (error) {
      return handleApiError(error, { route: "/api/resume-improver/create", flow: "resume-improver" });
    }
  },
  { route: "/api/resume-improver/create", flow: "resume-improver" }
);
