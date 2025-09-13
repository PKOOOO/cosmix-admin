import { UserButton, auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

// import { MainNav } from "@/components/main-nav";
// import StoreSwitcher from "@/components/store-switcher";
import { SidebarTrigger } from "@/components/ui/sidebar";
import prismadb from "@/lib/prismadb";

const Navbar = async () => {
    const { userId } = auth();

    if (!userId) {
        redirect("/sign-in");
    }

    const stores = await prismadb.store.findMany({
        where: {
            userId,
        },
    });

    return ( 
        <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center px-3 md:px-4">
                <SidebarTrigger className="mr-3 md:mr-4 h-10 w-10 md:h-7 md:w-7" />
                {/* <StoreSwitcher items={stores} /> */}
                {/* <MainNav className="mx-6" /> */}
                <div className="ml-auto flex items-center space-x-3 md:space-x-4">
                    <UserButton afterSignOutUrl="/" />
                </div>
            </div>
        </div>
     );
}
 
export default Navbar;