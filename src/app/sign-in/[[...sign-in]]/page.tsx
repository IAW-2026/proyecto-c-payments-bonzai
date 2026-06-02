import { EmailCheckSignIn } from "@/components/auth/EmailCheckSignIn";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-low px-6 py-12">
      <EmailCheckSignIn />
    </div>
  );
}
