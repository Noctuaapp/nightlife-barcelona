const fs = require("fs")

const GOOGLE_API_KEY = "AIzaSyA94qj7blVBVvvyUUGW2fMgPrA50luEFI8"

const zones = [
  { name: "Barceloneta / Port Olímpic", query: "bares nocturnos Port Olimpic Barcelona" },
  { name: "Barceloneta / Port Olímpic", query: "discotecas clubs Port Olimpic Barcelona" },
  { name: "Barceloneta / Port Olímpic", query: "pubs Barceloneta Barcelona" },
  { name: "Badalona", query: "bares nocturnos Badalona" },
  { name: "Badalona", query: "discotecas clubs Badalona" },
  { name: "Badalona", query: "pubs Badalona" },
  { name: "L'Hospitalet", query: "bares nocturnos L'Hospitalet de Llobregat" },
  { name: "L'Hospitalet", query: "discotecas clubs L'Hospitalet de Llobregat" },
  { name: "L'Hospitalet", query: "pubs L'Hospitalet de Llobregat" },
  { name: "Horta-Guinardó", query: "bares nocturnos Horta Guinardo Barcelona" },
  { name: "Horta-Guinardó", query: "discotecas clubs Horta Guinardo Barcelona" },
  { name: "Horta-Guinardó", query: "pubs Horta Guinardo Barcelona" },
  { name: "Sarrià-Sant Gervasi", query: "bares nocturnos Sarria Sant Gervasi Barcelona" },
  { name: "Sarrià-Sant Gervasi", query: "discotecas clubs Sarria Sant Gervasi Barcelona" },
  { name: "Sarrià-Sant Gervasi", query: "pubs Sarria Sant Gervasi Barcelona" },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function searchPlaces(query) {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  return data.results || []
}

async function getPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,opening_hours,price_level,rating,formatted_phone_number,website&key=${GOOGLE_API_KEY}`
  const res = await fetch(url)
  const data = await res.json()
  return data.result || {}
}

async function main() {
  const seen = new Set()
  const rows = []

  for (const zone of zones) {
    console.log(`\nSearching: ${zone.query}`)
    const places = await searchPlaces(zone.query)
    console.log(`Found ${places.length} places`)

    for (const place of places.slice(0, 15)) {
      if (seen.has(place.place_id)) continue
      seen.add(place.place_id)

      await sleep(200)
      const details = await getPlaceDetails(place.place_id)

      rows.push({
        name: details.name || place.name,
        neighborhood: zone.name,
        address: details.formatted_address || place.formatted_address || "",
        latitude: details.geometry?.location?.lat || place.geometry?.location?.lat || "",
        longitude: details.geometry?.location?.lng || place.geometry?.location?.lng || "",
        hours: details.opening_hours?.weekday_text?.join(" | ") || "",
        price: details.price_level ? "€".repeat(details.price_level) : "",
        rating: details.rating || "",
        music: "",
        website: details.website || "",
      })

      console.log(`✅ ${details.name || place.name}`)
    }
  }

  const header = "name,neighborhood,address,latitude,longitude,hours,price,rating,music,website"
  const csvRows = rows.map(r =>
    [r.name, r.neighborhood, r.address, r.latitude, r.longitude, r.hours, r.price, r.rating, r.music, r.website]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  )

  fs.writeFileSync("venues_output.csv", [header, ...csvRows].join("\n"))
  console.log(`\n✅ Done! ${rows.length} venues saved to venues_output.csv`)
}

main()