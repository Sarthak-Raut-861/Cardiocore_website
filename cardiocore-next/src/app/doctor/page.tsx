import { Suspense } from "react";
import type { Metadata } from "next";
import {
  DoctorDashboardProvider,
  DoctorViewId,
} from "@/features/doctor/context/doctor-dashboard-context";
import { DoctorShell } from "@/features/doctor/components/doctor-shell";

export const metadata: Metadata = {
  title: "Clinician Dashboard (Demonstration) · CardioCoreEdge",
  description:
    "CardioCore clinician decision support portal, multi-signal patient roster, 250 Hz Lead-I ECG strip review, and triage coordination.",
};

const VALID_VIEWS: DoctorViewId[] = [
  "roster",
  "appts",
  "patients",
  "review",
  "messages",
  "analytics",
  "schedule",
  "dprofile",
  "handover",
];

function DoctorDashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-navy-950 text-xs text-muted-foreground font-medium">
          Loading CardioCore Clinician Portal...
        </div>
      }
    >
      <DoctorDashboardAsyncWrapper searchParams={searchParams} />
    </Suspense>
  );
}

async function DoctorDashboardAsyncWrapper({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const resolvedParams = await searchParams;
  const requestedView = resolvedParams?.view as DoctorViewId;
  const initialView: DoctorViewId = VALID_VIEWS.includes(requestedView)
    ? requestedView
    : "roster";

  return (
    <DoctorDashboardProvider initialView={initialView}>
      <DoctorShell />
    </DoctorDashboardProvider>
  );
}

export default function DoctorPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  return <DoctorDashboardContent searchParams={searchParams} />;
}
