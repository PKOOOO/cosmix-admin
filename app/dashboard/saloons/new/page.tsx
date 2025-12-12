// app/(dashboard)/dashboard/saloons/new/page.tsx
export const dynamic = 'force-dynamic';

import { SaloonForm } from "./components/saloon-form";

const NewSaloonPage = async () => {
    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
                <SaloonForm initialData={null} />
            </div>
        </div>
    );
};

export default NewSaloonPage;
