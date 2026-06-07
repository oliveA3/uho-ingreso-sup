import HeroSection from "../components/HeroSection";
import StageBanner from "../components/StageBanner";
import ProcessTimeline from "../components/ProcessTimeline";
import NewsSection from "../components/NewsSection";
import PlanPlazasSection from "../components/PlanPlazasSection";
import CutoffSection from "../components/CutoffSection";
import OfferingsSection from "../components/OfferingsSection";
import { newsItems, planPlazas, cutoffIndices, offerings, landingStage, timelineSteps } from "../data/landingData";

export default function LandingPage() {
  return (
    <div className="space-y-8">
      <HeroSection />
      <StageBanner stage={landingStage} />
      <ProcessTimeline steps={timelineSteps} />
      <div className="space-y-8">
        <NewsSection items={newsItems} />
        <PlanPlazasSection items={planPlazas} />
        <CutoffSection items={cutoffIndices} />
        <OfferingsSection items={offerings} />
      </div>
    </div>
  );
}
