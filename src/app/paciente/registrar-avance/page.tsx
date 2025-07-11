
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Smile, Meh, Frown, ChevronsRight, HeartPulse, ShieldCheck, Dumbbell, UserCheck, Star } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Expediente } from "@/types";

const avanceSchema = z.object({
  // Dolor
  dolorInicial: z.number().min(0).max(10),
  dolorFinal: z.number().min(0).max(10),
  ubicacionDolor: z.string().min(3, { message: "Describe brevemente dónde sientes dolor." }),
  
  // Adherencia
  ejerciciosRealizados: z.string().min(3, { message: "Describe qué ejercicios hiciste." }),
  diasEjercicio: z.number().min(0).max(7),
  ejerciciosDificiles: z.string().optional(),
  
  // Funcionalidad
  movilidadPercibida: z.string().min(3, { message: "Describe cómo sientes tu movilidad." }),
  fatiga: z.number().min(0).max(10),
  limitacionesFuncionales: z.string().optional(),

  // Emocional
  estadoAnimo: z.enum(['muy-bien', 'bien', 'regular', 'mal', 'muy-mal'], { required_error: "Selecciona tu estado de ánimo." }),
  motivacion: z.number().min(0).max(10),
  comentarioPaciente: z.string().optional(),
});

export default function RegistrarAvancePage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expediente, setExpediente] = useState<Expediente | null>(null);

  const form = useForm<z.infer<typeof avanceSchema>>({
    resolver: zodResolver(avanceSchema),
    defaultValues: {
      dolorInicial: 5,
      dolorFinal: 5,
      ubicacionDolor: "",
      ejerciciosRealizados: "",
      diasEjercicio: 3,
      movilidadPercibida: "",
      fatiga: 5,
      motivacion: 5,
    },
  });

  useEffect(() => {
    async function fetchExpediente() {
        if (!user) return;
        const q = query(collection(db, "expedientes"), where("pacienteUid", "==", user.uid));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            setExpediente({ id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Expediente);
        } else {
             toast({ title: "Error", description: "No tienes un expediente activo.", variant: "destructive" });
             router.push('/paciente');
        }
    }
    fetchExpediente();
  }, [user, toast, router]);

  async function onSubmit(values: z.infer<typeof avanceSchema>) {
    if (!user || !userProfile || !expediente) {
      toast({ title: "Error", description: "No se pudo enviar el registro.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "avances"), {
        ...values,
        pacienteUid: user.uid,
        terapeutaUid: expediente.terapeutaUid,
        expedienteId: expediente.id,
        fechaRegistro: serverTimestamp(),
        registradoPor: user.uid,
        tipoRegistro: "auto",
      });
      toast({ title: "Éxito", description: "Tu avance ha sido registrado." });
      router.push("/paciente");
    } catch (error) {
      console.error("Error creating document: ", error);
      toast({ title: "Error", description: "No se pudo registrar tu avance.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-3xl py-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Registrar mi Avance Diario</CardTitle>
          <CardDescription>Tu terapeuta usará esta información para ajustar tu plan de tratamiento. ¡Sé honesto!</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              
              {/* Sección Dolor */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold flex items-center gap-2 border-b pb-2"><HeartPulse/> Tracking del Dolor</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="dolorInicial" render={({ field }) => ( <FormItem><FormLabel>Dolor al iniciar el día (0-10)</FormLabel><FormControl><><Slider defaultValue={[5]} max={10} step={1} onValueChange={(v) => field.onChange(v[0])} /><p className="text-center font-bold text-lg">{field.value}</p></></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="dolorFinal" render={({ field }) => ( <FormItem><FormLabel>Dolor al finalizar el día (0-10)</FormLabel><FormControl><><Slider defaultValue={[5]} max={10} step={1} onValueChange={(v) => field.onChange(v[0])} /><p className="text-center font-bold text-lg">{field.value}</p></></FormControl><FormMessage /></FormItem> )}/>
                </div>
                <FormField control={form.control} name="ubicacionDolor" render={({ field }) => ( <FormItem><FormLabel>¿Dónde sientes el dolor principalmente?</FormLabel><FormControl><Input placeholder="Ej: Rodilla derecha, parte baja de la espalda..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>

              {/* Sección Adherencia */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold flex items-center gap-2 border-b pb-2"><Dumbbell/> Adherencia al Tratamiento</h3>
                <FormField control={form.control} name="diasEjercicio" render={({ field }) => ( <FormItem><FormLabel>¿Cuántos días hiciste tus ejercicios esta semana?</FormLabel><FormControl><><Slider defaultValue={[3]} max={7} step={1} onValueChange={(v) => field.onChange(v[0])} /><p className="text-center font-bold text-lg">{field.value} días</p></></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="ejerciciosRealizados" render={({ field }) => ( <FormItem><FormLabel>¿Qué ejercicios de tu plan realizaste?</FormLabel><FormControl><Textarea placeholder="Ej: Estiramientos de isquiotibiales, sentadillas..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="ejerciciosDificiles" render={({ field }) => ( <FormItem><FormLabel>¿Hubo algún ejercicio que te costó más de lo normal? (Opcional)</FormLabel><FormControl><Textarea placeholder="Ej: Las planchas laterales fueron muy difíciles hoy." {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>

              {/* Sección Funcionalidad y Movilidad */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold flex items-center gap-2 border-b pb-2"><ChevronsRight/> Funcionalidad y Movilidad</h3>
                <FormField control={form.control} name="movilidadPercibida" render={({ field }) => ( <FormItem><FormLabel>Describe tu movilidad hoy</FormLabel><FormControl><Input placeholder="Ej: Me sentí más flexible, o, me costó agacharme" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="fatiga" render={({ field }) => ( <FormItem><FormLabel>Nivel de fatiga general (0-10)</FormLabel><FormControl><><Slider defaultValue={[5]} max={10} step={1} onValueChange={(v) => field.onChange(v[0])} /><p className="text-center font-bold text-lg">{field.value}</p></></FormControl><FormMessage /></FormItem> )}/>
                <FormField control={form.control} name="limitacionesFuncionales" render={({ field }) => ( <FormItem><FormLabel>¿Tuviste alguna limitación para tus actividades diarias? (Opcional)</FormLabel><FormControl><Textarea placeholder="Ej: No pude cargar las compras, me dolió al estar sentado mucho tiempo..." {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>

              {/* Sección Emocional */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold flex items-center gap-2 border-b pb-2"><Smile/> Estado Emocional y Motivación</h3>
                <FormField control={form.control} name="estadoAnimo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Cómo te sientes de ánimo hoy?</FormLabel>
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-wrap gap-4 pt-2">
                            <FormItem><FormControl><RadioGroupItem value="muy-bien" id="r1" className="sr-only" /></FormControl><FormLabel htmlFor="r1" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Smile size={24}/>Muy Bien</FormLabel></FormItem>
                            <FormItem><FormControl><RadioGroupItem value="bien" id="r2" className="sr-only" /></FormControl><FormLabel htmlFor="r2" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Smile size={24}/>Bien</FormLabel></FormItem>
                            <FormItem><FormControl><RadioGroupItem value="regular" id="r3" className="sr-only" /></FormControl><FormLabel htmlFor="r3" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Meh size={24}/>Regular</FormLabel></FormItem>
                            <FormItem><FormControl><RadioGroupItem value="mal" id="r4" className="sr-only" /></FormControl><FormLabel htmlFor="r4" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Frown size={24}/>Mal</FormLabel></FormItem>
                            <FormItem><FormControl><RadioGroupItem value="muy-mal" id="r5" className="sr-only" /></FormControl><FormLabel htmlFor="r5" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Frown size={24}/>Muy Mal</FormLabel></FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage/>
                  </FormItem>
                )}/>
                 <FormField control={form.control} name="motivacion" render={({ field }) => ( <FormItem><FormLabel>¿Qué tan motivado te sientes para continuar? (0-10)</FormLabel><FormControl><><Slider defaultValue={[5]} max={10} step={1} onValueChange={(v) => field.onChange(v[0])} /><p className="text-center font-bold text-lg">{field.value}</p></></FormControl><FormMessage /></FormItem> )}/>
                 <FormField control={form.control} name="comentarioPaciente" render={({ field }) => ( <FormItem><FormLabel>¿Algo más que quieras compartir con tu terapeuta? (Opcional)</FormLabel><FormControl><Textarea placeholder="Cualquier otro detalle es útil." {...field} /></FormControl><FormMessage /></FormItem> )}/>
              </div>

              <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Enviar mi Registro de Avance
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}