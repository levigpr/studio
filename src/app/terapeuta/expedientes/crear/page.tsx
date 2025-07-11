
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/types";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  pacienteUid: z.string().min(1, "Debes seleccionar un paciente."),
  descripcion: z.string().min(5, "La descripción es requerida.").optional().default("Expediente inicial"),
});

export default function CrearExpedientePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [pacientes, setPacientes] = useState<UserProfile[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pacienteUid: "",
      descripcion: "Expediente inicial",
    },
  });

  useEffect(() => {
    async function fetchPacientes() {
      try {
        const q = query(collection(db, "usuarios"), where("rol", "==", "paciente"));
        const querySnapshot = await getDocs(q);
        const pacientesList = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setPacientes(pacientesList);
      } catch (error) {
        console.error("Error fetching patients: ", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los pacientes.",
          variant: "destructive",
        });
      } finally {
        setLoadingPacientes(false);
      }
    }
    fetchPacientes();
  }, [toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "expedientes"), {
        pacienteUid: values.pacienteUid,
        terapeutaUid: user.uid,
        fechaCreacion: serverTimestamp(),
        diagnostico: "", // Campo vacío como se definió
        objetivos: "", // Campo vacío
        planTratamiento: "", // Campo vacío
        descripcion: values.descripcion,
      });
      toast({
        title: "Éxito",
        description: "Expediente creado correctamente.",
      });
      router.push("/terapeuta/expedientes");
    } catch (error) {
      console.error("Error creating document: ", error);
      toast({
        title: "Error",
        description: "No se pudo crear el expediente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Crear Nuevo Expediente</CardTitle>
          <CardDescription>
            Selecciona un paciente de la lista para crear su expediente clínico inicial.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="pacienteUid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paciente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingPacientes}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingPacientes ? "Cargando pacientes..." : "Selecciona un paciente"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pacientes.map(p => (
                          <SelectItem key={p.uid} value={p.uid}>
                            {p.nombre} ({p.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Expediente
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

