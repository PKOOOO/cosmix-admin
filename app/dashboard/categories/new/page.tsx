// app/(dashboard)/dashboard/categories/new/page.tsx
import { CategoryForm } from "./components/category-form";

const NewCategoryPage = async () => {
    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6 ">
                <CategoryForm initialData={null} />
            </div>
        </div>
    );
};

export default NewCategoryPage;
