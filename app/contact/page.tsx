import { redirect } from "next/navigation";

// Contact details now live in My Account → Help (and the Telegram button).
export default function ContactPage() {
  redirect("/my-account#help");
}
