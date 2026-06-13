import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { requireUser, SESSION_COOKIE } from "@/lib/auth";
import { deleteUserAccount, exportUserData, trackEvent } from "@/lib/store";

const CONFIRMATION = "DELETE_MY_RED_STRING_DATA";

export async function GET() {
  const user = await requireUser();
  const data = exportUserData(user.id);
  trackEvent(user.id, "privacy_export_requested", {});
  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": `attachment; filename="red-string-export-${user.id}.json"`,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  if (body.confirmation !== CONFIRMATION) {
    return NextResponse.json(
      { error: `Type ${CONFIRMATION} to delete this account.` },
      { status: 400 }
    );
  }

  deleteUserAccount(user.id);
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ deleted: true });
}
