
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, HeartPulse } from "lucide-react";

const formSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string().email("Por favor, introduce un email válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres.").optional().or(z.literal('')),
  rol: z.enum(["paciente", "terapeuta"], {
    required_error: "Debes seleccionar un rol.",
  }),
  // Campos adicionales para el perfil del paciente
  contactoEmergenciaNombre: z.string().optional(),
  contactoEmergenciaTelefono: z.string().optional(),
  historialMedico: z.string().optional(),
  alergias: z.string().optional(),
  medicamentos: z.string().optional(),
});

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user: authenticatedUser } = useAuth(); // Get user from context

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      email: authenticatedUser?.email || "", // Pre-fill email if user exists
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
    try {
      let user;
      if (authenticatedUser) {
        user = authenticatedUser;
        if (user.displayName !== values.nombre) {
            await updateProfile(user, { displayName: values.nombre });
        }
      } else {
         if (!values.password) {
            toast({ title: "Error", description: "La contraseña es requerida.", variant: "destructive" });
            setIsLoading(false);
            return;
         }
         const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
         user = userCredential.user;
      }
      
      const userProfileData: any = {
        uid: user.uid,
        nombre: values.nombre,
        email: values.email,
        rol: values.rol,
        fechaRegistro: serverTimestamp(),
      };

      if (values.rol === 'paciente') {
        userProfileData.informacionMedica = {
          contactoEmergencia: {
            nombre: values.contactoEmergenciaNombre || '',
            telefono: values.contactoEmergenciaTelefono || '',
          },
          historialMedico: values.historialMedico || '',
          alergias: values.alergias || '',
          medicamentos: values.medicamentos || '',
        };
      }

      await setDoc(doc(db, "usuarios", user.uid), userProfileData);
      
      toast({
        title: "¡Registro exitoso!",
        description: "Tu cuenta ha sido configurada. Serás redirigido.",
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
          <CardTitle className="font-headline text-2xl">
            {authenticatedUser ? "Completa tu perfil" : "Crea tu cuenta"}
            </CardTitle>
          <CardDescription>
            {authenticatedUser ? "Añade tus datos para continuar." : "Únete a FisioApp para empezar"}
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
                      <Input placeholder="Tu nombre" {...field} />
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
                      <Input type="email" placeholder="tu@email.com" {...field} disabled={!!authenticatedUser} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!authenticatedUser && (
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
              )}
              <FormField
                control={form.control}
                name="rol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Soy un...</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tu rol" />
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
                  <p className="text-sm text-muted-foreground text-center">Esta información solo será visible para tu terapeuta.</p>
                  
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
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {authenticatedUser ? "Guardar Perfil" : "Crear Cuenta"}
              </Button>
            </form>
          </Form>
          {!authenticatedUser && (
            <div className="mt-4 text-center text-sm">
                ¿Ya tienes una cuenta?{" "}
                <Link href="/" className="underline">
                Inicia sesión
                </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
