import { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Topbar } from "@/components/Topbar";

interface LayoutProps {
  children: ReactNode;
  showNavbar?: boolean;
  showTopbar?: boolean;
}

export function Layout({ children, showNavbar = true, showTopbar = true }: LayoutProps) {
  return (
    <div className="min-h-screen">
      {showTopbar && <Topbar />}
      {showNavbar && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
} 