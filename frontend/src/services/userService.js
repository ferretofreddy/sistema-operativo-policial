import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "./firebase"

export const createUserIfNotExists = async (user) => {
  const userRef = doc(db, "usuarios", user.uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      rol: "agente", // por defecto
      estado: "activo",
      creado: new Date()
    })
  }

  return userRef
}

export const getUserData = async (uid) => {
  const userRef = doc(db, "usuarios", uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    return userSnap.data()
  } else {
    return null
  }
}