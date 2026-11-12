import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const nome = process.env.SUPERADMIN_NOME?.trim();
  const cognome = process.env.SUPERADMIN_COGNOME?.trim();
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!nome || !cognome || !email || !password) {
    throw new Error("Compilare le variabili SUPERADMIN_* nel file .env.");
  }

  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^a-zA-Z0-9]/.test(password)
  ) {
    throw new Error(
      "La password deve avere almeno 8 caratteri, una maiuscola, un numero e un carattere speciale."
    );
  }

  const esistente = await prisma.user.findUnique({
    where: { email },
  });

  if (esistente) {
    console.log("Account già presente: nessuna modifica effettuata.");
    return;
  }

  await prisma.user.create({
    data: {
      nome,
      cognome,
      email,
      password: await bcrypt.hash(password, 10),
      ruolo: "SUPERADMIN",
      attivo: true,
      matricola: "000001"
    },
  });

  console.log("✅ Superadmin creato. Puoi accedere dal normale login.");
}

main()
  .catch((error) => {
    console.error("Errore:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });