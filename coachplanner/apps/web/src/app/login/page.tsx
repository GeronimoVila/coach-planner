"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Eye, EyeOff, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { api } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { GoogleButton } from "@/components/auth/google-button";

const formSchema = z.object({
  email: z.string().email({ message: "Ingresa un email válido." }),
  password: z.string().min(1, { message: "La contraseña es requerida." }),
});

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", values);

      const { access_token, user } = response.data;

      login(access_token, user);

      toast.success("¡Bienvenido de nuevo!");

      if (user.role === 'ADMIN') {
        router.push("/admin");
      } else {
        router.push("/"); 
      }
      
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Error al iniciar sesión";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-100 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 font-bold text-xl">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Dumbbell className="h-5 w-5 text-white" />
              </div>
              CoachPlanner
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Bienvenido de nuevo
          </CardTitle>
          <CardDescription>
            Ingrese su correo electrónico a continuación para iniciar sesión
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" {...field} />
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Contraseña</FormLabel>
                      <Link
                        href="/forgot-password"
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        ¿Has olvidado tu contraseña?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-blue-700 hover:bg-blue-800 text-white" 
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar sesión
              </Button>
            </form>
          </Form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                O continuar con
              </span>
            </div>
          </div>

          <GoogleButton mode="LOGIN" />

          <div className="mt-2 text-center text-sm space-y-2">

            <div className="pt-2 border-t mt-2">
              <span className="text-muted-foreground">¿Eres instructor? </span>
              <Link 
                href="/register-business" 
                className="font-medium text-blue-600 hover:underline"
              >
                Crea tu cuenta de Profesor
              </Link>
            </div>

          </div>

          <p className="px-8 text-center text-xs text-muted-foreground pt-4">
            Al hacer clic en continuar, aceptas nuestros{" "}
            <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
              Términos de Servicio
            </Link>{" "}
            y{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
              política de privacidad
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}