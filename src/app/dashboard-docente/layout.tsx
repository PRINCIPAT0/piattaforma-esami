import { ottieniUtenteAutenticato } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardDocenteLayout({ children }: { children: React.ReactNode }) {
  const utente = await ottieniUtenteAutenticato();
  
  if (!utente || utente.ruolo !== "DOCENTE") {
    redirect("/");
  }

  return <>{children}</>;
}