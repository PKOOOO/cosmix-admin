import prismadb from "@/lib/prismadb";

export const getStockCount = async (userId: string, saloonId?: string) => {
    // For now, return 0 as we don't have a product/stock system
    // This can be updated later if you add product management
    return 0;
}
