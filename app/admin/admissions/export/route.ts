import type { NextRequest } from "next/server";
import { parseAdmissionFilters } from "@/lib/admin-filters";
import { spreadsheetDateTime } from "@/lib/admin-format";
import { admissionStatuses, searchAdmissions } from "@/lib/admissions";
import { indiaNow } from "@/lib/booking";
import { csvResponse } from "@/lib/csv";
import { adminAccess } from "../../_components/gate";

// Downloads the admissions list exactly as filtered on the admin page.
export async function GET(request: NextRequest) {
  if ((await adminAccess()) !== "ok") {
    return new Response("Not signed in", { status: 401 });
  }
  const { today } = indiaNow();
  const { search } = parseAdmissionFilters(request.nextUrl.searchParams, today);
  const admissions = await searchAdmissions(search, 10_000);

  return csvResponse(
    `ccs-admissions-${today}.csv`,
    ["ID", "Received at", "Player", "Age", "Phone", "Program", "Status", "Their message", "Admin notes"],
    admissions.map((a) => [
      a.id,
      spreadsheetDateTime(a.createdAt),
      a.name,
      a.age,
      a.phone,
      a.program,
      admissionStatuses[a.status],
      a.message,
      a.notes,
    ]),
  );
}
