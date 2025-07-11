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
  const {email, nombre, rol, informacionMedica, password} = request.data;
  const callingUid = request.auth?.uid;
  
  if (!email || !nombre || !rol) {
    throw new Error("Missing required fields: email, nombre, rol.");
  }
  
  // Si no hay un UID que llama (auto-registro), se requiere contraseña.
  if (!callingUid) {
      if (!password) {
          throw new Error("Password is required for self-registration.");
      }
  } else {
    // Si hay un UID que llama, debe ser un terapeuta.
    const callingUser = await getAuth().getUser(callingUid);
    if (callingUser.customClaims?.rol !== 'terapeuta') {
      throw new Error("Permission denied: only therapists can create users without a password.");
    }
  }

  try {
    logger.info(`Creating user: ${email}`);
    
    const userProperties: any = {
        email,
        displayName: nombre,
    };

    // La contraseña solo es necesaria para el auto-registro
    if (password) {
        userProperties.password = password;
    }

    const userRecord = await getAuth().createUser(userProperties);

    // CRITICAL FIX: Set custom claim for role-based access control
    await getAuth().setCustomUserClaims(userRecord.uid, {rol});
    logger.info(`Successfully set custom claim 'rol: ${rol}' for user ${userRecord.uid}`);

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
    
    await getFirestore().collection("usuarios").doc(userRecord.uid)
      .set(userProfileData);

    logger.info(`Successfully created user profile in Firestore: ${userRecord.uid}`);
    return {uid: userRecord.uid};
  } catch (error) {
    logger.error("Error creating new user:", error);
    // Transmitir un mensaje de error más específico si es posible
    if (error instanceof Error && 'code' in error && error.code === 'auth/email-already-exists') {
        throw new Error('EMAIL_EXISTS');
    }
    throw new Error("Failed to create user.");
  }
});
