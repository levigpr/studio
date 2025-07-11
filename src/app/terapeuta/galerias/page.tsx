"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, Loader2, Film, Pencil } from "lucide-react";
import type { Galeria } from "@/types";

export default function GaleriasPage() {
  const { user } = useAuth();
  const [galerias, setGalerias] = useState<Galeria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      setLoading(true);
      try {
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
    <div>
       <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Film/> Galerías</h1>
        <Button asChild>
          <Link href="/terapeuta/galerias/crear">
            <PlusCircle className="mr-2 h-4 w-4" /> Crear Galería
          </Link>
        </Button>
      </div>

       {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-16 w-16 animate-spin" />
        </div>
      ) : (
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
      )}
    </div>
  );
}
