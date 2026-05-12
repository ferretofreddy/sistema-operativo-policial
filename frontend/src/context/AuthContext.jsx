import { createContext, useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "../services/firebase"
import { createUserIfNotExists } from "../services/userService"
import { getUserData } from "../services/userService"

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState(null)

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      await createUserIfNotExists(currentUser)

      const data = await getUserData(currentUser.uid)
      setUserData(data)
    } else {
      setUserData(null)
    }

    setUser(currentUser)
    setLoading(false)
  })

  return () => unsubscribe()
}, [])

  return (
    <AuthContext.Provider value={{ user, userData }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}