import logoImage from "@/assets/logo.png";
import { useLogo } from "@/hooks/useLogo";
import { useCompanySettings } from "@/hooks/useCompanySettings";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const Logo = ({ size = "md", showText = true }: LogoProps) => {
  const { logoUrl, isLoading } = useLogo();
  const { settings } = useCompanySettings();
  const sizeClasses = {
    sm: "h-8",
    md: "h-12",
    lg: "h-16"
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl", 
    lg: "text-2xl"
  };

  return (
    <div className="flex items-center gap-3">
      <img 
        src={logoUrl || logoImage} 
        alt="Luz Locação" 
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
      {showText && (
        <div>
          <h1 className={`${textSizeClasses[size]} font-bold text-primary`}>
            {settings?.company_name || 'Luz Locação'}
          </h1>
          {size !== "sm" && (
            <p className="text-sm text-muted-foreground">
              {settings?.tagline || 'Controle de Estoque'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};