import { Suspense } from "react";
import type { Metadata } from "next";
import { PatientDashboardProvider, PatientViewId } from "@/features/patient/context/patient-dashboard-context";
import { PatientShell } from "@/features/patient/components/patient-shell";

export const metadata: Metadata = {
  title: "Patient Dashboard (Demonstration) · CardioCoreEdge",
  description: "CardioCore personal baseline model, single-lead ECG telemetry, multi-signal trends, and care team records.",
};

function PatientDashboardContent({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-xs text-[var(--mid)] font-medium">
          Loading CardioCore Patient Portal...
        </div>
      }
    >
      <PatientDashboardAsyncWrapper searchParams={searchParams} />
    </Suspense>
  );
}

async function PatientDashboardAsyncWrapper({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const resolvedParams = await searchParams;
  const initialView = (resolvedParams?.view as PatientViewId) || "home";

  return (
    <PatientDashboardProvider initialView={initialView}>
      <PatientShell />
    </PatientDashboardProvider>
  );
}

export default function PatientPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  return <PatientDashboardContent searchParams={searchParams} />;
}
