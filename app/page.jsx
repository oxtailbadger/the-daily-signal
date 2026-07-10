import { getHeadlines } from "../lib/feeds";
import ReadingRoom from "../components/ReadingRoom";

// Render live on every request. Freshness is handled by a 4-hour in-memory
// cache inside getHeadlines() (see lib/feeds.js) rather than by request-
// triggered ISR, which on a low-traffic app serves the previous snapshot
// and never refreshes without visits.
export const dynamic = "force-dynamic";

export default async function Page() {
  const stories = await getHeadlines();
  return <ReadingRoom stories={stories} />;
}
