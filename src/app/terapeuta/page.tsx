"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, DocumentData } from "firebase/firestore";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Loader2, User, FileText, Film, Pencil, Users } from "lucide-react";
import type { Expediente, Galeria } from "@/types";
import { useRouter } from "next/navigation";


interface ExpedienteConPaciente extends Expediente {
  pacienteNombre?: string;
}

export default function TerapeutaPage() {
  const { user } = useAuth();
  const [expedientes, setExpedientes] = useState<ExpedienteConPaciente[]>([]);
  const [galerias, setGalerias] = useState<Galeria[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();


  return (
    <div className="container mx-auto max-w-7xl py-8">
      <h1 className="text-3xl font-bold mb-8 font-headline">Panel del Terapeuta</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/terapeuta/pacientes')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                Gestionar Pacientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Añade, visualiza y gestiona los perfiles de tus pacientes.</CardDescription>
            </CardContent>
          </Card>

           <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/terapeuta/expedientes')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Gestionar Expedientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Crea y consulta los expedientes clínicos de tus pacientes.</CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/terapeuta/galerias')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-6 w-6" />
                Gestionar Galerías
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Crea y asigna galerías de ejercicios a tus pacientes.</CardDescription>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
