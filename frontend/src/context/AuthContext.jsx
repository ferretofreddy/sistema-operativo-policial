import { createContext, useEffect, useState } from "react";

import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../services/firebase";

import { createUserIfNotExists, getUserData } from "../services/userService";

//  CONTEXT
export const AuthContext = createContext();

//  PROVIDER
export function AuthProvider({ children }) {
  //  AUTH FIREBASE
  const [user, setUser] = useState(null);

  //  USER DATA FIRESTORE
  const [userData, setUserData] = useState(null);

  //  LOADING
  const [loading, setLoading] = useState(true);

  //  AUTH LISTENER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,

      async (currentUser) => {
        try {
          //  USER LOGGED
          if (currentUser) {
            //  CREAR USER SI NO EXISTE
            await createUserIfNotExists(currentUser);

            // CARGAR FIRESTORE DATA
            try {
              const data = await getUserData(currentUser.uid);

              setUserData(data);
            } catch (error) {
              console.error("Error cargando userData:", error);

              setUserData(null);
            }
          } else {
            // LOGOUT
            setUserData(null);
          }

          // AUTH USER
          setUser(currentUser);
        } catch (error) {
          console.error("Error AuthContext:", error);

          setUser(null);

          setUserData(null);
        } finally {
          // FIN LOADING
          setLoading(false);
        }
      },
    );

    // CLEANUP
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,

        userData,

        loading,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}
