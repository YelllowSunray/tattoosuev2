import { NextRequest, NextResponse } from "next/server";
import { getAllGenerations } from "@/lib/crm-utils";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";

interface MonthlyStats {
  year: number;
  month: number; // 1-12
  images: number;
  generations: number;
  customers: Set<string>; // Unique customer IDs
}

interface UserMonthlyData {
  userId: string;
  email: string;
  monthlyStats: Map<string, MonthlyStats>; // key: "YYYY-MM"
  totalImages: number;
  totalGenerations: number;
  totalCustomers: Set<string>; // Set during aggregation, converted to number later
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : null;
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;

    // Admin route - get all data for all users (no filtering)
    const generations = await getAllGenerations();
    // Note: listCustomers() now requires userId, so we need to get all customers differently for admin
    // We'll use getAllGenerations to get user data, and fetch customers separately per user if needed
    // For admin stats, we'll get customers from the generations data
    const db = getAdminFirestore();
    const customersSnapshot = await db.collection("customers").get();
    const customers = customersSnapshot.docs.map((doc) => {
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

    // Group generations by userId
    const userDataMap = new Map<string, UserMonthlyData>();

    // Process generations and group by user and month
    generations.forEach((gen) => {
      if (!userDataMap.has(gen.userId)) {
        userDataMap.set(gen.userId, {
          userId: gen.userId,
          email: "", // Will be filled later
          monthlyStats: new Map(),
          totalImages: 0,
          totalGenerations: 0,
          totalCustomers: new Set(),
        });
      }

      const userData = userDataMap.get(gen.userId)!;
      const imageCount = gen.images?.length || 0;
      const genDate = gen.createdAt;

      // Group by month
      const yearMonth = `${genDate.getFullYear()}-${String(genDate.getMonth() + 1).padStart(2, "0")}`;
      
      if (!userData.monthlyStats.has(yearMonth)) {
        userData.monthlyStats.set(yearMonth, {
          year: genDate.getFullYear(),
          month: genDate.getMonth() + 1,
          images: 0,
          generations: 0,
          customers: new Set(),
        });
      }

      const monthData = userData.monthlyStats.get(yearMonth)!;
      monthData.images += imageCount;
      monthData.generations += 1;
      monthData.customers.add(gen.customerId);

      // Update totals
      userData.totalImages += imageCount;
      userData.totalGenerations += 1;
      userData.totalCustomers.add(gen.customerId);
    });

    // Process customers to get customer counts per user
    const customerCountsByUser = new Map<string, number>();
    customers.forEach((customer) => {
      const createdBy = customer.createdBy;
      customerCountsByUser.set(createdBy, (customerCountsByUser.get(createdBy) || 0) + 1);
    });

    // Fetch user emails from Firebase Auth
    const auth = getAdminAuth();
    const userDataWithEmails = await Promise.all(
      Array.from(userDataMap.values()).map(async (userData) => {
        try {
          const userRecord = await auth.getUser(userData.userId);
          userData.email = userRecord.email || `User ${userData.userId.substring(0, 8)}...`;
        } catch (error: any) {
          console.error(`[User Stats] Error fetching user ${userData.userId}:`, error?.code || error?.message);
          userData.email = `User Not Found (${userData.userId.substring(0, 8)}...)`;
        }

        // Convert monthly stats Map to array format
        const monthlyStatsArray = Array.from(userData.monthlyStats.entries()).map(([key, stats]) => ({
          yearMonth: key,
          year: stats.year,
          month: stats.month,
          images: stats.images,
          generations: stats.generations,
          customers: stats.customers.size,
        }));

        // Calculate total customers: max of customers from generations vs customers collection
        const totalCustomersFromGenerations = userData.totalCustomers.size;
        const totalCustomersFromCollection = customerCountsByUser.get(userData.userId) || 0;
        const totalCustomers = Math.max(totalCustomersFromGenerations, totalCustomersFromCollection);

        return {
          userId: userData.userId,
          email: userData.email,
          totalImages: userData.totalImages,
          totalGenerations: userData.totalGenerations,
          totalCustomers: totalCustomers,
          monthlyStats: monthlyStatsArray.sort((a, b) => {
            // Sort by year desc, then month desc
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
          }),
        };
      })
    );

    // Filter by month if specified
    let filteredData = userDataWithEmails;
    if (year !== null && month !== null) {
      filteredData = userDataWithEmails.map((user) => {
        // Filter monthly stats for the selected month
        const filteredMonthlyStats = user.monthlyStats.filter(
          (stat) => stat.year === year && stat.month === month
        );
        
        // Recalculate totals from filtered monthly stats
        const filteredTotalImages = filteredMonthlyStats.reduce((sum, stat) => sum + stat.images, 0);
        const filteredTotalGenerations = filteredMonthlyStats.reduce((sum, stat) => sum + stat.generations, 0);
        const filteredTotalCustomers = filteredMonthlyStats.reduce((sum, stat) => sum + stat.customers, 0);
        
        return {
          ...user,
          totalImages: filteredTotalImages,
          totalGenerations: filteredTotalGenerations,
          totalCustomers: filteredTotalCustomers,
          monthlyStats: filteredMonthlyStats,
        };
      });
    }

    // Sort by total images (descending)
    const sortedData = filteredData.sort((a, b) => b.totalImages - a.totalImages);

    // Calculate summary totals from filtered data
    const allCustomerIds = new Set<string>();
    generations.forEach((gen) => {
      const genDate = gen.createdAt;
      const genYear = genDate.getFullYear();
      const genMonth = genDate.getMonth() + 1;
      
      // If filtering by month, only include matching generations
      if (year !== null && month !== null) {
        if (genYear === year && genMonth === month) {
          allCustomerIds.add(gen.customerId);
        }
      } else {
        allCustomerIds.add(gen.customerId);
      }
    });
    
    const summary = {
      totalUsers: sortedData.length,
      totalImages: sortedData.reduce((sum, user) => sum + user.totalImages, 0),
      totalGenerations: sortedData.reduce((sum, user) => sum + user.totalGenerations, 0),
      totalCustomers: allCustomerIds.size,
    };

    return NextResponse.json({
      success: true,
      users: sortedData,
      summary,
      selectedYear: year,
      selectedMonth: month,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch user statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
