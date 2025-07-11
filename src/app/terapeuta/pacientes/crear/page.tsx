
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const functions = getFunctions(auth.app);
const createUser = httpsCallable(functions, 'createUser');

// Para el terapeuta, la contraseña no es necesaria, la función de nube no la pedirá
// si el que llama es un terapeuta. El paciente establecerá su contraseña después.
const formSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Por favor, introduce un email válido."),
  // Campos adicionales para el perfil del paciente
  contactoEmergenciaNombre: z.string().optional(),
  contactoEmergenciaTelefono: z.string().optional(),
  historialMedico: z.string().optional(),
  alergias: z.string().optional(),
  medicamentos: z.string().optional(),
});


export default function CrearPacientePage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      email: "",
      contactoEmergenciaNombre: "",
      contactoEmergenciaTelefono: "",
      historialMedico: "",
      alergias: "",
      medicamentos: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    try {
        await createUser({
            nombre: values.nombre,
            email: values.email,
            rol: "paciente", // Rol es siempre paciente desde este formulario
            informacionMedica: {
                contactoEmergenciaNombre: values.contactoEmergenciaNombre,
                contactoEmergenciaTelefono: values.contactoEmergenciaTelefono,
                historialMedico: values.historialMedico,
                alergias: values.alergias,
                medicamentos: values.medicamentos,
            },
        });
        toast({
            title: "Usuario creado",
            description: "El nuevo paciente ha sido registrado. Deberá usar la función 'olvidé mi contraseña' para establecer una.",
        });
        router.push('/terapeuta/pacientes');
    } catch (error: any) {
        console.error(error);
        toast({
            title: "Error al crear usuario",
            description: error.message || "No se pudo crear el perfil del paciente.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <main className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Añadir Nuevo Paciente</CardTitle>
          <CardDescription>
            Registra los datos del nuevo paciente. El paciente recibirá un email para configurar su contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del paciente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="paciente@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold text-center">Información Médica Adicional (Opcional)</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactoEmergenciaNombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contacto de emergencia</FormLabel>
                          <FormControl><Input placeholder="Nombre" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactoEmergenciaTelefono"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono de emergencia</FormLabel>
                          <FormControl><Input placeholder="Número de teléfono" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="historialMedico"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Historial Médico Relevante</FormLabel>
                        <FormControl><Textarea placeholder="Cirugías previas, condiciones crónicas, etc." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="alergias"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alergias</FormLabel>
                        <FormControl><Textarea placeholder="Medicamentos, alimentos, etc." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="medicamentos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medicamentos Actuales</FormLabel>
                        <FormControl><Textarea placeholder="Nombre del medicamento, dosis, frecuencia..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Añadir Paciente
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
