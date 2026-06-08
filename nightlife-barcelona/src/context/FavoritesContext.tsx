"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react"

import { supabase } from "../lib/supabase"

type FavoriteType = "club" | "event" | "club_event"

type Favorite = {
  id: number
  user_id: string
  item_type: FavoriteType
  item_id: number
}

interface FavoritesContextType {
  favorites: Favorite[]
  loadingFavorites: boolean
  toggleFavorite: (itemType: FavoriteType, itemId: number) => Promise<void>
  isFavorite: (itemType: FavoriteType, itemId: number) => boolean
  refreshFavorites: () => Promise<void>
}

const FavoritesContext =
  createContext<FavoritesContextType | undefined>(undefined)

export function FavoritesProvider({
  children,
}: {
  children: ReactNode
}) {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loadingFavorites, setLoadingFavorites] = useState(true)

  const refreshFavorites = async () => {
    setLoadingFavorites(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

    if (!user) {
      setFavorites([])
      setLoadingFavorites(false)
      return
    }

    const { data, error } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", user.id)

    if (error) {
      console.log("FAVORITES ERROR:", error)
      setLoadingFavorites(false)
      return
    }

    setFavorites(data || [])
    setLoadingFavorites(false)
  }

  useEffect(() => {
    refreshFavorites()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshFavorites()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const isFavorite = (
    itemType: FavoriteType,
    itemId: number
  ) => {
    return favorites.some(
      (favorite) =>
        favorite.item_type === itemType &&
        favorite.item_id === itemId
    )
  }

  const toggleFavorite = async (
    itemType: FavoriteType,
    itemId: number
  ) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user

    if (!user) {
      window.location.href = "/login"
      return
    }

    const existingFavorite = favorites.find(
      (favorite) =>
        favorite.item_type === itemType &&
        favorite.item_id === itemId
    )

    if (existingFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", existingFavorite.id)

      if (error) {
        console.log("REMOVE FAVORITE ERROR:", error)
        return
      }

      setFavorites((prev) =>
        prev.filter((favorite) => favorite.id !== existingFavorite.id)
      )

      return
    }

    const { data, error } = await supabase
      .from("favorites")
      .insert({
        user_id: user.id,
        item_type: itemType,
        item_id: itemId,
      })
      .select()
      .single()

    if (error) {
      console.log("ADD FAVORITE ERROR:", error)
      return
    }

    if (data) {
      setFavorites((prev) => [...prev, data])
    }
  }

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        loadingFavorites,
        toggleFavorite,
        isFavorite,
        refreshFavorites,
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