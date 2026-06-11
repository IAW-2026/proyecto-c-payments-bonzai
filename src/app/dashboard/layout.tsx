import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Chatbot } from "@/components/ui/chatbot";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 bg-surface-low">
        <div className="mx-auto max-w-7xl px-6 py-10 pb-28 lg:px-8">
          {children}
        </div>
      </main>
      <Footer />
      <Chatbot />
    </>
  );
}
