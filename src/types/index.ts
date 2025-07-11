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
  notasTerapeuta?: string;
  dolorInicial?: number;
  dolorFinal?: number;
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
