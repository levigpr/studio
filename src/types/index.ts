import { Timestamp } from "firebase/firestore";

export interface InformacionMedica {
  contactoEmergencia?: {
    nombre: string;
    telefono: string;
  };
  historialMedico?: string;
  alergias?: string;
  medicamentos?: string;
}

export interface UserProfile {
  uid: string;
  nombre: string;
  email: string;
  rol: "terapeuta" | "paciente";
  fechaRegistro: Timestamp;
  informacionMedica?: InformacionMedica;
  terapeutaUid?: string; // Asignado al paciente
}

export interface Expediente {
  id: string;
  pacienteUid: string;
  terapeutaUid: string;
  descripcion: string;
  fechaCreacion: Timestamp;
}

export interface Sesion {
  id: string;
  expedienteId: string;
  terapeutaUid: string;
  pacienteUid: string;
  fecha: Timestamp;
  estado: "agendada" | "completada" | "cancelada";
  modalidad: "presencial" | "virtual";
  ubicacion?: string;
  nota?: string;
  creadaEn: Timestamp;
  // Campos de progreso registrados por el terapeuta
  notasTerapeuta?: string;
  dolorInicial?: number;
  dolorFinal?: number;
  observacionesObjetivas?: string;
  tecnicasAplicadas?: string;
  planProximaSesion?: string;
  progresoPercibido?: 'mejoria-significativa' | 'mejoria-leve' | 'sin-cambios' | 'retroceso-leve' | 'retroceso-significativo';
  estadoAnimoObservado?: 'muy-bien' | 'bien' | 'regular' | 'mal' | 'muy-mal';
}


export interface GaleriaVideo {
  titulo: string;
  youtubeUrl: string;
}

export interface Galeria {
  id: string;
  nombre: string;
  descripcion: string;
  videos: GaleriaVideo[];
  creadaPor: string; // terapeutaUid
  pacientesAsignados: string[]; // array of pacienteUid
  fechaCreacion: Timestamp;
}

export interface Avance {
    id: string;
    pacienteUid: string;
    terapeutaUid: string;
    expedienteId: string;
    fechaRegistro: Timestamp;
    registradoPor: string; // UID del usuario
    tipoRegistro: "auto" | "sesion";

    // Tracking del Dolor
    dolorInicial?: number;
    dolorFinal?: number;
    ubicacionDolor?: string;

    // Adherencia al Tratamiento
    ejerciciosRealizados?: string;
    diasEjercicio?: number;
    ejerciciosDificiles?: string;

    // Funcionalidad y Movilidad
    movilidadPercibida?: string;
    fatiga?: number;
    limitacionesFuncionales?: string;

    // Emocional y Motivacional
    estadoAnimo?: 'muy-bien' | 'bien' | 'regular' | 'mal' | 'muy-mal';
    motivacion?: number;
    comentarioPaciente?: string;
}
