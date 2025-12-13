// app/(dashboard)/dashboard/categories/new/page.tsx
export const dynamic = 'force-dynamic';

import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin-access";
import { CategoryForm } from "./components/category-form";

const NewCategoryPage = async () => {
    const { user, isAdmin } = await checkAdminAccess();

    if (!user) {
        redirect('/');
    }

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
