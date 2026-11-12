import { ottieniUtenteAutenticato } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardStudenteLayout({ children }: { children: React.ReactNode }) {
  const utente = await ottieniUtenteAutenticato();
  
  if (!utente || utente.ruolo !== "STUDENTE") {
    redirect("/"); 
  }

  return <>{children}</>;
}