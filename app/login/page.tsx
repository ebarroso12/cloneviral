import { demoEnabled } from "@/lib/config";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/seed";
import LoginView from "./view";

export const dynamic = "force-dynamic";
export default function Page() {
  return <LoginView demo={demoEnabled() ? { email: DEMO_EMAIL, password: DEMO_PASSWORD } : null} />;
}
