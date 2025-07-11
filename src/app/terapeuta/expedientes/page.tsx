
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, User, FileText, ChevronRight } from "lucide-react";
import type { Expediente } from "@/types";
import { useRouter } from "next/navigation";

interface ExpedienteConPaciente extends Expediente {
  pacienteNombre?: string;
}

export default function ExpedientesPage() {
  const { user } = useAuth();
  const [expedientes, setExpedientes] = useState<ExpedienteConPaciente[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();


  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);
      try {
        const expedientesQuery = query(collection(db, "expedientes"), where("terapeutaUid", "==", user.uid));
        const expedientesSnapshot = await getDocs(expedientesQuery);
        const expedientesList = await Promise.all(expedientesSnapshot.docs.map(async (docSnapshot) => {
          const expedienteData = docSnapshot.data() as Expediente;
          const pacienteDoc = await getDoc(doc(db, "usuarios", expedienteData.pacienteUid));
          const pacienteNombre = pacienteDoc.exists() ? pacienteDoc.data().nombre : "Paciente desconocido";
          return { id: docSnapshot.id, ...expedienteData, pacienteNombre };
        }));
        setExpedientes(expedientesList);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [user]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><FileText/> Expedientes</h1>
        <Button asChild>
          <Link href="/terapeuta/expedientes/crear">
            <PlusCircle className="mr-2 h-4 w-4" /> Crear Expediente
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-16 w-16 animate-spin" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {expedientes.length > 0 ? (
              <ul className="divide-y divide-border">
                {expedientes.map(exp => (
                  <li 
                    key={exp.id} 
                    className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/terapeuta/expedientes/${exp.id}`)}
                  >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="font-semibold flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground"/> {exp.pacienteNombre}</p>
                            <p className="text-sm text-muted-foreground truncate mt-1">{exp.descripcion}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-12">No has creado ningún expediente.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
