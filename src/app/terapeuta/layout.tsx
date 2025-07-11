import AppHeader from "@/components/app-header";
import { SidebarNav } from "@/components/sidebar-nav";
import { Separator } from "@/components/ui/separator";
import { FileText, Users, Film } from "lucide-react";

const sidebarNavItems = [
  {
    title: "Panel General",
    href: "/terapeuta",
  },
  {
    title: "Pacientes",
    href: "/terapeuta/pacientes",
    icon: <Users className="mr-2 h-4 w-4" />,
  },
  {
    title: "Expedientes",
    href: "/terapeuta/expedientes",
    icon: <FileText className="mr-2 h-4 w-4" />,
  },
  {
    title: "Galerías",
    href: "/terapeuta/galerias",
    icon: <Film className="mr-2 h-4 w-4" />,
  },
];

export default function TerapeutaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full">
      <AppHeader />
      <div className="container mx-auto mt-8">
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
          <aside className="-mx-4 lg:w-1/5">
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className="flex-1">
            <main>{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}