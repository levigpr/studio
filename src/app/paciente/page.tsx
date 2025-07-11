
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, DocumentData } from "firebase/firestore";
import type { Expediente, Galeria, Sesion } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import YoutubeEmbed from "@/components/youtube-embed";
import { Film, FileText, Calendar, Clock, CheckCircle, XCircle, PlusCircle, PencilRuler } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function PacientePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [galerias, setGalerias] = useState<Galeria[]>([]);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch expediente
        const expedientesQuery = query(collection(db, "expedientes"), where("pacienteUid", "==", user.uid));
        const expedientesSnapshot = await getDocs(expedientesQuery);
        if (!expedientesSnapshot.empty) {
          const expedienteData = expedientesSnapshot.docs[0].data() as DocumentData;
          setExpediente({ id: expedientesSnapshot.docs[0].id, ...expedienteData } as Expediente);
        }

        // Fetch galerias
        const galeriasQuery = query(collection(db, "galerias"), where("pacientesAsignados", "array-contains", user.uid));
        const galeriasSnapshot = await getDocs(galeriasQuery);
        const galeriasList = galeriasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Galeria));
        setGalerias(galeriasList);

        // Fetch sesiones
        const sesionesQuery = query(collection(db, "sesiones"), where("pacienteUid", "==", user.uid));
        const sesionesSnapshot = await getDocs(sesionesQuery);
        const sesionesList = sesionesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sesion));
        sesionesList.sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis());
        setSesiones(sesionesList);

      } catch (error) {
        console.error("Error fetching patient data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);
  
  const getBadgeVariant = (estado: Sesion["estado"]) => {
    switch (estado) {
      case "agendada": return "secondary";
      case "completada": return "default";
      case "cancelada": return "destructive";
      default: return "outline";
    }
  };

  const getStatusIcon = (estado: Sesion["estado"]) => {
    switch (estado) {
      case "agendada": return <Clock className="h-5 w-5 text-blue-500" />;
      case "completada": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "cancelada": return <XCircle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  }


  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-1/3 mb-4" />
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
          <CardContent><Skeleton className="h-20 w-full" /></CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
          <CardContent><Skeleton className="h-32 w-full" /></CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
          <CardContent><Skeleton className="h-32 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-headline">Panel del Paciente</h1>
        <Button onClick={() => router.push('/paciente/registrar-avance')} disabled={!expediente}>
            <PencilRuler className="mr-2 h-4 w-4" />
            Registrar mi Avance
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <FileText className="h-6 w-6" />
              Mi Expediente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expediente ? (
              <p className="text-muted-foreground">{expediente.descripcion}</p>
            ) : (
              <p className="text-muted-foreground">No se ha encontrado un expediente asignado.</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Calendar className="h-6 w-6" />
              Mis Sesiones
            </CardTitle>
          </CardHeader>
          <CardContent>
             {sesiones.length > 0 ? (
                <ul className="space-y-4">
                    {sesiones.map(sesion => (
                        <li key={sesion.id} className="flex items-start p-4 rounded-lg border bg-muted/20 gap-4">
                           <div className="mt-1">{getStatusIcon(sesion.estado)}</div>
                           <div className="flex-1">
                             <div className="flex justify-between items-center mb-1">
                                <p className="font-semibold capitalize">{format(sesion.fecha.toDate(), "eeee, dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}</p>
                                <Badge variant={getBadgeVariant(sesion.estado)} className="capitalize">{sesion.estado}</Badge>
                             </div>
                             <div className="text-sm text-muted-foreground space-y-1">
                                <p><strong className="font-medium text-foreground">Modalidad:</strong> <span className="capitalize">{sesion.modalidad}</span></p>
                                {sesion.ubicacion && <p><strong className="font-medium text-foreground">Ubicación:</strong> {sesion.ubicacion}</p>}
                                {sesion.nota && <p><strong className="font-medium text-foreground">Nota:</strong> {sesion.nota}</p>}
                                {sesion.estado === 'completada' && sesion.notasTerapeuta && (
                                    <div className="pt-2 mt-2 border-t">
                                        <p className="font-semibold text-foreground">Notas del Terapeuta:</p>
                                        <p className="whitespace-pre-wrap">{sesion.notasTerapeuta}</p>
                                        <div className="flex gap-4 mt-1 text-xs">
                                            <span>Dolor Inicial: {sesion.dolorInicial}/10</span>
                                            <span>Dolor Final: {sesion.dolorFinal}/10</span>
                                        </div>
                                    </div>
                                )}
                             </div>
                           </div>
                        </li>
                    ))}
                </ul>
            ) : (
                 <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg"><p>No tienes sesiones agendadas.</p></div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline">
              <Film className="h-6 w-6" />
              Galerías de Ejercicios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {galerias.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {galerias.map(galeria => (
                  <AccordionItem value={galeria.id} key={galeria.id}>
                    <AccordionTrigger className="text-lg font-semibold">{galeria.nombre}</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground mb-4">{galeria.descripcion}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {galeria.videos.map((video, index) => (
                          <Card key={index}>
                            <CardHeader>
                              <CardTitle className="text-base">{video.titulo}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <YoutubeEmbed url={video.youtubeUrl} />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>No tienes galerías de ejercicios asignadas.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
