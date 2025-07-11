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
