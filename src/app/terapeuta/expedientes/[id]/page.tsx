
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Expediente, UserProfile } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, User, Calendar, Pencil, Trash2 } from "lucide-react";

export default function ExpedienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const expedienteId = params.id as string;
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [paciente, setPaciente] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!expedienteId) return;

    async function fetchExpediente() {
      setLoading(true);
      try {
        const expedienteDocRef = doc(db, "expedientes", expedienteId);
        const expedienteDocSnap = await getDoc(expedienteDocRef);
        
        if (expedienteDocSnap.exists()) {
          const expData = { id: expedienteDocSnap.id, ...expedienteDocSnap.data() } as Expediente;
          setExpediente(expData);

          const pacienteDocRef = doc(db, "usuarios", expData.pacienteUid);
          const pacienteDocSnap = await getDoc(pacienteDocRef);
          if (pacienteDocSnap.exists()) {
            setPaciente({ uid: pacienteDocSnap.id, ...pacienteDocSnap.data() } as UserProfile);
          }

        } else {
          console.error("No such expediente!");
          // Opcional: Redirigir si no se encuentra
          router.push('/terapeuta/expedientes');
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchExpediente();
  }, [expedienteId, router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!expediente || !paciente) {
    return <p>No se pudo encontrar la información del expediente.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold font-headline flex items-center gap-3"><FileText/>Expediente Clínico</h1>
                <p className="text-muted-foreground text-lg flex items-center gap-2"><User className="h-5 w-5"/>{paciente.nombre}</p>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline"><Pencil className="mr-2 h-4 w-4"/>Editar</Button>
                <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4"/>Eliminar</Button>
            </div>
        </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Descripción General</CardTitle>
          <CardDescription>
            Creado el {new Date(expediente.fechaCreacion.seconds * 1000).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-base whitespace-pre-wrap">{expediente.descripcion}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar/>Sesiones y Avances</CardTitle>
            <CardDescription>Registro de sesiones y evolución del paciente.</CardDescription>
        </CardHeader>
        <CardContent>
            {/* Aquí irán las notas de sesión y los gráficos en el futuro */}
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>Próximamente: Historial de sesiones y gráficos de progreso.</p>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
