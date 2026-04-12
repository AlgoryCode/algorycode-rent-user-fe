import { SiteLayout } from "@/components/layout/SiteLayout";
import { CtaBand } from "@/components/sections/CtaBand";
import { FleetSection } from "@/components/sections/FleetSection";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { StatsStrip } from "@/components/sections/StatsStrip";
import { fetchUnifiedFleet } from "@/lib/rentFleet";

export default async function Home() {
  const vehicles = await fetchUnifiedFleet();

  return (
    <SiteLayout>
      <main>
        <Hero />
        <StatsStrip />
        <FleetSection vehicles={vehicles} />
        <HowItWorks />
        <CtaBand />
      </main>
    </SiteLayout>
  );
}
