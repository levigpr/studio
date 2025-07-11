
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User, HeartPulse, Phone, AlertTriangle, Pill, FileText, ClipboardList } from "lucide-react";

function InfoCard({ title, value, icon }: { title: string; value?: string; icon: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
        {icon} {title}
      </h4>
      <p className="text-base whitespace-pre-wrap">{value || "No especificado"}</p>
    </div>
  );
}

export default function PacienteDetallePage() {
  const params = useParams();
  const pacienteId = params.id as string;
  const [paciente, setPaciente] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pacienteId) return;

    async function fetchPaciente() {
      setLoading(true);
      try {
        const pacienteDocRef = doc(db, "usuarios", pacienteId);
        const pacienteDocSnap = await getDoc(pacienteDocRef);
        if (pacienteDocSnap.exists()) {
          setPaciente({ uid: pacienteDocSnap.id, ...pacienteDocSnap.data() } as UserProfile);
        } else {
          console.error("No such patient!");
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPaciente();
  }, [pacienteId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/2" />
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-6 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paciente) {
    return <p>No se pudo encontrar la información del paciente.</p>;
  }

  const { nombre, email, informacionMedica } = paciente;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-primary/20 p-3 rounded-full">
            <User className="h-8 w-8 text-primary" />
        </div>
        <div>
            <h1 className="text-3xl font-bold font-headline">{nombre}</h1>
            <p className="text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HeartPulse/> Información de Contacto y Emergencia</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoCard 
                title="Contacto de Emergencia" 
                value={informacionMedica?.contactoEmergencia?.nombre}
                icon={<AlertTriangle className="h-4 w-4" />}
            />
             <InfoCard 
                title="Teléfono de Emergencia" 
                value={informacionMedica?.contactoEmergencia?.telefono}
                icon={<Phone className="h-4 w-4" />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText /> Historial Médico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             <InfoCard 
                title="Historial Médico Relevante" 
                value={informacionMedica?.historialMedico}
                icon={<ClipboardList className="h-4 w-4" />}
            />
             <InfoCard 
                title="Alergias" 
                value={informacionMedica?.alergias}
                icon={<AlertTriangle className="h-4 w-4" />}
            />
             <InfoCard 
                title="Medicamentos Actuales" 
                value={informacionMedica?.medicamentos}
                icon={<Pill className="h-4 w-4" />}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
