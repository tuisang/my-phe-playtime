import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SearchBar } from "@/components/SearchBar";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";

interface NavbarProps {
  user?: any;
  userRole?: string;
}

export const Navbar = ({ user, userRole }: NavbarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useI18n();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b-4 border-primary/20 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-full">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                My PHE Today
              </h1>
              <p className="text-xs text-muted-foreground">{t("nav.tagline")}</p>
            </div>
          </Link>

          <div className="hidden md:block flex-1 max-w-md mx-6">
            <SearchBar />
          </div>

          <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-end">
            <LanguageToggle />
            {user ? (
              <>
                <Link to="/history">
                  <Button variant="ghost" size="lg" className="font-bold hidden sm:inline-flex">
                    {t("nav.myPurchases")}
                  </Button>
                </Link>
                {userRole === 'admin' && (
                  <Link to="/admin">
                    <Button variant="secondary" size="lg" className="font-bold">
                      {t("nav.adminPanel")}
                    </Button>
                  </Link>
                )}
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="lg"
                  className="font-bold"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t("nav.signOut")}</span>
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button size="lg" className="font-bold">
                  <User className="w-4 h-4 mr-2" />
                  {t("nav.signIn")}
                </Button>
              </Link>
            )}
          </div>
        </div>
        <div className="md:hidden mt-3">
          <SearchBar />
        </div>
      </div>
    </nav>
  );
};
