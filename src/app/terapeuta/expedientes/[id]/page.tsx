
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, getDocs, collection, query, where, addDoc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Expediente, UserProfile, Sesion } from "@/types";
import { useAuth } from "@/context/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, User, Calendar, Pencil, Trash2, PlusCircle, Loader2, Calendar as CalendarIcon, MoreHorizontal, CheckCircle, XCircle, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";

const sesionFormSchema = z.object({
  fecha: z.date({
    required_error: "La fecha es requerida.",
  }),
  modalidad: z.enum(["presencial", "virtual"], {
    required_error: "Debes seleccionar una modalidad."
  }),
  ubicacion: z.string().optional(),
  nota: z.string().optional(),
}).refine(data => data.modalidad === 'virtual' || (data.modalidad === 'presencial' && data.ubicacion), {
    message: "La ubicación es requerida para sesiones presenciales.",
    path: ["ubicacion"],
});

const progresoFormSchema = z.object({
    dolorInicial: z.number().min(0).max(10).optional(),
    dolorFinal: z.number().min(0).max(10).optional(),
    notasTerapeuta: z.string().min(10, "Las notas deben tener al menos 10 caracteres."),
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
  const [selectedSesion, setSelectedSesion] = useState<Sesion | null>(null);
  const [isProgresoModalOpen, setIsProgresoModalOpen] = useState(false);

  const sesionForm = useForm<z.infer<typeof sesionFormSchema>>({
    resolver: zodResolver(sesionFormSchema),
    defaultValues: {
      modalidad: "presencial",
    }
  });

  const progresoForm = useForm<z.infer<typeof progresoFormSchema>>({
    resolver: zodResolver(progresoFormSchema),
    defaultValues: {
        dolorInicial: 5,
        dolorFinal: 5,
        notasTerapeuta: "",
    }
  });

  const modalidad = sesionForm.watch("modalidad");
  
  const fetchSesiones = async () => {
      if (!expedienteId) return;
      try {
        const sesionesQuery = query(collection(db, "sesiones"), where("expedienteId", "==", expedienteId));
        const sesionesSnapshot = await getDocs(sesionesQuery);
        const sesionesList = sesionesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sesion));
        
        sesionesList.sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis());

        setSesiones(sesionesList);
      } catch (error) {
          console.error("Error fetching sessions:", error);
          toast({ title: "Error", description: "No se pudieron cargar las sesiones.", variant: "destructive" });
      }
  }

  useEffect(() => {
    if (!expedienteId) return;

    async function fetchData() {
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
          await fetchSesiones();
        } else {
          router.push('/terapeuta/expedientes');
        }
      } catch (error) {
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
        modalidad: values.modalidad,
        ubicacion: values.ubicacion || '',
        nota: values.nota || '',
        estado: "agendada",
        creadaEn: serverTimestamp(),
      });

      await fetchSesiones();
      toast({ title: "Éxito", description: "Sesión agendada correctamente." });
      sesionForm.reset({ modalidad: 'presencial', fecha: undefined, ubicacion: '', nota: '' });
      setIsModalOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo agendar la sesión.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onCompletarSesion(values: z.infer<typeof progresoFormSchema>) {
    if (!selectedSesion) return;
    setIsSubmitting(true);
    try {
        const sesionRef = doc(db, "sesiones", selectedSesion.id);
        await updateDoc(sesionRef, {
            estado: "completada",
            dolorInicial: values.dolorInicial,
            dolorFinal: values.dolorFinal,
            notasTerapeuta: values.notasTerapeuta,
        });
        await fetchSesiones();
        toast({ title: "Éxito", description: "La sesión ha sido marcada como completada." });
        setIsProgresoModalOpen(false);
        progresoForm.reset();
    } catch (error) {
        toast({ title: "Error", description: "No se pudo actualizar la sesión.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  async function onCancelarSesion(sesionId: string) {
    setIsSubmitting(true);
    try {
        const sesionRef = doc(db, "sesiones", sesionId);
        await updateDoc(sesionRef, { estado: "cancelada" });
        await fetchSesiones();
        toast({ title: "Éxito", description: "La sesión ha sido cancelada." });
    } catch (error) {
        toast({ title: "Error", description: "No se pudo cancelar la sesión.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  const getBadgeVariant = (estado: Sesion["estado"]) => {
    switch (estado) {
      case "agendada": return "secondary";
      case "completada": return "default";
      case "cancelada": return "destructive";
      default: return "outline";
    }
  };

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!expediente || !paciente) return <p>No se pudo encontrar la información del expediente.</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-3"><FileText/>Expediente Clínico</h1>
          <p className="text-muted-foreground text-lg flex items-center gap-2"><User className="h-5 w-5"/>{paciente.nombre}</p>
      </div>
      
      <Card>
        <CardHeader><CardTitle>Descripción General</CardTitle></CardHeader>
        <CardContent><p className="text-base whitespace-pre-wrap">{expediente.descripcion}</p></CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Calendar/>Sesiones y Avances</CardTitle>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4"/> Agendar Sesión</Button></DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader><DialogTitle>Agendar Nueva Sesión</DialogTitle></DialogHeader>
                <Form {...sesionForm}>
                  <form onSubmit={sesionForm.handleSubmit(onAgendarSesion)} className="space-y-6">
                    <FormField control={sesionForm.control} name="fecha" render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha y hora de la sesión</FormLabel>
                          <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP p", { locale: es }) : <span>Elige una fecha</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><CalendarPicker mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))} initialFocus/></PopoverContent></Popover>
                          <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={sesionForm.control} name="modalidad" render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Modalidad</FormLabel>
                            <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4"><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="presencial" /></FormControl><FormLabel className="font-normal">Presencial</FormLabel></FormItem><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="virtual" /></FormControl><FormLabel className="font-normal">Virtual</FormLabel></FormItem></RadioGroup></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    {modalidad === 'presencial' && <FormField control={sesionForm.control} name="ubicacion" render={({ field }) => (<FormItem><FormLabel>Ubicación</FormLabel><FormControl><Input placeholder="Ej: Clínica Rehabilita #4" {...field} /></FormControl><FormMessage /></FormItem>)}/>}
                    <FormField control={sesionForm.control} name="nota" render={({ field }) => (<FormItem><FormLabel>Nota (Opcional)</FormLabel><FormControl><Textarea placeholder="Ej: Ejercicios de seguimiento post-evaluación inicial" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                    <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Sesión</Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent>
            {sesiones.length > 0 ? (
                <ul className="space-y-4">
                    {sesiones.map(sesion => (
                        <li key={sesion.id} className="flex justify-between items-start p-4 rounded-lg border bg-muted/20">
                           <div className="flex-1">
                             <div className="flex justify-between items-center mb-2">
                                <p className="font-semibold">{format(sesion.fecha.toDate(), "eeee, dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}</p>
                                <Badge variant={getBadgeVariant(sesion.estado)} className="capitalize">{sesion.estado}</Badge>
                             </div>
                             <div className="text-sm text-muted-foreground space-y-1">
                                <p><strong className="font-medium text-foreground">Modalidad:</strong> <span className="capitalize">{sesion.modalidad}</span></p>
                                {sesion.ubicacion && <p><strong className="font-medium text-foreground">Ubicación:</strong> {sesion.ubicacion}</p>}
                                {sesion.nota && <p><strong className="font-medium text-foreground">Nota Previa:</strong> {sesion.nota}</p>}
                                {sesion.estado === 'completada' && sesion.notasTerapeuta && (
                                    <div className="pt-2 mt-2 border-t">
                                        <p className="font-semibold text-foreground">Notas de Progreso:</p>
                                        <p className="whitespace-pre-wrap">{sesion.notasTerapeuta}</p>
                                        <div className="flex gap-4 mt-1 text-xs">
                                            <span>Dolor Inicial: {sesion.dolorInicial}/10</span>
                                            <span>Dolor Final: {sesion.dolorFinal}/10</span>
                                        </div>
                                    </div>
                                )}
                             </div>
                           </div>
                           {sesion.estado === 'agendada' && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="ml-4 self-center"><MoreHorizontal className="h-4 w-4"/></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => {setSelectedSesion(sesion); setIsProgresoModalOpen(true);}}><CheckCircle className="mr-2 h-4 w-4" />Marcar como Completada</DropdownMenuItem>
                                    <DropdownMenuItem disabled><Clock className="mr-2 h-4 w-4" />Reagendar</DropdownMenuItem>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                           <DropdownMenuItem onSelect={(e) => e.preventDefault()}><XCircle className="mr-2 h-4 w-4" />Cancelar Sesión</DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. La sesión se marcará como cancelada.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cerrar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => onCancelarSesion(sesion.id)} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Confirmar Cancelación</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                           )}
                        </li>
                    ))}
                </ul>
            ) : (
                 <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg"><p>No hay sesiones agendadas para este paciente.</p></div>
            )}
        </CardContent>
      </Card>
      
      {/* Modal para registrar progreso */}
      <Dialog open={isProgresoModalOpen} onOpenChange={setIsProgresoModalOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Registrar Progreso de la Sesión</DialogTitle></DialogHeader>
            <Form {...progresoForm}>
                <form onSubmit={progresoForm.handleSubmit(onCompletarSesion)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={progresoForm.control} name="dolorInicial" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dolor inicial (0-10)</FormLabel>
                                <FormControl>
                                    <>
                                     <Slider defaultValue={[5]} max={10} step={1} onValueChange={(value) => field.onChange(value[0])} />
                                     <p className="text-center font-bold text-lg">{field.value}</p>
                                    </>
                                </FormControl>
                            </FormItem>
                        )}/>
                        <FormField control={progresoForm.control} name="dolorFinal" render={({ field }) => (
                             <FormItem>
                                <FormLabel>Dolor final (0-10)</FormLabel>
                                <FormControl>
                                    <>
                                     <Slider defaultValue={[5]} max={10} step={1} onValueChange={(value) => field.onChange(value[0])} />
                                     <p className="text-center font-bold text-lg">{field.value}</p>
                                    </>
                                </FormControl>
                            </FormItem>
                        )}/>
                    </div>
                    <FormField control={progresoForm.control} name="notasTerapeuta" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notas de progreso</FormLabel>
                            <FormControl><Textarea placeholder="Observaciones, recomendaciones, ejercicios realizados..." {...field} className="min-h-[120px]" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cerrar</Button></DialogClose>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Progreso</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
