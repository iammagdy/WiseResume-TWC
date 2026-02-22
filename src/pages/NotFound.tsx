import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, AlertCircle, LayoutDashboard, FileText, Briefcase, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const quickLinks = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Applications", icon: Briefcase, path: "/applications" },
  { label: "AI Studio", icon: Sparkles, path: "/ai-studio" },
];

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const destination = isAuthenticated ? '/dashboard' : '/';
  const label = isAuthenticated ? 'Go to Dashboard' : 'Return to Home';
  const Icon = isAuthenticated ? LayoutDashboard : Home;

  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-background px-4 pb-safe">
      <motion.div 
        className="text-center max-w-sm w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <AlertCircle className="w-12 h-12 text-muted-foreground" />
        </motion.div>
        
        <motion.h1 
          className="mb-3 text-6xl font-display font-bold gradient-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          404
        </motion.h1>
        
        <motion.p 
          className="mb-6 text-lg text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Oops! This page doesn't exist
        </motion.p>
        
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold gradient-primary"
            onClick={() => navigate(destination)}
          >
            <Icon className="w-5 h-5 mr-2" />
            {label}
          </Button>

          {isAuthenticated && (
            <div className="grid grid-cols-3 gap-2">
              {quickLinks.map(({ label, icon: QIcon, path }) => (
                <Button
                  key={path}
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={() => navigate(path)}
                >
                  <QIcon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
