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
  reminder_days_before: number
  note: string | null
  collection_id: number | null
}

export type FavoriteCollection = {
  id: number
  user_id: string
  name: string
  sort_order: number
  created_at: string
}

interface FavoritesContextType {
  favorites: Favorite[]
  loadingFavorites: boolean
  toggleFavorite: (itemType: FavoriteType, itemId: number) => Promise<void>
  isFavorite: (itemType: FavoriteType, itemId: number) => boolean
  refreshFavorites: () => Promise<void>
  setReminder: (itemType: FavoriteType, itemId: number, daysBefore: number) => Promise<void>
  getReminder: (itemType: FavoriteType, itemId: number) => number
  setNote: (itemType: FavoriteType, itemId: number, note: string) => Promise<void>
  setFavoriteCollection: (itemType: FavoriteType, itemId: number, collectionId: number | null) => Promise<void>
  collections: FavoriteCollection[]
  createCollection: (name: string) => Promise<FavoriteCollection | null>
  renameCollection: (id: number, name: string) => Promise<void>
  deleteCollection: (id: number) => Promise<void>
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
  const [collections, setCollections] = useState<FavoriteCollection[]>([])

  const refreshCollections = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user
    if (!user) {
      setCollections([])
      return
    }
    const { data, error } = await supabase
      .from("favorite_collections")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
    if (error) {
      console.log("FAVORITE COLLECTIONS ERROR:", error)
      return
    }
    setCollections(data || [])
  }

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
    refreshCollections()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshFavorites()
      refreshCollections()
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

  const getReminder = (itemType: FavoriteType, itemId: number) => {
    const fav = favorites.find(
      (favorite) => favorite.item_type === itemType && favorite.item_id === itemId
    )
    return fav?.reminder_days_before ?? 0
  }

  const setReminder = async (itemType: FavoriteType, itemId: number, daysBefore: number) => {
    const fav = favorites.find(
      (favorite) => favorite.item_type === itemType && favorite.item_id === itemId
    )
    if (!fav) return

    const { error } = await supabase
      .from("favorites")
      .update({ reminder_days_before: daysBefore })
      .eq("id", fav.id)

    if (error) {
      console.log("SET REMINDER ERROR:", error)
      return
    }

    setFavorites((prev) =>
      prev.map((f) => (f.id === fav.id ? { ...f, reminder_days_before: daysBefore } : f))
    )
  }

  const setNote = async (itemType: FavoriteType, itemId: number, note: string) => {
    const fav = favorites.find((favorite) => favorite.item_type === itemType && favorite.item_id === itemId)
    if (!fav) return

    const trimmed = note.trim()
    const { error } = await supabase
      .from("favorites")
      .update({ note: trimmed || null })
      .eq("id", fav.id)

    if (error) {
      console.log("SET NOTE ERROR:", error)
      return
    }

    setFavorites((prev) => prev.map((f) => (f.id === fav.id ? { ...f, note: trimmed || null } : f)))
  }

  const setFavoriteCollection = async (itemType: FavoriteType, itemId: number, collectionId: number | null) => {
    const fav = favorites.find((favorite) => favorite.item_type === itemType && favorite.item_id === itemId)
    if (!fav) return

    const { error } = await supabase
      .from("favorites")
      .update({ collection_id: collectionId })
      .eq("id", fav.id)

    if (error) {
      console.log("SET FAVORITE COLLECTION ERROR:", error)
      return
    }

    setFavorites((prev) => prev.map((f) => (f.id === fav.id ? { ...f, collection_id: collectionId } : f)))
  }

  const createCollection = async (name: string): Promise<FavoriteCollection | null> => {
    const trimmed = name.trim()
    if (!trimmed) return null

    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user
    if (!user) return null

    const { data, error } = await supabase
      .from("favorite_collections")
      .insert({ user_id: user.id, name: trimmed, sort_order: collections.length })
      .select()
      .single()

    if (error) {
      console.log("CREATE COLLECTION ERROR:", error)
      return null
    }

    setCollections((prev) => [...prev, data])
    return data
  }

  const renameCollection = async (id: number, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return

    const { error } = await supabase.from("favorite_collections").update({ name: trimmed }).eq("id", id)
    if (error) {
      console.log("RENAME COLLECTION ERROR:", error)
      return
    }

    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)))
  }

  const deleteCollection = async (id: number) => {
    const { error } = await supabase.from("favorite_collections").delete().eq("id", id)
    if (error) {
      console.log("DELETE COLLECTION ERROR:", error)
      return
    }

    setCollections((prev) => prev.filter((c) => c.id !== id))
    // Los favoritos de esa lista no se borran, solo se quedan sin categoría (collection_id null
    // por el ON DELETE SET NULL de la base de datos).
    setFavorites((prev) => prev.map((f) => (f.collection_id === id ? { ...f, collection_id: null } : f)))
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
        reminder_days_before: 0,
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
        setReminder,
        getReminder,
        setNote,
        setFavoriteCollection,
        collections,
        createCollection,
        renameCollection,
        deleteCollection,
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