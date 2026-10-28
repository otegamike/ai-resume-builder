import { NextResponse } from "next/server";
import { uploadImage } from "@/lib/cloudinary";
import { handleApiError } from "@/lib/api/handleApiError";
import { withApiHandler } from "@/lib/api/withApiHandler";

export const POST = withApiHandler(
  async (request: Request) => {
    try {
      const formData = await request.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;

      const folder = (formData.get("folder") as string) || "Resume";

      const uploadResponse = await uploadImage(base64Image, folder);

      return NextResponse.json({
        secure_url: uploadResponse.secure_url,
        public_id: uploadResponse.public_id,
      });
    } catch (error) {
      return handleApiError(error, { route: "/api/upload", flow: "upload" });
    }
  },
  { route: "/api/upload", flow: "upload" }
);
