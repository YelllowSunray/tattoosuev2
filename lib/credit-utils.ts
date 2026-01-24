import { getAdminFirestore } from "./firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { CREDIT_COSTS } from "./credit-config";

// Re-export for backward compatibility
export { CREDIT_COSTS };

export interface UserCredits {
  userId: string;
  credits: number;
  totalPurchased: number;
  totalSpent: number;
  updatedAt: Date;
}

const INITIAL_CREDITS = 4;

/**
 * Get user's current credit balance
 */
export async function getUserCredits(userId: string): Promise<number> {
  const db = getAdminFirestore();
  const userDoc = await db.collection("users").doc(userId).get();
  
  if (!userDoc.exists) {
    // Initialize user with starting credits
    await initializeUserCredits(userId);
    return INITIAL_CREDITS;
  }
  
  const data = userDoc.data();
  return data?.credits || 0;
}

/**
 * Get full user credits document
 */
export async function getUserCreditsDoc(userId: string): Promise<UserCredits | null> {
  const db = getAdminFirestore();
  const userDoc = await db.collection("users").doc(userId).get();
  
  if (!userDoc.exists) {
    await initializeUserCredits(userId);
    const newDoc = await db.collection("users").doc(userId).get();
    const data = newDoc.data()!;
    return {
      userId: newDoc.id,
      credits: data.credits || 0,
      totalPurchased: data.totalPurchased || 0,
      totalSpent: data.totalSpent || 0,
      updatedAt: data.updatedAt.toDate(),
    };
  }
  
  const data = userDoc.data()!;
  return {
    userId: userDoc.id,
    credits: data.credits || 0,
    totalPurchased: data.totalPurchased || 0,
    totalSpent: data.totalSpent || 0,
    updatedAt: data.updatedAt.toDate(),
  };
}

/**
 * Deduct credits from user account
 */
export async function deductCredits(
  userId: string,
  amount: number,
  operation: string
): Promise<{ success: boolean; remainingCredits: number; error?: string }> {
  const db = getAdminFirestore();
  const userRef = db.collection("users").doc(userId);
  
  try {
    // Use transaction to prevent race conditions
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error("User not found");
      }
      
      const currentCredits = userDoc.data()?.credits || 0;
      const currentTotalSpent = userDoc.data()?.totalSpent || 0;
      
      if (currentCredits < amount) {
        throw new Error("Insufficient credits");
      }
      
      const newCredits = currentCredits - amount;
      const newTotalSpent = currentTotalSpent + amount;
      
      transaction.update(userRef, {
        credits: newCredits,
        totalSpent: newTotalSpent,
        updatedAt: Timestamp.now(),
      });
    });
    
    const updatedDoc = await userRef.get();
    const remainingCredits = updatedDoc.data()?.credits || 0;
    
    return { success: true, remainingCredits };
  } catch (error: any) {
    console.error("Error deducting credits:", error);
    return {
      success: false,
      remainingCredits: 0,
      error: error.message || "Failed to deduct credits",
    };
  }
}

/**
 * Add credits to user account (called from webhook after successful payment)
 */
export async function addCredits(
  userId: string,
  amount: number,
  source: string = "purchase"
): Promise<void> {
  const db = getAdminFirestore();
  const userRef = db.collection("users").doc(userId);
  
  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    
    if (!userDoc.exists) {
      // Initialize user if doesn't exist
      transaction.set(userRef, {
        credits: amount,
        totalPurchased: amount,
        totalSpent: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      const currentCredits = userDoc.data()?.credits || 0;
      const currentTotalPurchased = userDoc.data()?.totalPurchased || 0;
      
      transaction.update(userRef, {
        credits: currentCredits + amount,
        totalPurchased: currentTotalPurchased + amount,
        updatedAt: Timestamp.now(),
      });
    }
  });
}

/**
 * Initialize user credits document (called on first signup)
 */
export async function initializeUserCredits(userId: string): Promise<void> {
  const db = getAdminFirestore();
  const userRef = db.collection("users").doc(userId);
  
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    await userRef.set({
      credits: INITIAL_CREDITS,
      totalPurchased: 0,
      totalSpent: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
}
