/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";

// Initialize Firebase Admin SDK
initializeApp();

// Create user callable function
export const createUser = onCall(async (request) => {
  if (request.auth?.token.rol !== "terapeuta") {
    throw new Error("Permission denied: only therapists can create users.");
  }

  const {email, nombre, rol, informacionMedica} = request.data;
  if (!email || !nombre || !rol) {
    throw new Error("Missing required fields: email, nombre, rol.");
  }

  try {
    logger.info(`Creating user: ${email}`);
    const userRecord = await getAuth().createUser({
      email,
      displayName: nombre,
    });

    const userProfileData: any = {
      uid: userRecord.uid,
      nombre,
      email,
      rol,
      fechaRegistro: new Date(),
    };

    if (rol === "paciente" && informacionMedica) {
      userProfileData.informacionMedica = {
        contactoEmergencia: {
          nombre: informacionMedica.contactoEmergenciaNombre || "",
          telefono: informacionMedica.contactoEmergenciaTelefono || "",
        },
        historialMedico: informacionMedica.historialMedico || "",
        alergias: informacionMedica.alergias || "",
        medicamentos: informacionMedica.medicamentos || "",
      };
    }
    
    // Set custom claim for role-based access control
    await getAuth().setCustomUserClaims(userRecord.uid, {rol});

    await getFirestore().collection("usuarios").doc(userRecord.uid)
      .set(userProfileData);

    logger.info(`Successfully created user: ${userRecord.uid}`);
    return {uid: userRecord.uid};
  } catch (error) {
    logger.error("Error creating new user:", error);
    throw new Error("Failed to create user.");
  }
});
