
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
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      let user;
      // If a user is already authenticated (but has no profile), we just create the profile.
      // Otherwise, we create a new user.
      if (authenticatedUser) {
        user = authenticatedUser;
        // Optionally update their name in auth profile as well
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
      
      // Create the user document in Firestore
      await setDoc(doc(db, "usuarios", user.uid), {
        uid: user.uid,
        nombre: values.nombre,
        email: values.email,
        rol: values.rol,
        fechaRegistro: serverTimestamp(),
      });
      
      toast({
        title: "¡Registro exitoso!",
        description: "Tu cuenta ha sido configurada. Serás redirigido.",
      });

      // The AuthContext will handle the redirection automatically on state change.
      // We don't need to push the router here.

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
      <Card className="w-full max-w-sm">
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
              {/* Hide password field if user is already authenticated */}
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
