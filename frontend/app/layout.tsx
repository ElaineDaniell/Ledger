import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Ledger - Privacy-Preserving Encrypted Ledger",
  description: "A FHEVM-based ledger system for encrypted income/expense tracking",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`zama-bg text-foreground antialiased`}>
        <div className="fixed inset-0 w-full h-full zama-bg z-[-20] min-w-[850px]"></div>
        <main className="flex flex-col max-w-screen-lg mx-auto pb-20 min-w-[850px]">
          <nav className="flex w-full px-3 md:px-0 h-fit py-10 justify-between items-center">
            <h1 className="text-3xl font-bold">Ledger</h1>
          </nav>
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}

