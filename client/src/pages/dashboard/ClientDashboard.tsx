import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { FileText, MessageSquare, Car, User, Tag } from "lucide-react";
import { useLocation } from "wouter";
import Footer from "@/components/layout/Footer";

export default function ClientDashboard() {
  const [location] = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <SidebarProvider defaultOpen>
        <div className="flex flex-1">
          <Sidebar side="left" variant="sidebar" collapsible="icon">
            <SidebarHeader className="border-b border-border/50">
              <div className="flex items-center gap-2 px-4 py-2">
                <img
                  src="https://i.ibb.co/njmjGNW/Logo.png"
                  alt="CARVIZIO Logo"
                  className="h-8 w-auto"
                />
                <span className="text-xl font-bold">CARVIZIO</span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location === "/dashboard/requests"}
                    tooltip="Cererile Mele"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Cererile Mele</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location === "/dashboard/offers"}
                    tooltip="Oferte Primite"
                  >
                    <Tag className="h-4 w-4" />
                    <span>Oferte Primite</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location === "/dashboard/messages"}
                    tooltip="Mesaje"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Mesaje</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location === "/dashboard/my-car"}
                    tooltip="Mașina Mea"
                  >
                    <Car className="h-4 w-4" />
                    <span>Mașina Mea</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={location === "/dashboard/account"}
                    tooltip="Cont"
                  >
                    <User className="h-4 w-4" />
                    <span>Cont</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>

          <main className="flex-1 p-6">
            <Tabs defaultValue="requests" className="h-full space-y-6">
              <div className="space-between flex items-center">
                <TabsList>
                  <TabsTrigger value="requests">Cererile Mele</TabsTrigger>
                  <TabsTrigger value="offers">Oferte Primite</TabsTrigger>
                  <TabsTrigger value="messages">Mesaje</TabsTrigger>
                  <TabsTrigger value="my-car">Mașina Mea</TabsTrigger>
                  <TabsTrigger value="account">Cont</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="requests" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Cererile Mele</h2>
                    <p>Lista cererilor tale va apărea aici.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="offers" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Oferte Primite</h2>
                    <p>Ofertele primite vor apărea aici.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="messages" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Mesaje</h2>
                    <p>Mesajele tale vor apărea aici.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="my-car" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Mașina Mea</h2>
                    <p>Detaliile mașinii tale vor apărea aici.</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="account" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Cont</h2>
                    <p>Setările contului tău vor apărea aici.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </SidebarProvider>
      <Footer />
    </div>
  );
}