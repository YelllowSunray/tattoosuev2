import { getAdminFirestore } from "./firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Generation {
  id: string;
  customerId: string;
  userId: string;
  prompt: string;
  fullPrompt: string;
  model: string; // "imagen4" | "nanobanana" | "gemini25"
  images: string[]; // Firebase Storage paths
  imageUrls?: string[]; // download URLs (optional - may not be present)
  stencils?: string[]; // Firebase Storage paths for stencils (one per image, same index)
  styleIds?: number[];
  placements?: string[];
  referenceImages?: any[];
  createdAt: Date;
  createdBy: string;
}

/**
 * Create a new customer
 */
export async function createCustomer(
  data: Omit<Customer, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const db = getAdminFirestore();
  const now = Timestamp.now();
  
  const customerData = {
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    notes: data.notes || null,
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy,
  };
  
  const docRef = await db.collection("customers").add(customerData);
  return docRef.id;
}

/**
 * Get a customer by ID (only if it belongs to the user)
 */
export async function getCustomer(customerId: string, userId: string): Promise<Customer | null> {
  const db = getAdminFirestore();
  const docRef = db.collection("customers").doc(customerId);
  const docSnap = await docRef.get();
  
  if (!docSnap.exists) {
    return null;
  }
  
  const data = docSnap.data()!;
  
  // Security check: verify the customer belongs to the user
  if (data.createdBy !== userId) {
    return null; // Don't return customer data if user doesn't own it
  }
  
  return {
    id: docSnap.id,
    name: data.name,
    email: data.email,
    phone: data.phone || undefined,
    notes: data.notes || undefined,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    createdBy: data.createdBy,
  };
}

/**
 * List all customers for a specific user
 */
export async function listCustomers(userId: string): Promise<Customer[]> {
  const db = getAdminFirestore();
  const snapshot = await db
    .collection("customers")
    .where("createdBy", "==", userId)
    .orderBy("createdAt", "desc")
    .get();
  
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      email: data.email,
      phone: data.phone || undefined,
      notes: data.notes || undefined,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      createdBy: data.createdBy,
    };
  });
}

/**
 * Update a customer (only if it belongs to the user)
 */
export async function updateCustomer(
  customerId: string,
  userId: string,
  data: Partial<Omit<Customer, "id" | "createdAt" | "createdBy">>
): Promise<void> {
  const db = getAdminFirestore();
  const docRef = db.collection("customers").doc(customerId);
  
  // First verify the customer belongs to the user
  const customer = await getCustomer(customerId, userId);
  if (!customer) {
    throw new Error("Customer not found or access denied");
  }
  
  const updateData: any = {
    updatedAt: Timestamp.now(),
  };
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.notes !== undefined) updateData.notes = data.notes || null;
  
  await docRef.update(updateData);
}

/**
 * Create a generation record
 */
export async function createGeneration(
  data: Omit<Generation, "id" | "createdAt">
): Promise<string> {
  const db = getAdminFirestore();
  const now = Timestamp.now();
  
  const generationData = {
    customerId: data.customerId,
    userId: data.userId,
    prompt: data.prompt,
    fullPrompt: data.fullPrompt,
    model: data.model,
    images: data.images, // Firebase Storage paths only
    // Note: imageUrls (base64 data) are not stored in Firestore due to size limits (~1MB per array)
    // Download URLs can be generated from Firebase Storage paths when needed
    stencils: data.stencils || null,
    styleIds: data.styleIds || null,
    placements: data.placements || null,
    referenceImages: data.referenceImages || null,
    createdAt: now,
    createdBy: data.createdBy,
  };
  
  const docRef = await db.collection("generations").add(generationData);
  return docRef.id;
}

/**
 * Get generations for a specific customer (only if customer belongs to user)
 */
export async function getGenerationsByCustomer(customerId: string, userId: string): Promise<Generation[]> {
  const db = getAdminFirestore();
  
  // First verify the customer belongs to the user
  const customer = await getCustomer(customerId, userId);
  if (!customer) {
    return []; // Return empty array if customer doesn't exist or doesn't belong to user
  }
  
  // Query generations for this customer, filtered by userId
  // Query without orderBy to avoid index requirement, then sort in memory
  const snapshot = await db
    .collection("generations")
    .where("customerId", "==", customerId)
    .where("userId", "==", userId)
    .get();
  
  const generations = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      customerId: data.customerId,
      userId: data.userId,
      prompt: data.prompt,
      fullPrompt: data.fullPrompt,
      model: data.model,
      images: data.images,
      imageUrls: data.imageUrls || [],
      stencils: data.stencils || undefined,
      styleIds: data.styleIds || undefined,
      placements: data.placements || undefined,
      referenceImages: data.referenceImages || undefined,
      createdAt: data.createdAt.toDate(),
      createdBy: data.createdBy,
    };
  });
  
  // Sort by createdAt descending in memory
  generations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  return generations;
}

/**
 * Get all generations
 */
export async function getAllGenerations(): Promise<Generation[]> {
  const db = getAdminFirestore();
  const snapshot = await db.collection("generations").orderBy("createdAt", "desc").get();
  
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      customerId: data.customerId,
      userId: data.userId,
      prompt: data.prompt,
      fullPrompt: data.fullPrompt,
      model: data.model,
      images: data.images,
      imageUrls: data.imageUrls,
      stencils: data.stencils || undefined,
      styleIds: data.styleIds || undefined,
      placements: data.placements || undefined,
      referenceImages: data.referenceImages || undefined,
      createdAt: data.createdAt.toDate(),
      createdBy: data.createdBy,
    };
  });
}

/**
 * Get all generations for a specific user
 */
export async function getGenerationsByUser(userId: string): Promise<Generation[]> {
  const db = getAdminFirestore();
  
  // Query generations for this user
  const snapshot = await db
    .collection("generations")
    .where("userId", "==", userId)
    .get();
  
  const generations = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      customerId: data.customerId,
      userId: data.userId,
      prompt: data.prompt,
      fullPrompt: data.fullPrompt,
      model: data.model,
      images: data.images,
      imageUrls: data.imageUrls || [],
      stencils: data.stencils || undefined,
      styleIds: data.styleIds || undefined,
      placements: data.placements || undefined,
      referenceImages: data.referenceImages || undefined,
      createdAt: data.createdAt.toDate(),
      createdBy: data.createdBy,
    };
  });
  
  // Sort by createdAt descending in memory
  generations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  return generations;
}
