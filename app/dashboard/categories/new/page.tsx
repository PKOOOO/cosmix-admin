// app/(dashboard)/dashboard/categories/new/page.tsx
import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin-access";
import { CategoryForm } from "./components/category-form";

const NewCategoryPage = async () => {
    const { userId } = auth();
    
    if (!userId) {
        redirect('/');
    }

    const { isAdmin } = await checkAdminAccess();
    
    if (!isAdmin) {
        redirect('/dashboard/categories');
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6 ">
                <CategoryForm initialData={null} />
            </div>
        </div>
    );
};

export default NewCategoryPage;
