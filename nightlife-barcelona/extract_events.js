const https = require('https')
const fs = require('fs')
const API_KEY = 'AIzaSyDr5Xt7Zl_vuojy4Jxpkc_bzUMqDa1_e5U'
const results = []
const seen = new Set()
const searches = [
  'Primavera Sound Barcelona 2026',
  'Sonar Barcelona 2026',
  'Cruïlla Barcelona 2026',
  'festival Grec Barcelona 2026',
  'festival musica Barcelona 2026',
  'concierto Barcelona 2026',
  'festa major Gracia Barcelona',
  'festa major Sants Barcelona',
  'festa major Poblenou Barcelona',
  'festa major Gràcia Barcelona 2026',
  'fiesta mayor Gracia Barcelona 2026',
  'festa major Sants Barcelona 2026',
  'festa major Sagrada Familia Barcelona 2026',
  'festa major Clot Barcelona 2026',
  'festa major Sant Pere Barcelona 2026',
  'festa major Barceloneta Barcelona 2026',
  'festa major Raval Barcelona 2026',
  'festa major Poble Sec Barcelona 2026',
  'festa major Montjuic Barcelona 2026',
  'festa major Eixample Barcelona 2026',
  'festa major Sarria Barcelona 2026',
  'festa major Sant Gervasi Barcelona 2026',
  'festa major Vallcarca Barcelona 2026',
  'festa major Vall Hebron Barcelona 2026',
  'festa major Horta Barcelona 2026',
  'festa major Guinardo Barcelona 2026',
  'festa major Sant Andreu Barcelona 2026',
  'festa major Nou Barris Barcelona 2026',
  'festa major Badalona 2026',
  'festa major Hospitalet Barcelona 2026',
]
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function fetchPage(query, pageToken) {
  return new Promise((resolve, reject) => {
    const url = pageToken
      ? `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${pageToken}&key=${API_KEY}`
      : `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}`
    https.get(url, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve(JSON.parse(data)))
    }).on('error', reject)
  })
}
function fetchDetails(placeId) {
  return new Promise((resolve, reject) => {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,opening_hours,rating,types,website&key=${API_KEY}`
    https.get(url, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve(JSON.parse(data)))
    }).on('error', reject)
  })
}
async function main() {
  for (const query of searches) {
    console.log('Searching: ' + query)
    let pageToken = null
    let page = 0
    do {
      if (pageToken) await sleep(2500)
      const data = await fetchPage(query, pageToken)
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.log('Error: ' + data.status)
        break
      }
      for (const place of (data.results || [])) {
        if (seen.has(place.place_id)) continue
        seen.add(place.place_id)
        await sleep(150)
        const det = await fetchDetails(place.place_id)
        const d = det.result
        if (!d) continue
        results.push({
          name: d.name || '',
          address: d.formatted_address || '',
          latitude: d.geometry?.location?.lat || '',
          longitude: d.geometry?.location?.lng || '',
          date: '',
          start_time: '',
          end_time: '',
          hours: (d.opening_hours?.weekday_text || []).join(' | '),
          rating: d.rating || '',
          website: d.website || '',
          types: (d.types || []).join(', '),
          price: '',
          featured: 'false',
          sold_out: 'false',
        })
        process.stdout.write('\r' + results.length + ' events found')
      }
      pageToken = data.next_page_token || null
      page++
    } while (pageToken && page < 3)
    await sleep(1500)
  }
  const headers = ['name','address','latitude','longitude','date','start_time','end_time','hours','rating','website','types','price','featured','sold_out']
  const lines = [headers.join(',')]
  for (const r of results) {
    const row = headers.map(h => {
      const val = String(r[h] || '').replace(/"/g, '""')
      return '"' + val + '"'
    })
    lines.push(row.join(','))
  }
  fs.writeFileSync('barcelona_events.csv', lines.join('\n'))
  console.log('\nDone! ' + results.length + ' events saved to barcelona_events.csv')
}
main().catch(console.error)
