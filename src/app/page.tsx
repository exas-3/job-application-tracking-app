import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-10">
      <div className="grid w-full gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-6">
          <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Application command center
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Move from scattered tabs to a single hiring pipeline.
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            Organize every application in one board, track status transitions, and keep momentum with clear follow-ups.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className={buttonVariants({ size: "lg" })}>
              Create Account
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Login
            </Link>
          </div>
        </section>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Pipeline Snapshot</CardTitle>
            <CardDescription>Built for focused daily review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Saved leads, active interviews, and offers in one flow.
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Filter by status and sort by freshest activity.
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Fast create, edit, and delete with optimistic updates.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
