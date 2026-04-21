import { rentHandoverLocationsUpstreamGet } from "@/lib/server/rentHandoverLocationsUpstreamGet";

export const dynamic = "force-dynamic";

/** Oturum gerektirmez; vitrin alış/teslim noktaları için herkese açık BFF. */
export async function GET(req: Request) {
  return rentHandoverLocationsUpstreamGet(req);
}
