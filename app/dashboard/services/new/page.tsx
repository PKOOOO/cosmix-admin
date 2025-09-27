// app/(dashboard)/dashboard/services/new/page.tsx
import { ServiceForm } from "./components/service-form";

const NewServicePage = async () => {
    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6 ">
                <ServiceForm initialData={null} />
            </div>
        </div>
    );
};

export default NewServicePage;
