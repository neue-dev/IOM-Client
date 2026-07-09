import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SonnerToaster } from "@/components/sonner-toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ModalProvider } from "@/app/providers/modal-provider";
import { QueryProvider } from "@/app/providers/query-provider";

export const metadata: Metadata = {
  title: "Institutional MOA Platform",
  description: "MOA management between companies and universities",
  icons: { icon: "/BetterInternshipLogo.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <TooltipProvider>
          <ThemeProvider>
            <QueryProvider>
              <ModalProvider>{children}</ModalProvider>
            </QueryProvider>
          </ThemeProvider>
          <SonnerToaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
