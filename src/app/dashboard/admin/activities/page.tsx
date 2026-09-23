import { redirect } from "next/navigation";

export default function AdminActivitiesRedirect() {
  redirect("/dashboard/admin");
}
