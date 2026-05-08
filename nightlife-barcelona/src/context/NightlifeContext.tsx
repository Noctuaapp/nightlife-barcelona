"use client"

import {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react"

import { nightlifeData } from "../data/nightlife-data"

type NightlifeContextType = {
  clubs: typeof nightlifeData

  toggleTrending: (name: string) => void

  toggleSoldOut: (name: string) => void

  updateQueue: (
    name: string,
    queue: string
  ) => void
}

const NightlifeContext =
  createContext<NightlifeContextType | null>(null)

export function NightlifeProvider({
  children,
}: {
  children: ReactNode
}) {

  const [clubs, setClubs] =
    useState(nightlifeData)

  const toggleTrending = (name: string) => {

    setClubs((prev) =>
      prev.map((club) =>
        club.name === name
          ? {
              ...club,
              trending: !club.trending,
            }
          : club
      )
    )
  }

  const toggleSoldOut = (name: string) => {

    setClubs((prev) =>
      prev.map((club) =>
        club.name === name
          ? {
              ...club,
              soldOut: !club.soldOut,
            }
          : club
      )
    )
  }

  const updateQueue = (
    name: string,
    queue: string
  ) => {

    setClubs((prev) =>
      prev.map((club) =>
        club.name === name
          ? {
              ...club,
              queue,
            }
          : club
      )
    )
  }

  return (

    <NightlifeContext.Provider
      value={{
        clubs,
        toggleTrending,
        toggleSoldOut,
        updateQueue,
      }}
    >

      {children}

    </NightlifeContext.Provider>
  )
}

export function useNightlife() {

  const context =
    useContext(NightlifeContext)

  if (!context) {

    throw new Error(
      "useNightlife must be used inside NightlifeProvider"
    )
  }

  return context
}