import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <span className="text-4xl">🌱</span>
          <h1 className="mt-4 text-2xl font-bold text-foreground">
            Bonzai Payments
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Creá tu cuenta para comenzar
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg border border-border",
            },
          }}
        />
      </div>
    </div>
  );
}
