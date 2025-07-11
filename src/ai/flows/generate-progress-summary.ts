
'use server';
/**
 * @fileOverview Flow para analizar el auto-reporte de un paciente y generar un resumen para el terapeuta.
 *
 * - generateProgressSummary - Genera un resumen conciso del avance del paciente.
 * - ProgressSummaryInput - El tipo de entrada para la función.
 * - ProgressSummaryOutput - El tipo de salida para la función.
 */

import { ai } from '@/ai/genkit';
import type { Avance } from '@/types';
import { z } from 'zod';

const ProgressSummaryInputSchema = z.object({
    avance: z.any().describe("El objeto completo del avance del paciente a analizar."),
});
export type ProgressSummaryInput = z.infer<typeof ProgressSummaryInputSchema>;

const ProgressSummaryOutputSchema = z.object({
  resumen: z.string().describe("Resumen conciso del estado general del paciente."),
  puntosClave: z.array(z.string()).describe("Lista de 3 a 5 puntos clave o alertas para el terapeuta."),
  sugerencia: z.string().describe("Una sugerencia de acción o tema a discutir en la próxima sesión."),
});
export type ProgressSummaryOutput = z.infer<typeof ProgressSummaryOutputSchema>;


export async function generateProgressSummary(
  input: ProgressSummaryInput
): Promise<ProgressSummaryOutput> {
  return await progressSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'progressSummaryPrompt',
  input: { schema: ProgressSummaryInputSchema },
  output: { schema: ProgressSummaryOutputSchema },
  prompt: `
    Eres un asistente experto en fisioterapia. Analiza el siguiente auto-reporte de un paciente y genera un resumen claro y conciso para el terapeuta.

    Datos del auto-reporte:
    - Dolor (Inicial/Final): {{{avance.dolorInicial}}}/10 - {{{avance.dolorFinal}}}/10
    - Ubicación del Dolor: {{{avance.ubicacionDolor}}}
    - Días de Ejercicio (Semana): {{{avance.diasEjercicio}}}/7
    - Ejercicios Realizados: {{{avance.ejerciciosRealizados}}}
    - Dificultades: {{{avance.ejerciciosDificiles}}}
    - Movilidad Percibida: {{{avance.movilidadPercibida}}}
    - Fatiga: {{{avance.fatiga}}}/10
    - Limitaciones Funcionales: {{{avance.limitacionesFuncionales}}}
    - Estado de Ánimo: {{{avance.estadoAnimo}}}
    - Motivación: {{{avance.motivacion}}}/10
    - Comentarios Adicionales: {{{avance.comentarioPaciente}}}

    Tu tarea es:
    1.  **Resumen**: Escribe un resumen de 2-3 frases sobre el estado general del paciente, destacando cambios significativos en dolor, adherencia y funcionalidad.
    2.  **Puntos Clave**: Identifica de 3 a 5 puntos clave o "banderas rojas" que el terapeuta deba notar. Por ejemplo: un aumento repentino del dolor, baja adherencia, un estado de ánimo muy bajo, o comentarios específicos que requieran atención.
    3.  **Sugerencia**: Basado en el reporte, proporciona una sugerencia concreta para la próxima sesión. Por ejemplo: "Discutir la dificultad con el ejercicio X" o "Explorar alternativas para mejorar la motivación".

    Genera la respuesta en el formato JSON solicitado.
  `,
});

const progressSummaryFlow = ai.defineFlow(
  {
    name: 'progressSummaryFlow',
    inputSchema: ProgressSummaryInputSchema,
    outputSchema: ProgressSummaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
