import { NextRequest, NextResponse } from "next/server";
import { getAllTattooImages, TattooImage } from "@/lib/firebase-utils";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { estimatePriceForImage } from "@/lib/vertex-price-estimation";
import { estimateHoursForImage } from "@/lib/vertex-hours-estimation";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

async function estimateTattooPriceAndDuration(
  imageUrl: string,
  tattooInfo: TattooImage
): Promise<{ price: number; duration: number; reasoning?: string }> {
  try {
    // Use separate functions for price and hours estimation
    const [price, duration] = await Promise.all([
      estimatePriceForImage(imageUrl),
      estimateHoursForImage(imageUrl),
    ]);

    return {
      price,
      duration,
      reasoning: `Estimated based on size, complexity, and style. Price: €${price}, Duration: ${duration} hours.`,
    };
  } catch (error) {
    console.error(`Error estimating for ${tattooInfo.fileName}:`, error);
    // Return default estimates on error
    return {
      price: 0,
      duration: 0,
      reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

async function saveEstimateToJSON(
  tattoo: TattooImage,
  estimate: { price: number; duration: number; reasoning?: string }
): Promise<void> {
  try {
    // Create data directory if it doesn't exist
    const dataDir = join(process.cwd(), "data", "estimates");
    await mkdir(dataDir, { recursive: true });

    // Create JSON file with filename, price, and duration
    const jsonData = {
      fileName: tattoo.fileName,
      price: estimate.price,
      duration: estimate.duration,
      // Include additional info for reference
      url: tattoo.url,
      style: tattoo.style,
      bodyPart: tattoo.bodyPart,
      estimatedAt: new Date().toISOString(),
    };

    // Save individual file
    const fileName = tattoo.fileName.replace(/\.(png|jpg|jpeg|webp)$/i, "") + ".json";
    const filePath = join(dataDir, fileName);
    await writeFile(filePath, JSON.stringify(jsonData, null, 2), "utf-8");

    // Also append to a master estimates.json file
    const masterFilePath = join(dataDir, "estimates.json");
    let allEstimates: any[] = [];
    
    try {
      const { readFile } = await import("fs/promises");
      const existingData = await readFile(masterFilePath, "utf-8");
      allEstimates = JSON.parse(existingData);
    } catch (e) {
      // File doesn't exist yet, start with empty array
      allEstimates = [];
    }

    // Update or add estimate
    const existingIndex = allEstimates.findIndex((e) => e.fileName === tattoo.fileName);
    if (existingIndex >= 0) {
      allEstimates[existingIndex] = jsonData;
    } else {
      allEstimates.push(jsonData);
    }

    // Save master file
    await writeFile(masterFilePath, JSON.stringify(allEstimates, null, 2), "utf-8");

    console.log(`✅ Saved estimate to JSON: ${filePath}`);
    console.log(`✅ Updated master estimates file: ${masterFilePath}`);
  } catch (error) {
    console.error(`❌ Error saving estimate to JSON for ${tattoo.fileName}:`, error);
    // Don't throw - JSON save failure shouldn't break the process
  }
}

async function saveEstimateToFirestore(
  tattoo: TattooImage,
  estimate: { price: number; duration: number; reasoning?: string }
): Promise<void> {
  try {
    console.log(`📝 Starting saveEstimateToFirestore for: ${tattoo.fileName}`);
    
    // Try Admin SDK first
    try {
      const adminDb = getAdminFirestore();
      const collectionName = "tattoos";
      const documentId = tattoo.fileName;
      const docRef = adminDb.collection(collectionName).doc(documentId);
      
      const estimateData = {
        fileName: tattoo.fileName,
        url: tattoo.url,
        style: tattoo.style,
        bodyPart: tattoo.bodyPart,
        category: tattoo.category?.name || null,
        matchedStyle: tattoo.matchedStyle?.name || null,
        estimatedPrice: estimate.price,
        estimatedDuration: estimate.duration,
        reasoning: estimate.reasoning || "",
        estimatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await docRef.set(estimateData, { merge: true });
      console.log(`✅ Saved using Admin SDK`);
      return;
    } catch (adminError: any) {
      // Get service account info for better error message
      const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      
      let serviceAccountEmail = "unknown";
      if (serviceAccountJson) {
        try {
          const sa = JSON.parse(serviceAccountJson);
          serviceAccountEmail = sa.client_email || "unknown";
        } catch (e) {
          // ignore
        }
      }
      
      // Create a direct link to IAM console
      const iamConsoleUrl = firebaseProjectId 
        ? `https://console.cloud.google.com/iam-admin/iam?project=${firebaseProjectId}`
        : "https://console.cloud.google.com/iam-admin/iam";
      
      const errorMessage = `Admin SDK failed: ${adminError.message}\n\n` +
        `🔧 TO FIX THIS:\n` +
        `1. Go to: ${iamConsoleUrl}\n` +
        `2. Click "Grant Access" (or "Add" button)\n` +
        `3. Paste this service account email: ${serviceAccountEmail}\n` +
        `4. Select role: "Cloud Datastore User"\n` +
        `5. Click "Save" and wait 1-2 minutes\n\n` +
        `Service account: ${serviceAccountEmail}\n` +
        `Firebase project: ${firebaseProjectId || "not set"}\n\n` +
        `See SERVICE_ACCOUNT_PERMISSIONS.md for detailed instructions.`;
      
      console.error(`❌ ${errorMessage}`);
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.error(`❌❌❌ CRITICAL ERROR saving estimate for ${tattoo.fileName} to Firestore ❌❌❌`);
    console.error(`   Error message: ${error.message}`);
    console.error(`   Error code: ${error.code}`);
    
    // Provide helpful error message
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    
    if (serviceAccountJson) {
      try {
        const sa = JSON.parse(serviceAccountJson);
        const serviceAccountEmail = sa.client_email || "unknown";
        const iamConsoleUrl = firebaseProjectId 
          ? `https://console.cloud.google.com/iam-admin/iam?project=${firebaseProjectId}`
          : "https://console.cloud.google.com/iam-admin/iam";
        
        console.error(`   Service Account Email: ${serviceAccountEmail}`);
        console.error(`   Service Account Project: ${sa.project_id}`);
        console.error(`   Firebase Project: ${firebaseProjectId || "not set"}`);
        console.error(`   🔧 Fix: Go to ${iamConsoleUrl}`);
        console.error(`   🔧 Grant "Cloud Datastore User" role to: ${serviceAccountEmail}`);
      } catch (e) {
        // ignore
      }
    }
    
    throw error;
  }
}

async function getEstimateFromFirestore(fileName: string): Promise<any | null> {
  try {
    const db = getAdminFirestore();
    const docRef = db.collection("tattoos").doc(fileName);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      return docSnap.data();
    }
    return null;
  } catch (error: any) {
    // If Firestore is unavailable, return null
    if (error?.code === 'permission-denied' || 
        error?.code === 'unavailable' ||
        error?.code === 7 || // PERMISSION_DENIED
        error?.message?.includes('Firestore API')) {
      return null;
    }
    console.error(`Error reading estimate for ${fileName}:`, error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { fileName, processAll, forceReestimate, listOnly, startFrom } = await req.json();

    // If listOnly is true, just return the list of tattoos
    if (listOnly) {
      const tattoos = await getAllTattooImages();
      return NextResponse.json({
        success: true,
        tattoos: tattoos.map((t) => ({
          fileName: t.fileName,
          url: t.url,
          style: t.style,
          bodyPart: t.bodyPart,
        })),
      });
    }

    // Get all tattoos
    const tattoos = await getAllTattooImages();

    let tattoosToProcess: TattooImage[];

    if (startFrom) {
      // Process from a specific file onwards
      const startIndex = tattoos.findIndex((t) => t.fileName === startFrom || t.fileName.startsWith(startFrom));
      if (startIndex === -1) {
        return NextResponse.json(
          { error: `Tattoo with fileName starting with "${startFrom}" not found` },
          { status: 404 }
        );
      }
      tattoosToProcess = tattoos.slice(startIndex);
      console.log(`Starting from ${startFrom}: processing ${tattoosToProcess.length} tattoos`);
    } else if (processAll) {
      // Process all tattoos
      tattoosToProcess = tattoos;
    } else if (fileName) {
      // Process specific tattoo
      const tattoo = tattoos.find((t) => t.fileName === fileName);
      if (!tattoo) {
        return NextResponse.json(
          { error: `Tattoo with fileName ${fileName} not found` },
          { status: 404 }
        );
      }
      tattoosToProcess = [tattoo];
    } else {
      return NextResponse.json(
        { error: "Provide fileName, startFrom, or set processAll to true" },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];
    let firestoreAvailable = true;

    for (const tattoo of tattoosToProcess) {
      try {
        // Check if estimate already exists in Firestore
        if (!forceReestimate && firestoreAvailable) {
          try {
            const existing = await getEstimateFromFirestore(tattoo.fileName);
            
            if (existing) {
              results.push({
                fileName: tattoo.fileName,
                url: tattoo.url,
                status: "skipped",
                price: existing.estimatedPrice,
                duration: existing.estimatedDuration,
                message: "Estimate already exists",
              });
              continue;
            }
          } catch (firestoreError: any) {
            // If Firestore is unavailable, mark it and continue without checking
            if (firestoreError?.code === 'permission-denied' || 
                firestoreError?.code === 'unavailable' ||
                firestoreError?.message?.includes('Firestore API')) {
              console.warn('⚠️ Firestore is unavailable. Continuing without Firestore checks/saves.');
              firestoreAvailable = false;
            }
          }
        }

        // Estimate price and duration
        const estimate = await estimateTattooPriceAndDuration(
          tattoo.url,
          tattoo
        );

        // Save to JSON file (always, as backup)
        try {
          await saveEstimateToJSON(tattoo, estimate);
        } catch (jsonError) {
          console.warn(`⚠️ Could not save estimate to JSON for ${tattoo.fileName}:`, jsonError);
          // Continue even if JSON save fails
        }

        // Save to Firestore (only if available)
        if (firestoreAvailable) {
          try {
            console.log(`🔄 Attempting to save estimate for ${tattoo.fileName} to Firestore...`);
            await saveEstimateToFirestore(tattoo, estimate);
            console.log(`✅ Successfully saved estimate for ${tattoo.fileName} to Firestore`);
          } catch (saveError: any) {
            // If save fails, still return the estimate but mark it
            console.error(`❌ FAILED to save estimate for ${tattoo.fileName} to Firestore:`);
            console.error(`   Error message: ${saveError.message}`);
            console.error(`   Error code: ${saveError.code}`);
            console.error(`   Full error:`, saveError);
            console.warn(`⚠️ Could not save estimate for ${tattoo.fileName} to Firestore:`, saveError.message);
            console.log(`✅ Estimate saved to JSON file as backup`);
            if (saveError?.code === 'permission-denied' || saveError?.code === 'unavailable' || saveError?.code === 7) {
              firestoreAvailable = false;
            }
          }
        } else {
          console.warn(`⚠️ Skipping Firestore save for ${tattoo.fileName} - Firestore marked as unavailable`);
          console.log(`✅ Estimate saved to JSON file as backup`);
        }

        results.push({
          fileName: tattoo.fileName,
          url: tattoo.url,
          status: firestoreAvailable ? "success" : "success_no_save",
          price: estimate.price,
          duration: estimate.duration,
          reasoning: estimate.reasoning,
          message: firestoreAvailable ? undefined : "Estimate generated but not saved (Firestore unavailable)",
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push({
          fileName: tattoo.fileName,
          url: tattoo.url,
          status: "error",
          error: errorMessage,
        });
        console.error(`Error processing ${tattoo.fileName}:`, error);
      }
    }

    // Merge errors into results for display
    const allResults = [
      ...results,
      ...errors,
    ];

    const response: any = {
      success: true,
      processed: results.length,
      errors: errors.length,
      results: allResults,
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    if (!firestoreAvailable) {
      // Get project ID from environment or Firebase config
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tattoosuev2';
      const firestoreApiUrl = `https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${projectId}`;
      response.warning = `Firestore API is not enabled. Estimates were generated but not saved. Enable Firestore API at: ${firestoreApiUrl}`;
      response.firestoreApiUrl = firestoreApiUrl;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Estimation failed:", error);
    return NextResponse.json(
      {
        error:
          "Unable to estimate tattoo price and duration. Check server logs for details.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

