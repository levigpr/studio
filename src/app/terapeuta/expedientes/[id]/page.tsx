
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, getDocs, collection, query, where, addDoc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Expediente, UserProfile, Sesion, Avance } from "@/types";
import { useAuth } from "@/context/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, User, Calendar, PlusCircle, Loader2, Calendar as CalendarIcon, MoreHorizontal, CheckCircle, XCircle, Clock, Smile, Activity, Sparkles, AlertCircle, ClipboardCheck, Target, Forward, Frown, Meh, HeartPulse, Phone, ClipboardList, Pill, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateProgressSummary, type ProgressSummaryOutput } from "@/ai/flows/generate-progress-summary";


const sesionFormSchema = z.object({
  fecha: z.date({
    required_error: "La fecha es requerida.",
  }),
  modalidad: z.enum(["presencial", "virtual"], {
    required_error: "Debes seleccionar una modalidad."
  }),
  ubicacion: z.string().optional(),
  nota: z.string().optional(),
}).refine(data => data.modalidad === 'virtual' || (data.modalidad === 'presencial' && data.ubicacion && data.ubicacion.length > 0), {
    message: "La ubicación es requerida para sesiones presenciales.",
    path: ["ubicacion"],
});

const expedienteFormSchema = z.object({
  diagnostico: z.string().min(1, "El diagnóstico no puede estar vacío.").optional().or(z.literal('')),
  objetivos: z.string().min(1, "Los objetivos no pueden estar vacíos.").optional().or(z.literal('')),
  planTratamiento: z.string().min(1, "El plan de tratamiento no puede estar vacío.").optional().or(z.literal('')),
});


const progresoFormSchema = z.object({
    dolorInicial: z.number().min(0).max(10),
    dolorFinal: z.number().min(0).max(10),
    progresoPercibido: z.enum(['mejoria-significativa', 'mejoria-leve', 'sin-cambios', 'retroceso-leve', 'retroceso-significativo']).optional(),
    estadoAnimoObservado: z.enum(['motivado', 'relajado', 'ansioso', 'frustrado', 'estresado', 'optimista']).optional(),
    observacionesObjetivas: z.string().optional(),
    tecnicasAplicadas: z.string().optional(),
    planProximaSesion: z.string().optional(),
    notasTerapeuta: z.string().optional().or(z.literal('')),
});

function InfoItem({ label, value, icon }: { label: string; value?: string; icon: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {icon}
        {label}
      </h4>
      <p className="pl-6 text-base whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export default function ExpedienteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const expedienteId = params.id as string;
  
  const [expediente, setExpediente] = useState<Expediente | null>(null);
  const [paciente, setPaciente] = useState<UserProfile | null>(null);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [avances, setAvances] = useState<Avance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSesion, setSelectedSesion] = useState<Sesion | null>(null);
  const [isProgresoModalOpen, setIsProgresoModalOpen] = useState(false);
  const [isExpedienteModalOpen, setIsExpedienteModalOpen] = useState(false);

  // State for AI analysis
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<ProgressSummaryOutput | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const sesionForm = useForm<z.infer<typeof sesionFormSchema>>({
    resolver: zodResolver(sesionFormSchema),
    defaultValues: {
      modalidad: "presencial",
      nota: "",
      ubicacion: "",
    }
  });
  
  const expedienteForm = useForm<z.infer<typeof expedienteFormSchema>>({
      resolver: zodResolver(expedienteFormSchema),
      defaultValues: {
          diagnostico: "",
          objetivos: "",
          planTratamiento: "",
      }
  });

  const progresoForm = useForm<z.infer<typeof progresoFormSchema>>({
    resolver: zodResolver(progresoFormSchema),
    defaultValues: {
        dolorInicial: 5,
        dolorFinal: 5,
        notasTerapeuta: "",
        progresoPercibido: undefined,
        estadoAnimoObservado: undefined,
        observacionesObjetivas: "",
        tecnicasAplicadas: "",
        planProximaSesion: "",
    }
  });

  const modalidad = sesionForm.watch("modalidad");
  
  const fetchExpedienteData = async () => {
    if (!expedienteId || !user) return;
    try {
        const expedienteDocRef = doc(db, "expedientes", expedienteId);
        const expedienteDocSnap = await getDoc(expedienteDocRef);
        
        if (expedienteDocSnap.exists()) {
          const expData = { id: expedienteDocSnap.id, ...expedienteDocSnap.data() } as Expediente;
          if (expData.terapeutaUid !== user.uid) {
             toast({ title: "Acceso denegado", description: "No tienes permiso para ver este expediente.", variant: "destructive" });
             router.push('/terapeuta/expedientes');
             return;
          }
          setExpediente(expData);
          expedienteForm.reset({
              diagnostico: expData.diagnostico || "",
              objetivos: expData.objetivos || "",
              planTratamiento: expData.planTratamiento || "",
          });

          if (!paciente) {
              const pacienteDocRef = doc(db, "usuarios", expData.pacienteUid);
              const pacienteDocSnap = await getDoc(pacienteDocRef);
              if (pacienteDocSnap.exists()) {
                setPaciente({ uid: pacienteDocSnap.id, ...pacienteDocSnap.data() } as UserProfile);
              }
          }

          await fetchRelatedData(expedienteId, expData.terapeutaUid, expData.pacienteUid);
        } else {
          toast({ title: "Error", description: "Expediente no encontrado.", variant: "destructive" });
          router.push('/terapeuta/expedientes');
        }
    } catch(error) {
        console.error("Error fetching main data:", error);
        toast({ title: "Error", description: "No se pudieron cargar los datos del expediente.", variant: "destructive" });
    }
  }


  const fetchRelatedData = async (currentExpedienteId: string, terapeutaUid?: string, pacienteUid?: string) => {
      if (!currentExpedienteId || !terapeutaUid || !pacienteUid) return;
      try {
        // Fetch Sesiones
        const sesionesQuery = query(collection(db, "sesiones"), where("expedienteId", "==", currentExpedienteId));
        const sesionesSnapshot = await getDocs(sesionesQuery);
        let sesionesList = sesionesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sesion));
        sesionesList.sort((a, b) => b.fecha.toMillis() - a.fecha.toMillis());
        setSesiones(sesionesList);

        // Fetch Avances
        const avancesQuery = query(collection(db, "avances"), where("expedienteId", "==", currentExpedienteId));
        const avancesSnapshot = await getDocs(avancesQuery);
        let avancesList = avancesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Avance));
        avancesList.sort((a, b) => {
            if (a.fechaRegistro && b.fechaRegistro) {
                return b.fechaRegistro.toMillis() - a.fechaRegistro.toMillis();
            }
            return 0;
        });
        setAvances(avancesList);

      } catch (error) {
          console.error("Error fetching related data:", error);
          toast({ title: "Error", description: "No se pudieron cargar las sesiones o avances.", variant: "destructive" });
      }
  }

  useEffect(() => {
    async function initialLoad() {
        setLoading(true);
        await fetchExpedienteData();
        setLoading(false);
    }
    initialLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expedienteId, user, router, toast]);

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

      await fetchRelatedData(expedienteId, expediente.terapeutaUid, expediente.pacienteUid);
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
            progresoPercibido: values.progresoPercibido || null,
            estadoAnimoObservado: values.estadoAnimoObservado || null,
            observacionesObjetivas: values.observacionesObjetivas || "",
            tecnicasAplicadas: values.tecnicasAplicadas || "",
            planProximaSesion: values.planProximaSesion || "",
            notasTerapeuta: values.notasTerapeuta,
        });
        await fetchRelatedData(expedienteId, expediente?.terapeutaUid, expediente?.pacienteUid);
        toast({ title: "Éxito", description: "La sesión ha sido marcada como completada." });
        setIsProgresoModalOpen(false);
        progresoForm.reset();
        setSelectedSesion(null);
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
        await fetchRelatedData(expedienteId, expediente?.terapeutaUid, expediente?.pacienteUid);
        toast({ title: "Éxito", description: "La sesión ha sido cancelada." });
    } catch (error) {
        toast({ title: "Error", description: "No se pudo cancelar la sesión.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  async function handleAiAnalysis(avance: Avance) {
    setIsAiLoading(true);
    setAiSummary(null);
    setIsAiModalOpen(true);
    try {
      // Ensure date objects are converted to strings for serialization
      const serializableAvance = JSON.parse(JSON.stringify(avance, (key, value) => {
          if (value && typeof value === 'object' && value.seconds !== undefined) {
              return new Date(value.seconds * 1000).toISOString();
          }
          return value;
      }));

      const summary = await generateProgressSummary({ avance: serializableAvance });
      setAiSummary(summary);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      toast({ title: "Error de IA", description: "No se pudo generar el análisis.", variant: "destructive" });
      setIsAiModalOpen(false);
    } finally {
      setIsAiLoading(false);
    }
  }
  
  async function onGuardarExpediente(values: z.infer<typeof expedienteFormSchema>) {
    if (!expediente) return;
    setIsSubmitting(true);
    try {
        const expedienteRef = doc(db, "expedientes", expediente.id);
        await updateDoc(expedienteRef, {
            diagnostico: values.diagnostico || "",
            objetivos: values.objetivos || "",
            planTratamiento: values.planTratamiento || "",
        });
        await fetchExpedienteData();
        toast({ title: "Éxito", description: "El expediente ha sido actualizado." });
        setIsExpedienteModalOpen(false);
    } catch (error) {
        console.error("Error updating expediente:", error);
        toast({ title: "Error", description: "No se pudo actualizar el expediente.", variant: "destructive" });
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

  const getMoodIcon = (mood?: Avance['estadoAnimo'] | Sesion['estadoAnimoObservado']) => {
    switch (mood) {
        case 'muy-bien': return <Smile className="text-green-500" />;
        case 'bien': return <Smile className="text-lime-500" />;
        case 'regular': return <Meh className="text-yellow-500" />;
        case 'mal': return <Frown className="text-orange-500" />;
        case 'muy-mal': return <Frown className="text-red-500" />;
        case 'motivado':
        case 'optimista':
        case 'relajado':
            return <Smile className="text-green-500" />;
        case 'ansioso':
        case 'frustrado':
        case 'estresado':
            return <Frown className="text-orange-500" />;
        default: return <Meh />;
    }
  }
  
  const progresoLabels: Record<NonNullable<Sesion['progresoPercibido']>, string> = {
    'mejoria-significativa': 'Mejoría Significativa',
    'mejoria-leve': 'Mejoría Leve',
    'sin-cambios': 'Sin Cambios',
    'retroceso-leve': 'Retroceso Leve',
    'retroceso-significativo': 'Retroceso Significativo'
  };

  const estadoAnimoLabels: Record<NonNullable<Sesion['estadoAnimoObservado']>, string> = {
    motivado: 'Motivado',
    relajado: 'Relajado',
    ansioso: 'Ansioso',
    frustrado: 'Frustrado',
    estresado: 'Estresado',
    optimista: 'Optimista'
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
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Evaluación Clínica</CardTitle>
             <Dialog open={isExpedienteModalOpen} onOpenChange={setIsExpedienteModalOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" />Editar</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Evaluación Clínica</DialogTitle>
                        <DialogDescription>Actualiza el diagnóstico, los objetivos y el plan de tratamiento del paciente.</DialogDescription>
                    </DialogHeader>
                    <Form {...expedienteForm}>
                        <form onSubmit={expedienteForm.handleSubmit(onGuardarExpediente)} className="space-y-4">
                            <FormField
                                control={expedienteForm.control}
                                name="diagnostico"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Diagnóstico Fisioterapéutico</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Describe el diagnóstico principal del paciente." className="min-h-[100px]" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={expedienteForm.control}
                                name="objetivos"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Objetivos del Tratamiento</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Define los objetivos a corto y largo plazo." className="min-h-[100px]" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={expedienteForm.control}
                                name="planTratamiento"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Plan de Tratamiento Inicial</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Describe las intervenciones y estrategias planeadas." className="min-h-[100px]" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="ghost">Cancelar</Button>
                                </DialogClose>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar Cambios
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
            <InfoItem label="Diagnóstico Fisioterapéutico" value={expediente.diagnostico || "No especificado."} icon={<ClipboardCheck />} />
            <InfoItem label="Objetivos del Tratamiento" value={expediente.objetivos || "No especificado."} icon={<Target />} />
            <InfoItem label="Plan de Tratamiento Inicial" value={expediente.planTratamiento || "No especificado."} icon={<Forward />} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Información General del Paciente</CardTitle></CardHeader>
        <CardContent className="space-y-4">
            <InfoItem label="Contacto de Emergencia" value={paciente.informacionMedica?.contactoEmergencia?.nombre} icon={<AlertCircle />} />
            <InfoItem label="Teléfono de Emergencia" value={paciente.informacionMedica?.contactoEmergencia?.telefono} icon={<Phone />} />
            <InfoItem label="Historial Médico Relevante" value={paciente.informacionMedica?.historialMedico} icon={<ClipboardList />} />
            <InfoItem label="Alergias" value={paciente.informacionMedica?.alergias} icon={<AlertCircle />} />
            <InfoItem label="Medicamentos Actuales" value={paciente.informacionMedica?.medicamentos} icon={<Pill />} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Calendar/>Historial del Paciente</CardTitle>
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
            <Tabs defaultValue="sesiones">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="sesiones"><Calendar className="mr-2 h-4 w-4"/>Sesiones Clínicas</TabsTrigger>
                    <TabsTrigger value="avances"><Activity className="mr-2 h-4 w-4"/>Auto-reportes del Paciente</TabsTrigger>
                </TabsList>
                <TabsContent value="sesiones" className="mt-4">
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
                                        {sesion.estado === 'completada' && (
                                            <div className="pt-2 mt-2 border-t space-y-3">
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 mt-1 text-xs">
                                                    <span>Dolor Inicial: {sesion.dolorInicial ?? 'N/A'}/10</span>
                                                    <span>Dolor Final: {sesion.dolorFinal ?? 'N/A'}/10</span>
                                                    {sesion.progresoPercibido && <span>Progreso: {progresoLabels[sesion.progresoPercibido]}</span>}
                                                    {sesion.estadoAnimoObservado && <span className="flex items-center gap-1">Ánimo: <span className="capitalize">{estadoAnimoLabels[sesion.estadoAnimoObservado]}</span> {getMoodIcon(sesion.estadoAnimoObservado)}</span>}
                                                </div>
                                                {sesion.observacionesObjetivas && <div><p className="font-semibold text-foreground">Observaciones Objetivas:</p><p className="whitespace-pre-wrap">{sesion.observacionesObjetivas}</p></div>}
                                                {sesion.tecnicasAplicadas && <div><p className="font-semibold text-foreground">Técnicas Aplicadas:</p><p className="whitespace-pre-wrap">{sesion.tecnicasAplicadas}</p></div>}
                                                {sesion.planProximaSesion && <div><p className="font-semibold text-foreground">Plan Próxima Sesión:</p><p className="whitespace-pre-wrap">{sesion.planProximaSesion}</p></div>}
                                                {sesion.notasTerapeuta && <div><p className="font-semibold text-foreground">Notas Generales:</p><p className="whitespace-pre-wrap">{sesion.notasTerapeuta}</p></div>}
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
                                            <DropdownMenuItem onClick={() => {
                                                setSelectedSesion(sesion); 
                                                progresoForm.reset({
                                                    dolorInicial: sesion.dolorInicial ?? 5,
                                                    dolorFinal: sesion.dolorFinal ?? 5,
                                                    notasTerapeuta: sesion.notasTerapeuta ?? "",
                                                    progresoPercibido: sesion.progresoPercibido ?? undefined,
                                                    estadoAnimoObservado: sesion.estadoAnimoObservado ?? undefined,
                                                    observacionesObjetivas: sesion.observacionesObjetivas ?? "",
                                                    tecnicasAplicadas: sesion.tecnicasAplicadas ?? "",
                                                    planProximaSesion: sesion.planProximaSesion ?? "",
                                                });
                                                setIsProgresoModalOpen(true);
                                            }}><CheckCircle className="mr-2 h-4 w-4" />Marcar como Completada</DropdownMenuItem>
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
                </TabsContent>
                <TabsContent value="avances" className="mt-4">
                     {avances.length > 0 ? (
                        <ul className="space-y-4">
                            {avances.map(avance => (
                                <li key={avance.id} className="p-4 rounded-lg border bg-muted/20">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="font-semibold">{avance.fechaRegistro ? format(avance.fechaRegistro.toDate(), "eeee, dd 'de' MMMM, yyyy", { locale: es }) : "Fecha no disponible"}</p>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                {getMoodIcon(avance.estadoAnimo)}
                                                <span className="capitalize">{avance.estadoAnimo?.replace('-', ' ')}</span>
                                            </div>
                                            <Button size="sm" variant="outline" onClick={() => handleAiAnalysis(avance)} disabled={isAiLoading}>
                                                <Sparkles className="mr-2 h-4 w-4"/>
                                                Analizar Avance
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                                        <div className="space-y-1">
                                            <p className="font-medium">Dolor</p>
                                            <p className="text-muted-foreground">Inicio: {avance.dolorInicial}/10, Final: {avance.dolorFinal}/10 en "{avance.ubicacionDolor}"</p>
                                        </div>
                                         <div className="space-y-1">
                                            <p className="font-medium">Adherencia</p>
                                            <p className="text-muted-foreground">{avance.diasEjercicio}/7 días de ejercicio. Dificultad: {avance.ejerciciosDificiles || "Ninguna"}</p>
                                        </div>
                                         <div className="space-y-1">
                                            <p className="font-medium">Movilidad y Fatiga</p>
                                            <p className="text-muted-foreground">Movilidad: "{avance.movilidadPercibida}". Fatiga: {avance.fatiga}/10</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium">Motivación</p>
                                            <p className="text-muted-foreground">{avance.motivacion}/10</p>
                                        </div>
                                        {avance.comentarioPaciente && (
                                            <div className="space-y-1 md:col-span-2">
                                                <p className="font-medium">Comentario Adicional</p>
                                                <p className="text-muted-foreground whitespace-pre-wrap">{avance.comentarioPaciente}</p>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg"><p>El paciente aún no ha registrado ningún auto-reporte.</p></div>
                    )}
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
      
      {/* Modal para registrar progreso de sesión */}
      <Dialog open={isProgresoModalOpen} onOpenChange={setIsProgresoModalOpen}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader><DialogTitle>Registrar Progreso de la Sesión</DialogTitle><DialogDescription>Añade los detalles clínicos observados durante la sesión.</DialogDescription></DialogHeader>
            <Form {...progresoForm}>
                <form onSubmit={progresoForm.handleSubmit(onCompletarSesion)} className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={progresoForm.control} name="dolorInicial" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dolor inicial del paciente (0-10)</FormLabel>
                                <FormControl>
                                    <div>
                                     <Slider value={[field.value]} max={10} step={1} onValueChange={(value) => field.onChange(value[0])} />
                                     <p className="text-center font-bold text-lg">{field.value}</p>
                                    </div>
                                </FormControl>
                            </FormItem>
                        )}/>
                        <FormField control={progresoForm.control} name="dolorFinal" render={({ field }) => (
                             <FormItem>
                                <FormLabel>Dolor final del paciente (0-10)</FormLabel>
                                <FormControl>
                                    <div>
                                     <Slider value={[field.value]} max={10} step={1} onValueChange={(value) => field.onChange(value[0])} />
                                     <p className="text-center font-bold text-lg">{field.value}</p>
                                    </div>
                                </FormControl>
                            </FormItem>
                        )}/>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={progresoForm.control} name="progresoPercibido" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Progreso Percibido</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona el progreso..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="mejoria-significativa">Mejoría Significativa</SelectItem>
                                        <SelectItem value="mejoria-leve">Mejoría Leve</SelectItem>
                                        <SelectItem value="sin-cambios">Sin Cambios</SelectItem>
                                        <SelectItem value="retroceso-leve">Retroceso Leve</SelectItem>
                                        <SelectItem value="retroceso-significativo">Retroceso Significativo</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={progresoForm.control} name="estadoAnimoObservado" render={({ field }) => (
                           <FormItem>
                                <FormLabel>Estado de Ánimo Observado</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona el estado de ánimo..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="motivado">Motivado</SelectItem>
                                        <SelectItem value="relajado">Relajado</SelectItem>
                                        <SelectItem value="optimista">Optimista</SelectItem>
                                        <SelectItem value="ansioso">Ansioso</SelectItem>
                                        <SelectItem value="frustrado">Frustrado</SelectItem>
                                        <SelectItem value="estresado">Estresado</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    </div>

                    <FormField control={progresoForm.control} name="observacionesObjetivas" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2"><ClipboardCheck/>Observaciones Objetivas</FormLabel>
                            <FormControl><Textarea placeholder="Ej: Mejora en el rango de movimiento de la rodilla, pero persiste debilidad en el vasto medial..." {...field} className="min-h-[100px]" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={progresoForm.control} name="tecnicasAplicadas" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2"><Target/>Técnicas Aplicadas</FormLabel>
                            <FormControl><Textarea placeholder="Ej: Terapia manual en lumbares, ejercicios de fortalecimiento, electroterapia..." {...field} className="min-h-[100px]" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={progresoForm.control} name="planProximaSesion" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2"><Forward/>Plan para Próxima Sesión</FormLabel>
                            <FormControl><Textarea placeholder="Ej: Re-evaluar fuerza, introducir ejercicios de propiocepción..." {...field} className="min-h-[100px]" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={progresoForm.control} name="notasTerapeuta" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notas Generales Adicionales</FormLabel>
                            <FormControl><Textarea placeholder="Cualquier otra observación, comentario del paciente, etc." {...field} className="min-h-[100px]" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <DialogFooter className="pt-4 pr-4">
                        <DialogClose asChild><Button type="button" variant="ghost">Cerrar</Button></DialogClose>
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Guardar Progreso</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>

      {/* Modal para análisis IA */}
       <AlertDialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary"/>
                        Análisis del Avance con IA
                    </AlertDialogTitle>
                </AlertDialogHeader>
                {isAiLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    aiSummary && (
                        <div>
                           <CardDescription>Este es un resumen generado por IA para ayudarte a identificar rápidamente los puntos clave del reporte del paciente.</CardDescription>
                           <div className="mt-4 space-y-4 text-sm">
                                <div>
                                    <h4 className="font-semibold">Resumen General</h4>
                                    <p className="text-muted-foreground">{aiSummary.resumen}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Puntos Clave a Notar</h4>
                                    <ul className="list-disc list-inside text-muted-foreground space-y-1">
                                        {aiSummary.puntosClave.map((punto, index) => (
                                            <li key={index}>{punto}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-primary/90 flex items-center gap-2"><AlertCircle/>Sugerencia de Acción</h4>
                                    <p className="text-muted-foreground italic">{aiSummary.sugerencia}</p>
                                </div>
                           </div>
                        </div>
                    )
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel>Cerrar</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
