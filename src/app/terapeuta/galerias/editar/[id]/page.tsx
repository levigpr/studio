"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, updateDoc, getDocs, query, where, DocumentData } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { Galeria } from "@/types";
import { Loader2 } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";

const formSchema = z.object({
  pacientesAsignados: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditarGaleriaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const [galeria, setGaleria] = useState<Galeria | null>(null);
  const [pacientes, setPacientes] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const galeriaId = params.id as string;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pacientesAsignados: [],
    },
  });

  useEffect(() => {
    async function fetchData() {
      if (!galeriaId) return;
      setLoading(true);

      try {
        // Fetch gallery data
        const galeriaDoc = await getDoc(doc(db, "galerias", galeriaId));
        if (galeriaDoc.exists()) {
          const galeriaData = { id: galeriaDoc.id, ...galeriaDoc.data() } as Galeria;
          setGaleria(galeriaData);
          form.reset({ pacientesAsignados: galeriaData.pacientesAsignados || [] });
        } else {
          toast({ title: "Error", description: "Galería no encontrada.", variant: "destructive" });
          router.push("/terapeuta");
          return;
        }

        // Fetch patients
        const q = query(collection(db, "usuarios"), where("rol", "==", "paciente"));
        const querySnapshot = await getDocs(q);
        const pacientesList = querySnapshot.docs.map(doc => ({
          value: doc.id,
          label: doc.data().nombre,
        }));
        setPacientes(pacientesList);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [galeriaId, toast, router, form]);

  async function onSubmit(values: FormValues) {
    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const galeriaRef = doc(db, "galerias", galeriaId);
      await updateDoc(galeriaRef, {
        pacientesAsignados: values.pacientesAsignados,
      });
      toast({
        title: "Éxito",
        description: "Pacientes asignados correctamente.",
      });
      router.push("/terapeuta");
    } catch (error) {
      console.error("Error updating gallery: ", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la galería.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  if (!galeria) {
    return <p>Galería no encontrada.</p>;
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Editar Galería: {galeria.nombre}</CardTitle>
          <CardDescription>Asigna o modifica los pacientes que pueden ver esta galería.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="pacientesAsignados"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asignar a Pacientes</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={pacientes}
                        selected={field.value}
                        onChange={field.onChange}
                        placeholder={pacientes.length === 0 ? "No hay pacientes disponibles" : "Seleccionar pacientes..."}
                        disabled={pacientes.length === 0 || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
