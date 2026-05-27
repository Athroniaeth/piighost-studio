import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Detector } from "@/components/landing/detector";
import { Ecosystem } from "@/components/landing/ecosystem";
import { QuickStart } from "@/components/landing/quickstart";
import { Cta } from "@/components/landing/cta";

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <Detector />
      <Ecosystem />
      <QuickStart />
      <Cta />
    </>
  );
}
