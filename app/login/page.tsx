import { redirect } from "next/navigation";

// Customers sign in with an email link on My Account.
export default function LoginPage() {
  redirect("/my-account");
}
