import { ottieniUtenteAutenticato } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardAdminLayout({ children }: { children: React.ReactNode }) {
  const utente = await ottieniUtenteAutenticato();
  
  if (!utente || utente.ruolo !== "SUPERADMIN") {
    redirect("/");
  }

  return <>{children}</>;
}