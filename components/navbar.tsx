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

    // Find the user in the database to get their ID
    const user = await prismadb.user.findUnique({
        where: {
            clerkId: userId,
        },
    });

    // Get user's saloons instead of stores
    const saloons = user ? await prismadb.saloon.findMany({
        where: {
            userId: user.id,
        },
    }) : [];

    return ( 
        <div className="fixed top-0 left-0 right-0 z-[100] w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm">
            <div className="flex h-14 items-center px-3 md:px-4">
                <SidebarTrigger className="mr-3 md:mr-4 h-10 w-10 md:h-7 md:w-7" />
                {/* <SaloonSwitcher items={saloons} /> */}
                {/* <MainNav className="mx-6" /> */}
                <div className="ml-auto flex items-center space-x-3 md:space-x-4">
                    <UserButton afterSignOutUrl="/" />
                </div>
            </div>
        </div>
     );
}
 
export default Navbar;