import SignupView from "./view";

export const dynamic = "force-dynamic";
export default function Page() {
  return <SignupView needsCode={process.env.NODE_ENV === "production" && !!process.env.RV_SIGNUP_CODE} />;
}
