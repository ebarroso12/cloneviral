import SignupView from "./view";

export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const invite = String((await searchParams).convite ?? "").slice(0, 64);
  return <SignupView needsCode={process.env.NODE_ENV === "production"} invite={invite} />;
}
