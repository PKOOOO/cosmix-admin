// app/(dashboard)/dashboard/settings/page.tsx
import { SettingsClient } from "./components/settings-client";

const SettingsPage = async () => {
    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
                <SettingsClient />
            </div>
        </div>
    );
}

export default SettingsPage;
