"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client"; // Supabase client import
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  BadgeCheck,
  LibraryBig,
  Bot,
  ChevronsUpDown,
  Frame,
  LogOut,
  Map,
  PieChart,
  Settings2,
  BrainCircuit,
  SquareTerminal,
  PlugIcon as Plugin,
  Folder,
  School,
  Gamepad2,
  MessageSquareTextIcon,
  Book,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import newLogo from "@/public/newLogo.png";
import airsStar from "@/public/airsStar.png";
import { stat } from "fs";
import { title } from "process";
import { usePathname } from "next/navigation";

export function AppSidebar() {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState("guest@example.com"); // Default email
  const [userRole, setUserRole] = useState<string | null>(null); // User role

  // Fetch the user session from Supabase
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient(); // Initialize Supabase client
      const {
        data: { user },
      } = await supabase.auth.getUser(); // Get user session

      if (user) {
        setUserEmail(user.email ?? "guest@example.com"); // Set email from the user session
        setUserRole(user.user_metadata.role ?? null); // Set role from user metadata
      }
    };

    fetchUser();
  }, []);

  // Define navigation data based on user role
  const navData = {
    navMain: [
      ...(["dat_student", "dat_school", "dat_judge", "dat_admin"].includes(
        userRole || ""
      )
        ? [
            {
              title: "Dashboard",
              url:
                userRole === "dat_student"
                  ? "/dat/student"
                  : userRole === "dat_school"
                    ? "/dat/school"
                    : userRole === "dat_judge"
                      ? "/dat/judge"
                      : userRole === "dat_admin"
                        ? "/dat/admin"
                        : "/dashboard",
              icon: Map,
            },
            {
              title: "AI Apps",
              url: "/tools",
              icon: SquareTerminal,
              isActive: true,
            },
            {
              title: "Learn AI",
              url: "/learn-ai",
              icon: BrainCircuit,
            },
          ]
        : [
            { title: "Agent Buddy", url: "/tools/gen-chat", icon: Bot },
            {
              title: "Dashboard",
              url: userRole === "School" ? "/school" : "/dashboard",
              icon: Map,
            },
            { title: "Lesson Plan", url: "/tools/lesson-planner", icon: Book },
            {
              title: "AI Apps",
              url: "/tools",
              icon: SquareTerminal,
              isActive: true,
            },
            {
              title: "Learn AI",
              url: "/learn-ai",
              icon: BrainCircuit,
            },
            {
              title: "Guide",
              url: "/guide",
              icon: Frame,
            },
          ]),

      ...(userRole === "Teacher"
        ? [
            {
              title: "Knowledge Base",
              url: "/knowledge-base",
              icon: LibraryBig,
            },
          ]
        : []),

      ...(userRole === "Admin"
        ? [
            {
              title: "Document Vault",
              url: "/document-vault",
              icon: Folder,
            },
            {
              title: "Schools",
              url: "/school",
              icon: School,
            },
            {
              title: "Connect Database",
              url: "/connect-database",
              icon: Plugin,
            },
          ]
        : []),

      ...(userRole === "School"
        ? [
            {
              title: "Evaluation Comparision",
              url: "/tools/comparision",
              icon: LibraryBig,
            },
          ]
        : []),
    ],
  };

  // Add Logo component to switch logos based on sidebar state
  const Logo = () => {
    const { state } = useSidebar();
    return (
      <Link href="/tools">
        <Image
          src={state === "expanded" ? newLogo : airsStar}
          alt="AI Ready School"
          width={state === "expanded" ? 140 : 40}
          height={state === "expanded" ? 130 : 40}
          className={state === "expanded" ? "ml-8" : ""}
        />
      </Link>
    );
  };

  return (
    <Sidebar collapsible="icon">
      {/* Sidebar Header with Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Logo />
              </DropdownMenuTrigger>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Main Navigation Links */}
      <SidebarContent className="mt-4">
        <SidebarGroup>
          <SidebarMenu>
            {navData.navMain.map((item) => (
              <SidebarMenuItem key={item.title} className="mt-[-0.3rem]">
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  className={
                    pathname === item.url ? "bg-neutral-100 rounded-lg" : ""
                  }
                >
                  <Link href={item.url}>
                    {item.icon && (
                      <item.icon
                        className={`font-bold mr-[0.5rem] ${
                          pathname === item.url
                            ? "text-rose-500 font-extrabold"
                            : "text-neutral-800"
                        }`}
                        size={38}
                        strokeWidth={2}
                      />
                    )}
                    <span
                      className={`font-semibold text-[16px] ${
                        pathname === item.url
                          ? "text-rose-500 font-extrabold"
                          : ""
                      }`}
                    >
                      {item.title}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg border border-neutral-300">
                      {userEmail.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate text-xs font-semibold">
                      {userEmail}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              {/* Dropdown Menu Content */}
              <DropdownMenuContent
                side="bottom"
                align="end"
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src="/default-avatar.png"
                        alt="User Avatar"
                      />
                      <AvatarFallback className="rounded-lg">
                        {userEmail.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate text-xs font-semibold">
                        {userEmail}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <Settings2 className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                {userRole === "Student" && (
                  <DropdownMenuItem asChild>
                    <Link href="/portfolio" className="flex items-center">
                      <Gamepad2 className="mr-2 h-4 w-4" />
                      <span>Portfolio</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                {userRole === "Admin" && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/logs" className="flex items-center">
                        <PieChart className="mr-2 h-4 w-4" />
                        <span>Logs</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/roles" className="flex items-center">
                        <BadgeCheck className="mr-2 h-4 w-4" />
                        <span>Roles</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem>
                  <form className="w-full">
                    <Link href={"/feedback"}>
                      <button
                        type="submit"
                        className="flex w-full items-center"
                      >
                        <MessageSquareTextIcon className="mr-2 h-4 w-4" />
                        <span>Feedback</span>
                      </button>
                    </Link>
                  </form>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await signOutAction();
                    }}
                    className="w-full"
                  >
                    <button type="submit" className="flex w-full items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
