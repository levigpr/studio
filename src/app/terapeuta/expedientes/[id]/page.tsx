
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, getDocs, collection, query, where, addDoc, serverTimestamp, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Expediente, UserProfile, Sesion } from "@/types";
import { useAuth } from "@/context/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, User, Calendar, Pencil, Trash2, PlusCircle, Loader2, Calendar as CalendarIcon, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const sesionFormSchema = z.object({
  fecha: z.date({
    required_error: "La fecha es requerida.",
  }),
});

export default function ExpedienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const expedienteId = params.id as string;
  
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [paciente, setPaciente] = useState<UserProfile | null>(null);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const form = useForm<z.infer<typeof sesionFormSchema>>({
    resolver: zodResolver(sesionFormSchema),
  });

  useEffect(() => {
    if (!expedienteId) return;

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch Expediente
        const expedienteDocRef = doc(db, "expedientes", expedienteId);
        const expedienteDocSnap = await getDoc(expedienteDocRef);
        
        if (expedienteDocSnap.exists()) {
          const expData = { id: expedienteDocSnap.id, ...expedienteDocSnap.data() } as Expediente;
          setExpediente(expData);

          // Fetch Paciente
          const pacienteDocRef = doc(db, "usuarios", expData.pacienteUid);
          const pacienteDocSnap = await getDoc(pacienteDocRef);
          if (pacienteDocSnap.exists()) {
            setPaciente({ uid: pacienteDocSnap.id, ...pacienteDocSnap.data() } as UserProfile);
          }

          // Fetch Sesiones
          const sesionesQuery = query(collection(db, "sesiones"), where("expedienteId", "==", expedienteId), orderBy("fecha", "desc"));
          const sesionesSnapshot = await getDocs(sesionesQuery);
          const sesionesList = sesionesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sesion));
          setSesiones(sesionesList);

        } else {
          console.error("No such expediente!");
          toast({ title: "Error", description: "El expediente no fue encontrado.", variant: "destructive" });
          router.push('/terapeuta/expedientes');
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [expedienteId, router, toast]);

  async function onAgendarSesion(values: z.infer<typeof sesionFormSchema>) {
    if (!user || !expediente) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "sesiones"), {
        expedienteId: expediente.id,
        terapeutaUid: user.uid,
        pacienteUid: expediente.pacienteUid,
        fecha: Timestamp.fromDate(values.fecha),
        estado: "Programada",
      });

      // Refetch sesiones
      const sesionesQuery = query(collection(db, "sesiones"), where("expedienteId", "==", expedienteId), orderBy("fecha", "desc"));
      const sesionesSnapshot = await getDocs(sesionesQuery);
      const sesionesList = sesionesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sesion));
      setSesiones(sesionesList);

      toast({ title: "Éxito", description: "Sesión agendada correctamente." });
      form.reset();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error agendando sesión:", error);
      toast({ title: "Error", description: "No se pudo agendar la sesión.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const getBadgeVariant = (estado: Sesion["estado"]) => {
    switch (estado) {
      case "Programada": return "secondary";
      case "Completada": return "default";
      case "Cancelada": return "destructive";
      default: return "outline";
    }
  };


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
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/3" /></CardHeader>
          <CardContent><Skeleton className="h-20 w-full" /></CardContent>
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
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="flex items-center gap-2"><Calendar/>Sesiones y Avances</CardTitle>
                <CardDescription>Registro de sesiones y evolución del paciente.</CardDescription>
            </div>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4"/> Agendar Sesión</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agendar Nueva Sesión</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onAgendarSesion)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="fecha"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de la sesión</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: es })
                                  ) : (
                                    <span>Elige una fecha</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarPicker
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                      Guardar Sesión
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
            {sesiones.length > 0 ? (
                <ul className="space-y-3">
                    {sesiones.map(sesion => (
                        <li key={sesion.id} className="flex justify-between items-center p-3 rounded-lg border">
                           <div>
                             <p className="font-semibold">{format(sesion.fecha.toDate(), "eeee, dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}</p>
                             <Badge variant={getBadgeVariant(sesion.estado)} className="mt-1">{sesion.estado}</Badge>
                           </div>
                           <Button variant="ghost" size="sm">Ver Detalles</Button>
                        </li>
                    ))}
                </ul>
            ) : (
                 <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>No hay sesiones agendadas para este paciente.</p>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
