"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, DocumentData } from "firebase/firestore";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, User, FileText, Film, Pencil } from "lucide-react";
import type { Expediente, Galeria } from "@/types";

interface ExpedienteConPaciente extends Expediente {
  pacienteNombre?: string;
}

export default function TerapeutaPage() {
  const { user } = useAuth();
  const [expedientes, setExpedientes] = useState<ExpedienteConPaciente[]>([]);
  const [galerias, setGalerias] = useState<Galeria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch expedientes
        const expedientesQuery = query(collection(db, "expedientes"), where("terapeutaUid", "==", user.uid));
        const expedientesSnapshot = await getDocs(expedientesQuery);
        const expedientesList = await Promise.all(expedientesSnapshot.docs.map(async (docSnapshot) => {
          const expedienteData = docSnapshot.data() as Expediente;
          const pacienteDoc = await getDoc(doc(db, "usuarios", expedienteData.pacienteUid));
          const pacienteNombre = pacienteDoc.exists() ? pacienteDoc.data().nombre : "Paciente desconocido";
          return { id: docSnapshot.id, ...expedienteData, pacienteNombre };
        }));
        setExpedientes(expedientesList);

        // Fetch galerias
        const galeriasQuery = query(collection(db, "galerias"), where("creadaPor", "==", user.uid));
        const galeriasSnapshot = await getDocs(galeriasQuery);
        const galeriasList = galeriasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Galeria));
        setGalerias(galeriasList);

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [user]);

  return (
    <div className="container mx-auto max-w-7xl py-8">
      <h1 className="text-3xl font-bold mb-8 font-headline">Panel del Terapeuta</h1>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-16 w-16 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Expedientes Section */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2 font-headline"><FileText/> Expedientes</h2>
              <Button asChild>
                <Link href="/terapeuta/expedientes/crear">
                  <PlusCircle className="mr-2 h-4 w-4" /> Crear Expediente
                </Link>
              </Button>
            </div>
            <Card>
              <CardContent className="p-6">
                {expedientes.length > 0 ? (
                  <ul className="space-y-4">
                    {expedientes.map(exp => (
                      <li key={exp.id} className="p-4 rounded-lg border bg-card">
                        <p className="font-semibold flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground"/> {exp.pacienteNombre}</p>
                        <p className="text-sm text-muted-foreground truncate">{exp.descripcion}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No has creado ningún expediente.</p>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Galerias Section */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2 font-headline"><Film/> Galerías</h2>
              <Button asChild>
                <Link href="/terapeuta/galerias/crear">
                  <PlusCircle className="mr-2 h-4 w-4" /> Crear Galería
                </Link>
              </Button>
            </div>
            <Card>
              <CardContent className="p-6">
                {galerias.length > 0 ? (
                  <ul className="space-y-4">
                    {galerias.map(gal => (
                      <li key={gal.id} className="p-4 rounded-lg border bg-card flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{gal.nombre}</p>
                          <p className="text-sm text-muted-foreground">{gal.descripcion}</p>
                           <p className="text-xs text-muted-foreground mt-2">{gal.pacientesAsignados.length} paciente(s) asignado(s)</p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                           <Link href={`/terapeuta/galerias/editar/${gal.id}`}>
                              <Pencil className="h-4 w-4 mr-2" /> Editar
                           </Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No has creado ninguna galería.</p>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
