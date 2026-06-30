import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { TopicsManager } from "@/components/admin/TopicsManager";
import { LessonsManager } from "@/components/admin/LessonsManager";
import { ResourcesManager } from "@/components/admin/ResourcesManager";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
      if (!data) {
        toast({
          title: "Access denied",
          description: "You need admin privileges to view this page.",
          variant: "destructive",
        });
      }
    };
    check();
  }, [navigate, toast]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
        <Navbar user={user} userRole="admin" />
        <main className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
        <Navbar user={user} />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Admins only</h1>
          <p className="text-muted-foreground">
            Your account doesn't have admin access.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <Navbar user={user} userRole="admin" />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage topics, lessons, and learning resources.
          </p>
        </div>

        <Card className="p-4 md:p-6 border-4 border-primary/10">
          <Tabs defaultValue="topics" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="topics" className="text-base">Topics</TabsTrigger>
              <TabsTrigger value="lessons" className="text-base">Lessons</TabsTrigger>
              <TabsTrigger value="resources" className="text-base">Resources</TabsTrigger>
            </TabsList>
            <TabsContent value="topics">
              <TopicsManager />
            </TabsContent>
            <TabsContent value="lessons">
              <LessonsManager />
            </TabsContent>
            <TabsContent value="resources">
              <ResourcesManager />
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
