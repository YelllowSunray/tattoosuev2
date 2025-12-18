import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    console.log("🧪 Starting Firestore test...");
    console.log(`   Firebase Project ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
    
    const db = getAdminFirestore();
    console.log("✅ Got Firestore instance");
    
    // Try to write a test document
    const testDoc = db.collection("tattoos").doc("_test_document");
    console.log("📝 Attempting to write test document...");
    
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: "This is a test document to verify Firestore connection"
    };
    
    await testDoc.set(testData);
    console.log("✅ Test document written");
    
    // Try to read it back
    console.log("📖 Attempting to read test document back...");
    const docSnap = await testDoc.get();
    const data = docSnap.exists ? docSnap.data() : null;
    console.log(`   Document exists: ${docSnap.exists}`);
    console.log(`   Document data:`, data);
    
    // Get project info
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    let serviceAccountProjectId = "unknown";
    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        serviceAccountProjectId = serviceAccount.project_id || "unknown";
      } catch (e) {
        // ignore
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Firestore connection successful",
      serviceAccountProjectId: serviceAccountProjectId,
      firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      testDocument: {
        exists: docSnap.exists,
        data: data
      },
      collection: "tattoos",
      documentId: "_test_document",
      note: "Check Firebase Console -> Firestore Database -> tattoos collection for '_test_document'"
    });
  } catch (error: any) {
    console.error("❌ Firestore test error:", error);
    console.error("   Error message:", error.message);
    console.error("   Error code:", error.code);
    console.error("   Error stack:", error.stack);
    
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    let serviceAccountProjectId = "unknown";
    if (serviceAccountJson) {
      try {
        const sa = JSON.parse(serviceAccountJson);
        serviceAccountProjectId = sa.project_id || "could not parse";
      } catch {
        serviceAccountProjectId = "could not parse";
      }
    }
    
    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      details: error.toString(),
      serviceAccountProjectId: serviceAccountProjectId,
      firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      troubleshooting: {
        check1: "Ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID matches your Firebase project",
        check2: "Ensure service account has Firestore permissions in Firebase project",
        check3: "Ensure Firestore API is enabled for the Firebase project",
        check4: "Check if service account project_id matches Firebase project (they can be different)"
      }
    }, { status: 500 });
  }
}

