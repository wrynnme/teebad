import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { LiffProvider } from "@/contexts/LiffContext";
import { Toaster } from "@/components/ui/sonner";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LiffProvider>
      <Component {...pageProps} />
      <Toaster richColors position="top-center" />
    </LiffProvider>
  );
}
