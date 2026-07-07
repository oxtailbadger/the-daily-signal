import { getHeadlines } from "../lib/feeds";
import ReadingRoom from "../components/ReadingRoom";

// Re-fetch the feeds at most once every 4 hours.
export const revalidate = 14400;

export default async function Page() {
  const stories = await getHeadlines();
  return <ReadingRoom stories={stories} />;
}
