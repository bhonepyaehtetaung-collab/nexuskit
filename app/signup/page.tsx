import { redirect } from "next/navigation";

// Accounts are created automatically the first time a customer signs in
// with an email link on My Account.
export default function SignUpPage() {
  redirect("/my-account");
}
