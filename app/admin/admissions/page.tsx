import type { Metadata } from "next";
import { Suspense } from "react";
import {
  admissionPresets,
  admissionStatusOptions,
  parseAdmissionFilters,
} from "@/lib/admin-filters";
import { formatDateTime } from "@/lib/admin-format";
import {
  admissionStatuses,
  getAdmissionStats,
  searchAdmissions,
  type AdmissionStatus,
} from "@/lib/admissions";
import { indiaNow } from "@/lib/booking";
import { programs } from "@/lib/content";
import { FilterBar, fieldWrap, selectClass } from "../_components/filters";
import { AdminGate } from "../_components/gate";
import { Badge, PageTitle, StatCard } from "../_components/ui";
import { AdmissionEditor, DeleteAdmissionButton } from "./forms";

export const metadata: Metadata = { title: "Admissions" };

const statusStyle: Record<AdmissionStatus, string> = {
  new: "bg-amber-100 text-amber-800",
  contacted: "bg-sky-100 text-sky-800",
  joined: "bg-emerald-100 text-emerald-800",
  not_interested: "bg-slate-200 text-slate-700",
};

async function Admissions({
  searchParams,
}: {
  searchParams: PageProps<"/admin/admissions">["searchParams"];
}) {
  const { today } = indiaNow();
  const filters = parseAdmissionFilters(await searchParams, today);
  const [admissions, stats] = await Promise.all([
    searchAdmissions(filters.search),
    getAdmissionStats(today),
  ]);

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Students" value={stats.students} hint="Marked Joined" href="/admin/admissions?status=joined" tone="good" />
        <StatCard
          label="Awaiting a reply"
          value={stats.awaitingReply}
          href="/admin/admissions?status=new"
          tone={stats.awaitingReply > 0 ? "alert" : "plain"}
        />
        <StatCard label="Today" value={stats.today} href="/admin/admissions?when=today" />
        <StatCard label="All requests" value={stats.total} hint={`${stats.thisMonth} this month`} href="/admin/admissions" />
      </div>

      <FilterBar
        path="/admin/admissions"
        exportPath="/admin/admissions/export"
        presets={admissionPresets}
        when={filters.when}
        keep={{ status: filters.status, program: filters.program }}
        query={filters.query}
        from={filters.from}
        to={filters.to}
        dateLabel="Received"
        searchPlaceholder="Name, phone, message or notes"
      >
        <label className={fieldWrap}>
          Status
          <select name="status" defaultValue={filters.status} className={selectClass}>
            <option value="all">Any status</option>
            {admissionStatusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldWrap}>
          Program
          <select name="program" defaultValue={filters.program} className={selectClass}>
            <option value="">Any program</option>
            {programs.map((p) => (
              <option key={p.title}>{p.title}</option>
            ))}
          </select>
        </label>
      </FilterBar>

      <p className="mt-6 font-semibold">
        {admissions.length} {admissions.length === 1 ? "request" : "requests"}
        {admissions.length === 500 && (
          <span className="block text-sm font-normal text-muted-foreground">
            Showing the newest 500. Narrow the dates or search to see older ones.
          </span>
        )}
      </p>

      <div className="mt-4 overflow-x-auto bg-white">
        <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-navy/20">
              {["Player", "Contact", "Program", "Their message", "Follow-up", ""].map((heading) => (
                <th key={heading} scope="col" className="p-3 font-bold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admissions.map((a) => (
              <tr key={a.id} className="border-b border-navy/10 align-top">
                <td className="p-3">
                  <span className="font-semibold">{a.name}</span>
                  <span className="block">Age {a.age}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDateTime(a.createdAt)}
                  </span>
                  <Badge className={`mt-2 ${statusStyle[a.status]}`}>
                    {admissionStatuses[a.status]}
                  </Badge>
                </td>
                <td className="p-3">
                  <a href={`tel:+91${a.phone}`} className="block font-semibold underline">
                    {a.phone}
                  </a>
                  <a
                    href={`https://wa.me/91${a.phone}`}
                    target="_blank"
                    rel="noopener"
                    className="block text-xs underline"
                  >
                    WhatsApp
                  </a>
                </td>
                <td className="p-3">{a.program}</td>
                <td className="max-w-xs p-3 whitespace-pre-line">
                  {a.message ?? <span className="text-muted-foreground">None</span>}
                </td>
                <td className="w-72 p-3">
                  <AdmissionEditor id={a.id} status={a.status} notes={a.notes} />
                </td>
                <td className="p-3">
                  <DeleteAdmissionButton id={a.id} name={a.name} />
                </td>
              </tr>
            ))}
            {admissions.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center">
                  No admission requests match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function AdminAdmissionsPage({ searchParams }: PageProps<"/admin/admissions">) {
  return (
    <>
      <PageTitle>Admissions & students</PageTitle>
      <Suspense fallback={<p className="mt-8">Loading…</p>}>
        <AdminGate>
          <Admissions searchParams={searchParams} />
        </AdminGate>
      </Suspense>
    </>
  );
}
