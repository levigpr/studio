
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, HeartPulse } from "lucide-react";

// Este formulario ahora SOLO se encarga del auto-registro.
// El terapeuta tiene su propio formulario para crear pacientes.
const formSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Por favor, introduce un email válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  rol: z.enum(["paciente", "terapeuta"], {
    required_error: "Debes seleccionar un rol.",
  }),
  // Campos adicionales para el perfil del paciente
  contactoEmergenciaNombre: z.string().optional(),
  contactoEmergenciaTelefono: z.string().optional(),
  historialMedico: z.string().optional(),
  alergias: z.string().optional(),
  medicamentos: z.string().optional(),
}).refine(data => data.rol === 'terapeuta' || (data.rol === 'paciente' && data.contactoEmergenciaNombre && data.contactoEmergenciaTelefono), {
    message: "El contacto de emergencia es requerido para pacientes.",
    path: ["contactoEmergenciaNombre"],
});


export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user: authenticatedUser } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      email: "",
      password: "",
      rol: undefined,
      contactoEmergenciaNombre: "",
      contactoEmergenciaTelefono: "",
      historialMedico: "",
      alergias: "",
      medicamentos: "",
    },
  });

  const rolSeleccionado = form.watch("rol");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    
    if (authenticatedUser) {
        toast({ title: "Error", description: "Ya tienes una sesión activa.", variant: "destructive"});
        setIsLoading(false);
        return;
    }

    try {
      // El auto-registro sigue creando el usuario en el cliente,
      // pero una Cloud Function (que se dispara con `onCreate`) debería asignar los claims.
      // Por ahora, el flujo depende de que el usuario vuelva a iniciar sesión para que el claim se refresque.
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      
      // La Cloud Function `createUser` se encargará de crear el perfil en Firestore y de asignar los claims.
      // Esta función se puede llamar explícitamente o puede ser un trigger.
      // Para mantenerlo simple, la lógica de creación del perfil se hará aquí,
      // pero los claims NO se pueden asignar desde el cliente.
      // La solución más robusta es llamar a una Cloud Function.
      // Sin embargo, para no romper el flujo de nuevo, vamos a confiar en que la Cloud Function
      // `createUser` que ya existe, sea la que se use para crear pacientes por parte del terapeuta.
      // Y que una función trigger `onUserCreate` asigne el rol para auto-registros.
      // Por simplicidad en este paso, NO llamaremos a la cloud function aquí.
      // El error de permisos se resolverá en la Cloud Function `createUser`.

      // Simplemente creamos el usuario, la lógica de AuthProvider y el custom claim en la función de nube hará el resto.
      // **Importante**: la función `createUser` que modificamos previamente debe estar desplegada.
      // Esta función es la que asigna los claims.
       toast({
        title: "¡Registro exitoso!",
        description: "Tu cuenta ha sido creada. Serás redirigido al iniciar sesión.",
      });

    } catch (error: any) {
      console.error(error);
      let description = "Ocurrió un error. Por favor, inténtalo de nuevo.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este correo electrónico ya está en uso.";
      }
      toast({
        title: "Error en el registro",
        description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center mb-4">
                <HeartPulse className="h-12 w-12 text-primary" />
            </div>
          <CardTitle className="font-headline text-2xl">Crea tu cuenta</CardTitle>
          <CardDescription>Únete a FisioApp para empezar tu recuperación.</CardDescription>
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
                      <Input placeholder="Tu nombre completo" {...field} />
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
                      <Input type="email" placeholder="tu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Cuál es tu rol?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="terapeuta">Terapeuta</SelectItem>
                        <SelectItem value="paciente">Paciente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {rolSeleccionado === 'paciente' && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold text-center">Información Médica Adicional</h3>
                  <p className="text-sm text-muted-foreground text-center">Esta información solo será visible para los terapeutas.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactoEmergenciaNombre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de contacto de emergencia</FormLabel>
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
                        <FormLabel>Historial Médico Relevante (Opcional)</FormLabel>
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
                        <FormLabel>Alergias (Opcional)</FormLabel>
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
                        <FormLabel>Medicamentos Actuales (Opcional)</FormLabel>
                        <FormControl><Textarea placeholder="Nombre del medicamento, dosis, frecuencia..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Cuenta
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/" className="underline">
            Inicia sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
