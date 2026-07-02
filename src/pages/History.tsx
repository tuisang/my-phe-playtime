import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, ChevronLeft, ShoppingBag } from "lucide-react";
import { getGradeLabel } from "@/lib/grades";

interface PaymentRow {
  id: string;
  amount: number;
  status: string;
  mpesa_receipt: string | null;
  created_at: string;
  lesson_id: string;
  lessons: { id: string; title: string; grade: number } | null;
}

const statusColor = (s: string) =>
  s === "completed" ? "bg-green-500" : s === "pending" ? "bg-yellow-500" : "bg-red-500";

const History = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      const { data: roleData } = await supabase
        .from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle();
      if (roleData) setUserRole(roleData.role);

      const { data } = await supabase
        .from("payments")
        .select("id, amount, status, mpesa_receipt, created_at, lesson_id, lessons(id, title, grade)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      setPayments((data as any) || []);
      setLoading(false);
    };
    load();
  }, [navigate]);

  const totalSpent = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <Navbar user={user} userRole={userRole} />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Button onClick={() => navigate("/")} variant="outline" size="lg" className="mb-6 font-bold">
          <ChevronLeft className="w-4 h-4 mr-2" /> Back to Home
        </Button>

        <div className="mb-8 flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-2xl">
            <Receipt className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Purchase History</h1>
            <p className="text-muted-foreground">All your lesson payments in one place</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 border-2">
            <p className="text-sm text-muted-foreground">Total Purchases</p>
            <p className="text-3xl font-bold text-primary">{payments.filter(p => p.status === "completed").length}</p>
          </Card>
          <Card className="p-6 border-2">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-3xl font-bold text-secondary">KES {totalSpent.toFixed(0)}</p>
          </Card>
          <Card className="p-6 border-2">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">{payments.filter(p => p.status === "pending").length}</p>
          </Card>
        </div>

        <Card className="border-2 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-bold mb-2">No purchases yet</p>
              <p className="text-muted-foreground mb-6">Explore lessons and unlock learning materials</p>
              <Link to="/"><Button size="lg" className="font-bold">Browse Lessons</Button></Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Lesson</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{p.lessons?.title ?? "—"}</TableCell>
                    <TableCell>{p.lessons ? getGradeLabel(p.lessons.grade) : "—"}</TableCell>
                    <TableCell>KES {Number(p.amount).toFixed(0)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.mpesa_receipt ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColor(p.status)} text-white capitalize`}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.lessons && (
                        <Link to={`/lesson/${p.lessons.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>
    </div>
  );
};

export default History;
