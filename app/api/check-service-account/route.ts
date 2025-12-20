import { NextRequest, NextResponse } from "next/server";
import { parseServiceAccountJson } from "@/lib/service-account-parser";

export async function GET(req: NextRequest) {
  try {
    let serviceAccount: any;
    try {
      serviceAccount = parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      return NextResponse.json({
        error: "Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON",
        details: e instanceof Error ? e.message : "Unknown error"
      }, { status: 500 });
    }

    return NextResponse.json({
      serviceAccountEmail: serviceAccount.client_email,
      serviceAccountProjectId: serviceAccount.project_id,
      firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      match: serviceAccount.project_id === process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      instructions: {
        step1: `Go to: https://console.cloud.google.com/iam-admin/iam?project=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`,
        step2: `Click "Grant Access" or "Add"`,
        step3: `Paste this email: ${serviceAccount.client_email}`,
        step4: `Select role: "Cloud Datastore User"`,
        step5: `Click "Save" and wait 1-2 minutes`
      },
      warning: serviceAccount.project_id !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID 
        ? "⚠️ Service account is from a different project! You MUST grant it permissions in your Firebase project."
        : "Service account project matches Firebase project"
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
}







