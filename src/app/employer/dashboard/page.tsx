import { redirect } from "next/navigation";

export default function EmployerDashboardRedirect() {
  redirect("/dashboard/jobs");
}
