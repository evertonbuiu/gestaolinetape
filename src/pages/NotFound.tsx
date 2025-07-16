import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    
    // Redirect to home page immediately
    navigate("/");
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Página não encontrada</p>
        <p className="text-sm text-muted-foreground mb-4">Redirecionando para a página inicial...</p>
        <Button onClick={() => navigate("/")}>
          Voltar ao Início
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
