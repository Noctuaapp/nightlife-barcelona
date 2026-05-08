"use client"

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react"

interface FavoritesContextType {

  favorites: string[]

  toggleFavorite: (clubName: string) => void

  isFavorite: (clubName: string) => boolean
}

const FavoritesContext =
  createContext<FavoritesContextType | undefined>(
    undefined
  )

export function FavoritesProvider({
  children,
}: {
  children: ReactNode
}) {

  const [favorites, setFavorites] = useState<string[]>([])

  function toggleFavorite(clubName: string) {

    setFavorites((prev) =>

      prev.includes(clubName)
        ? prev.filter((name) => name !== clubName)
        : [...prev, clubName]
    )
  }

  function isFavorite(clubName: string) {

    return favorites.includes(clubName)
  }

  return (

    <FavoritesContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite,
      }}
    >

      {children}

    </FavoritesContext.Provider>
  )
}

export function useFavorites() {

  const context = useContext(FavoritesContext)

  if (!context) {

    throw new Error(
      "useFavorites must be used within FavoritesProvider"
    )
  }

  return context
}