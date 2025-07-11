"use client"

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/context/auth-context";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/types";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";

const videoSchema = z.object({
  titulo: z.string().min(1, "El título es requerido."),
  youtubeUrl: z.string().url("Debe ser una URL válida de YouTube."),
});

const formSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  descripcion: z.string().min(10, "La descripción debe tener al menos 10 caracteres."),
  videos: z.array(videoSchema).min(1, "Debes añadir al menos un video."),
  pacientesAsignados: z.array(z.string()).min(1, "Debes asignar al menos un paciente."),
});

export default function CrearGaleriaPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [pacientes, setPacientes] = useState<{ value: string; label: string }[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      videos: [{ titulo: "", youtubeUrl: "" }],
      pacientesAsignados: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "videos",
  });

  useEffect(() => {
    async function fetchPacientes() {
      try {
        const q = query(collection(db, "usuarios"), where("rol", "==", "paciente"));
        const querySnapshot = await getDocs(q);
        const pacientesList = querySnapshot.docs.map(doc => ({
          value: doc.id,
          label: doc.data().nombre,
        }));
        setPacientes(pacientesList);
      } catch (error) {
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
      await addDoc(collection(db, "galerias"), {
        ...values,
        creadaPor: user.uid,
        fechaCreacion: serverTimestamp(),
      });
      toast({
        title: "Éxito",
        description: "Galería creada correctamente.",
      });
      router.push("/terapeuta");
    } catch (error) {
      console.error("Error creating gallery: ", error);
      toast({
        title: "Error",
        description: "No se pudo crear la galería.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Crear Nueva Galería de Videos</CardTitle>
          <CardDescription>Crea y asigna galerías de ejercicios a tus pacientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la galería</FormLabel>
                    <FormControl><Input placeholder="Ej: Ejercicios para rodilla" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl><Textarea placeholder="Describe el propósito de esta galería de videos." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <FormLabel>Videos</FormLabel>
                <div className="space-y-4 mt-2">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4 relative">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`videos.${index}.titulo`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Título del Video</FormLabel>
                              <FormControl><Input placeholder="Título descriptivo" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`videos.${index}.youtubeUrl`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>URL de YouTube</FormLabel>
                              <FormControl><Input placeholder="https://www.youtube.com/watch?v=..." {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {fields.length > 1 && (
                         <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
                 <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ titulo: "", youtubeUrl: "" })}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir otro video
                </Button>
                <FormField control={form.control} name="videos" render={() => <FormMessage />} />
              </div>

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
                            placeholder={loadingPacientes ? "Cargando..." : "Seleccionar pacientes..."}
                            disabled={loadingPacientes}
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Galería
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
