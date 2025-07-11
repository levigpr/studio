"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, DocumentData } from "firebase/firestore";
import type { Expediente, Galeria } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import YoutubeEmbed from "@/components/youtube-embed";
import { Film, FileText } from "lucide-react";

export default function PacientePage() {
  const { user } = useAuth();
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [galerias, setGalerias] = useState<Galeria[]>([]);
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
      } catch (error) {
        console.error("Error fetching patient data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <div>
          <Skeleton className="h-10 w-1/3 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8 font-headline">Panel del Paciente</h1>
      <div className="space-y-8">
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
        
        <div>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 font-headline">
            <Film className="h-6 w-6" />
            Galerías de Ejercicios
          </h2>
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
            <Card className="flex items-center justify-center p-10">
              <p className="text-muted-foreground">No tienes galerías de ejercicios asignadas.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
