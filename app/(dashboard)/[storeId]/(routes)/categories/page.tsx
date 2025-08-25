// app\(dashboard)\[storeId]\(routes)\categories\page.tsx
import prismadb from "@/lib/prismadb";
import { format } from "date-fns";
import { CategoryClient } from "./components/client";
import { CategoryColumn } from "./components/columns";

const CategoriesPage = async ({
    params
}: {
    params: { storeId: string }
}) => {
    // Correctly fetch all categories without billboard or icon
    const categories = await prismadb.category.findMany({
        orderBy: {
            createdAt: 'desc'
        }
    });
    
    // Format the data to match the corrected columns
    const formattedCategories: CategoryColumn[] = categories.map((item) => ({
        id: item.id,
        name: item.name,
        createdAt: format(item.createdAt, "MMMM do, yyyy")
    }));
    
    return ( 
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <CategoryClient data={formattedCategories} />
            </div>
        </div>
    );
}

export default CategoriesPage;