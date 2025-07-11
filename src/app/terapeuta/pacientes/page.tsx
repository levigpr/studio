
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/auth-context";
import type { UserProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Users, ChevronRight } from "lucide-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PacientesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pacientes, setPacientes] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPacientes() {
      if (!user) return;
      setLoading(true);
      try {
        const q = query(collection(db, "usuarios"), where("rol", "==", "paciente"));
        const querySnapshot = await getDocs(q);
        const pacientesList = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setPacientes(pacientesList);
      } catch (error) {
        console.error("Error fetching patients:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPacientes();
  }, [user]);

  const getInitials = (name: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Users /> Pacientes</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-16 w-16 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Avatar</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Fecha de Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacientes.length > 0 ? (
                  pacientes.map(paciente => (
                    <TableRow key={paciente.uid} className="cursor-pointer" onClick={() => router.push(`/terapeuta/pacientes/${paciente.uid}`)}>
                      <TableCell>
                        <Avatar>
                          <AvatarFallback>{getInitials(paciente.nombre)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{paciente.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{paciente.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {paciente.fechaRegistro ? format(paciente.fechaRegistro.toDate(), 'dd MMM yyyy', { locale: es }) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No se encontraron pacientes.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
