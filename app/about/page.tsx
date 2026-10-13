import { redirect } from "next/navigation";

// About now lives in the footer and My Account → Help.
export default function AboutPage() {
  redirect("/");
}
