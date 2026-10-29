// Preguntas del juego "¿Qué prefieres?" (popup al entrar, ver components/fun/PartyPollPopup.tsx).
// Solo por diversión: no dan XP. Los votos se guardan en Supabase (party_poll_votes) usando el
// `id` de aquí, así que:
//   - para AÑADIR una pregunta basta con sumar una entrada nueva con un id nuevo;
//   - NO cambies el id de una pregunta que ya existe (sus votos quedarían huérfanos);
//   - si cambias el texto de una opción, mantén el mismo orden (a = primera, b = segunda).
// Textos en es / ca / en. El resto de idiomas de la web usan el inglés.
//
// ALCOHOL (30/10/2026): las preguntas que hablan de bebida (cubatas, chupitos, resaca, barra libre...)
// solo se enseñan a quien tiene cuenta, porque al registrarse confirma que es mayor de edad. Quien
// juega sin cuenta solo recibe las demás. Al AÑADIR una pregunta que hable de alcohol, apunta su id
// en ALCOHOL_POLL_IDS (más abajo); el test src/lib/__tests__/partyPolls.test.ts avisa si se olvida.

export type PollText = { a: string; b: string }
export type PartyPoll = { id: string; es: PollText; ca: PollText; en: PollText }

export const PARTY_POLLS: PartyPoll[] = [
  {
    id: "cubata-golpe",
    es: { a: "Beberte un cubata de un trago", b: "Una botella de vino a sorbitos toda la noche" },
    ca: { a: "Beure't un cubata d'un glop", b: "Una ampolla de vi a glopets tota la nit" },
    en: { a: "Down a mixed drink in one go", b: "Sip one bottle of wine all night long" },
  },
  {
    id: "cancion-5-veces",
    es: { a: "Que pongan tu canción favorita 5 veces seguidas", b: "No escucharla en toda la noche" },
    ca: { a: "Que posin la teva cançó preferida 5 cops seguits", b: "No sentir-la en tota la nit" },
    en: { a: "Your favourite song played 5 times in a row", b: "Not hearing it all night" },
  },
  {
    id: "cola-hora",
    es: { a: "Una hora de cola para el mejor club", b: "Entrar directo a uno normalito" },
    ca: { a: "Una hora de cua per al millor club", b: "Entrar directe a un de normalet" },
    en: { a: "An hour-long queue for the best club", b: "Walk straight into an average one" },
  },
  {
    id: "zapatos",
    es: { a: "Bailar toda la noche con zapatos que te destrozan", b: "Ir cómodo y que te miren raro en la puerta" },
    ca: { a: "Ballar tota la nit amb unes sabates que et destrossen", b: "Anar còmode i que et mirin estrany a la porta" },
    en: { a: "Dance all night in shoes that destroy your feet", b: "Go comfy and get odd looks at the door" },
  },
  {
    id: "chupito",
    es: { a: "Chupito de tequila sin sal ni limón", b: "Chupito de Jäger del tiempo" },
    ca: { a: "Xupito de tequila sense sal ni llimona", b: "Xupito de Jäger del temps" },
    en: { a: "Tequila shot, no salt, no lime", b: "Room-temperature Jäger shot" },
  },
  {
    id: "reggaeton-techno",
    es: { a: "Que el DJ solo ponga reguetón", b: "Que solo ponga techno" },
    ca: { a: "Que el DJ només posi reggaeton", b: "Que només posi techno" },
    en: { a: "The DJ only plays reggaeton", b: "The DJ only plays techno" },
  },
  {
    id: "rondas-chofer",
    es: { a: "Pagar todas las rondas de la noche", b: "Ser quien lleva a todos a casa" },
    ca: { a: "Pagar totes les rondes de la nit", b: "Ser qui porta tothom a casa" },
    en: { a: "Pay for every round tonight", b: "Be the one driving everyone home" },
  },
  {
    id: "volver-2-8",
    es: { a: "Volver a casa a las 2", b: "Volver a las 8 y entrar a currar a las 9" },
    ca: { a: "Tornar a casa a les 2", b: "Tornar a les 8 i entrar a treballar a les 9" },
    en: { a: "Head home at 2am", b: "Get home at 8 and start work at 9" },
  },
  {
    id: "ex-jefe",
    es: { a: "Encontrarte a tu ex en la pista", b: "Encontrarte a tu jefe en la barra" },
    ca: { a: "Trobar-te el teu ex a la pista", b: "Trobar-te el teu cap a la barra" },
    en: { a: "Bump into your ex on the dance floor", b: "Bump into your boss at the bar" },
  },
  {
    id: "barra-escenario",
    es: { a: "Bailar encima de la barra", b: "Subir a la cabina con el DJ" },
    ca: { a: "Ballar a sobre de la barra", b: "Pujar a la cabina amb el DJ" },
    en: { a: "Dance on top of the bar", b: "Get up in the booth with the DJ" },
  },
  {
    id: "kebab-churros",
    es: { a: "Kebab a las 5 de la mañana", b: "Churros con chocolate al amanecer" },
    ca: { a: "Kebab a les 5 del matí", b: "Xurros amb xocolata a la sortida del sol" },
    en: { a: "Kebab at 5am", b: "Churros and hot chocolate at sunrise" },
  },
  {
    id: "bueno-garrafon",
    es: { a: "Un solo cubata bueno de 15 €", b: "Tres de garrafón a 5 €" },
    ca: { a: "Un sol cubata bo de 15 €", b: "Tres de garrafa a 5 €" },
    en: { a: "One proper €15 drink", b: "Three dodgy €5 ones" },
  },
  {
    id: "movil-chaqueta",
    es: { a: "Que se te muera el móvil a las 12", b: "Que se pierda tu chaqueta en el ropero" },
    ca: { a: "Que se't mori el mòbil a les 12", b: "Que es perdi la teva jaqueta al guarda-roba" },
    en: { a: "Phone dies at midnight", b: "Cloakroom loses your jacket" },
  },
  {
    id: "dos-quince",
    es: { a: "Salir solo con tu mejor amigo", b: "Salir en un grupo de 15" },
    ca: { a: "Sortir només amb el teu millor amic", b: "Sortir en un grup de 15" },
    en: { a: "Go out with just your best mate", b: "Go out in a group of 15" },
  },
  {
    id: "viral-metro",
    es: { a: "Salir viral cantando a gritos", b: "Que te pillen dormido en el metro" },
    ca: { a: "Fer-te viral cantant a crits", b: "Que t'enxampin adormit al metro" },
    en: { a: "Go viral screaming a song", b: "Get caught asleep on the metro" },
  },
  {
    id: "agua-bailar",
    es: { a: "Solo agua toda la noche, pero bailando a tope", b: "Beber lo que quieras, pero sin poder bailar" },
    ca: { a: "Només aigua tota la nit, però ballant a tope", b: "Beure el que vulguis, però sense poder ballar" },
    en: { a: "Only water all night, but dance like crazy", b: "Drink whatever you want, but no dancing" },
  },
  {
    id: "playa-azotea",
    es: { a: "Fiesta en la playa de la Barceloneta", b: "Fiesta en una azotea con vistas" },
    ca: { a: "Festa a la platja de la Barceloneta", b: "Festa en un terrat amb vistes" },
    en: { a: "Party on Barceloneta beach", b: "Party on a rooftop with a view" },
  },
  {
    id: "botellon-vip",
    es: { a: "Botellón con tus amigos", b: "Reservado VIP con desconocidos" },
    ca: { a: "Botellot amb els teus amics", b: "Reservat VIP amb desconeguts" },
    en: { a: "Drinks in the park with your mates", b: "VIP table with strangers" },
  },
  {
    id: "cancion-bano",
    es: { a: "Que suene tu canción justo al cerrar", b: "Que suene justo cuando estás en el baño" },
    ca: { a: "Que soni la teva cançó just quan tanquen", b: "Que soni just quan ets al lavabo" },
    en: { a: "Your song plays right at closing time", b: "Your song plays while you're in the loo" },
  },
  {
    id: "zapato-llaves",
    es: { a: "Perder un zapato", b: "Perder las llaves de casa" },
    ca: { a: "Perdre una sabata", b: "Perdre les claus de casa" },
    en: { a: "Lose a shoe", b: "Lose your house keys" },
  },
  {
    id: "vermut-ultimo",
    es: { a: "Vermut a las 12 del mediodía", b: "Último cubata a las 6 de la mañana" },
    ca: { a: "Vermut a les 12 del migdia", b: "Últim cubata a les 6 del matí" },
    en: { a: "Vermouth at noon", b: "Last drink at 6am" },
  },
  {
    id: "karaoke-solo",
    es: { a: "Cantar en un karaoke delante de todos", b: "Bailar solo en el centro de la pista" },
    ca: { a: "Cantar en un karaoke davant de tothom", b: "Ballar sol al mig de la pista" },
    en: { a: "Sing karaoke in front of everyone", b: "Dance alone in the middle of the floor" },
  },
  {
    id: "chupito-misterio",
    es: { a: "Un chupito misterioso al que invita el camarero", b: "Pagarte tu cubata de siempre" },
    ca: { a: "Un xupito misteriós que et convida el cambrer", b: "Pagar-te el teu cubata de sempre" },
    en: { a: "A mystery shot on the bartender", b: "Pay for your usual drink" },
  },
  {
    id: "resaca-videos",
    es: { a: "Resaca de dos días", b: "Que te enseñen todos los vídeos de anoche" },
    ca: { a: "Ressaca de dos dies", b: "Que t'ensenyin tots els vídeos d'ahir a la nit" },
    en: { a: "A two-day hangover", b: "Being shown every video from last night" },
  },
  {
    id: "dosmil-verano",
    es: { a: "Solo canciones de los 2000", b: "Solo los temazos de este verano" },
    ca: { a: "Només cançons dels 2000", b: "Només els temazos d'aquest estiu" },
    en: { a: "Only 2000s hits", b: "Only this summer's bangers" },
  },
  {
    id: "festival-tres",
    es: { a: "Un festival de 12 horas", b: "Tres fiestas distintas en una noche" },
    ca: { a: "Un festival de 12 hores", b: "Tres festes diferents en una nit" },
    en: { a: "A 12-hour festival", b: "Three different parties in one night" },
  },
  {
    id: "cerveza-gin",
    es: { a: "Cerveza caliente", b: "Gin-tonic sin hielo" },
    ca: { a: "Cervesa calenta", b: "Gin-tònic sense gel" },
    en: { a: "Warm beer", b: "Gin and tonic with no ice" },
  },
  {
    id: "dj-sonido",
    es: { a: "El DJ más famoso del mundo con mal sonido", b: "Un DJ desconocido con un sonido brutal" },
    ca: { a: "El DJ més famós del món amb mal so", b: "Un DJ desconegut amb un so brutal" },
    en: { a: "The world's biggest DJ with awful sound", b: "An unknown DJ with insane sound" },
  },
  {
    id: "ronda-cola",
    es: { a: "Que te inviten a una ronda", b: "Que te cuelen sin hacer cola" },
    ca: { a: "Que et convidin a una ronda", b: "Que et colin sense fer cua" },
    en: { a: "Someone buys you a round", b: "Someone gets you in without queueing" },
  },
  {
    id: "lunes-sabado",
    es: { a: "Salir un lunes", b: "Quedarte en casa un sábado" },
    ca: { a: "Sortir un dilluns", b: "Quedar-te a casa un dissabte" },
    en: { a: "Go out on a Monday", b: "Stay in on a Saturday" },
  },
]

// ── Tanda 2 (24/10/2026): "quiero que haya muchísimas para muchos días". Formato compacto:
// [id, es A, es B, ca A, ca B, en A, en B]. Mismas reglas: no cambies ids ya publicados.
type PollRow = [string, string, string, string, string, string, string]

const MORE: PollRow[] = [
  ["guiri-local", "Que te confundan con un guiri toda la noche", "Hacer de guía de 6 guiris perdidos", "Que et confonguin amb un guiri tota la nit", "Fer de guia de 6 guiris perduts", "Be mistaken for a tourist all night", "Be tour guide to 6 lost tourists"],
  ["metro-taxi", "Esperar 40 minutos al Nitbus", "Pagar 35 € de taxi", "Esperar 40 minuts el Nitbus", "Pagar 35 € de taxi", "Wait 40 minutes for the night bus", "Pay €35 for a taxi"],
  ["primera-ultima", "Ser el primero en llegar a la fiesta", "Ser el último en irse", "Ser el primer a arribar a la festa", "Ser l'últim a marxar", "Be first to arrive at the party", "Be last to leave"],
  ["dj-pista", "Pinchar tú una hora en un club lleno", "Bailar toda la noche en primera fila", "Punxar tu una hora en un club ple", "Ballar tota la nit a primera fila", "DJ for an hour in a packed club", "Dance front row all night"],
  ["mojito-margarita", "Mojitos toda la noche", "Margaritas toda la noche", "Mojitos tota la nit", "Margarites tota la nit", "Mojitos all night", "Margaritas all night"],
  ["sin-movil", "Salir sin móvil", "Salir sin cartera", "Sortir sense mòbil", "Sortir sense cartera", "Go out without your phone", "Go out without your wallet"],
  ["cumple-boda", "Un cumpleaños en una discoteca", "Una boda con barra libre", "Un aniversari en una discoteca", "Un casament amb barra lliure", "A birthday at a club", "A wedding with an open bar"],
  ["fiesta-casa-club", "Fiesta en casa de un amigo", "Fiesta en el mejor club de la ciudad", "Festa a casa d'un amic", "Festa al millor club de la ciutat", "House party at a friend's", "The best club in the city"],
  ["bailar-cantar", "Saberte todas las letras pero no saber bailar", "Bailar de lujo pero no saberte ninguna letra", "Saber-te totes les lletres però no saber ballar", "Ballar de luxe però no saber-te cap lletra", "Know every lyric but can't dance", "Dance amazingly but know no lyrics"],
  ["cola-ropero", "Una hora de cola en el ropero", "Pasar frío toda la noche sin chaqueta", "Una hora de cua al guarda-roba", "Passar fred tota la nit sense jaqueta", "An hour queueing at the cloakroom", "Freeze all night without a jacket"],
  ["amanecer-playa", "Ver amanecer en la playa", "Dormir 10 horas seguidas", "Veure sortir el sol a la platja", "Dormir 10 hores seguides", "Watch sunrise on the beach", "Sleep 10 hours straight"],
  ["foto-flash", "Que te hagan la foto con flash más fea de tu vida", "Que no quede ni una foto de la noche", "Que et facin la foto amb flaix més lletja de la teva vida", "Que no quedi ni una foto de la nit", "The ugliest flash photo of your life", "No photos of the night at all"],
  ["reggaeton-viejo", "Solo reguetón antiguo", "Solo reguetón de este año", "Només reggaeton antic", "Només reggaeton d'aquest any", "Only old-school reggaeton", "Only this year's reggaeton"],
  ["after-desayuno", "Ir a un after", "Ir a desayunar con todo el grupo", "Anar a un after", "Anar a esmorzar amb tot el grup", "Go to an after-party", "Go for breakfast with the whole group"],
  ["tacones-deportivas", "Tacones toda la noche", "Deportivas que no pegan con nada", "Talons tota la nit", "Esportives que no lliguen amb res", "Heels all night", "Trainers that match nothing"],
  ["camarero-amigo", "Que el camarero sea tu amigo", "Que el DJ sea tu amigo", "Que el cambrer sigui el teu amic", "Que el DJ sigui el teu amic", "The bartender is your friend", "The DJ is your friend"],
  ["vip-pista", "Reservado VIP pero sin poder bajar a la pista", "Pista llena pero sin sitio donde sentarte", "Reservat VIP però sense poder baixar a la pista", "Pista plena però sense lloc on seure", "VIP table but you can't hit the floor", "Packed floor but nowhere to sit"],
  ["shot-sorpresa", "Elegir tú los chupitos de todo el grupo", "Que el grupo elija los tuyos", "Triar tu els xupitos de tot el grup", "Que el grup triï els teus", "Choose everyone's shots", "Let the group choose yours"],
  ["concierto-club", "Concierto de tu artista favorito", "Sesión de tu DJ favorito", "Concert del teu artista preferit", "Sessió del teu DJ preferit", "Your favourite artist live", "Your favourite DJ set"],
  ["borrar-historia", "Borrar todos tus stories de anoche", "Que tu madre los vea todos", "Esborrar totes les teves stories d'ahir", "Que la teva mare les vegi totes", "Delete all of last night's stories", "Your mum watches them all"],
  ["cerveza-vino", "Solo cerveza toda la noche", "Solo vino toda la noche", "Només cervesa tota la nit", "Només vi tota la nit", "Only beer all night", "Only wine all night"],
  ["gintonic-cubalibre", "Gin-tonic", "Cubata de ron con cola", "Gin-tònic", "Cubata de rom amb cola", "Gin and tonic", "Rum and coke"],
  ["festival-lluvia", "Festival con lluvia todo el día", "Festival con 40 grados al sol", "Festival amb pluja tot el dia", "Festival amb 40 graus al sol", "Festival in non-stop rain", "Festival in 40°C sun"],
  ["sant-joan-merce", "Noche de Sant Joan en la playa", "Conciertos de la Mercè", "Revetlla de Sant Joan a la platja", "Concerts de la Mercè", "Sant Joan night on the beach", "La Mercè street concerts"],
  ["gracia-born", "Fiesta por Gràcia", "Fiesta por el Born", "Festa per Gràcia", "Festa pel Born", "Night out in Gràcia", "Night out in El Born"],
  ["olimpic-raval", "Port Olímpic", "Raval", "Port Olímpic", "Raval", "Port Olímpic", "El Raval"],
  ["terraza-sotano", "Terraza con vistas y música floja", "Sótano oscuro con música brutal", "Terrassa amb vistes i música fluixa", "Soterrani fosc amb música brutal", "Rooftop with a view and weak music", "Dark basement with insane music"],
  ["ligar-amigos", "Ligar toda la noche", "Reírte toda la noche con tus amigos", "Lligar tota la nit", "Riure tota la nit amb els teus amics", "Flirt all night", "Laugh all night with your mates"],
  ["bailar-pegados", "Bachata pegados", "Pogo en un concierto de punk", "Bachata enganxats", "Pogo en un concert de punk", "Close bachata dancing", "Moshing at a punk gig"],
  ["karaoke-cancion", "Cantar Bohemian Rhapsody entera", "Cantar Despacito entera", "Cantar Bohemian Rhapsody sencera", "Cantar Despacito sencera", "Sing all of Bohemian Rhapsody", "Sing all of Despacito"],
  ["previa-larga", "Una previa de 4 horas", "Llegar en frío directamente al club", "Una prèvia de 4 hores", "Arribar en fred directament al club", "A 4-hour pre-drinks", "Show up at the club stone cold"],
  ["perder-grupo", "Perder a tu grupo a la 1", "Que tu grupo te pierda a ti a las 4", "Perdre el teu grup a la 1", "Que el teu grup et perdi a tu a les 4", "Lose your group at 1am", "Your group loses you at 4am"],
  ["bano-cola", "Cola de 20 minutos para el baño", "Baño sin pestillo", "Cua de 20 minuts per al lavabo", "Lavabo sense pestell", "20-minute queue for the loo", "A loo with no lock"],
  ["confeti-humo", "Lluvia de confeti cada hora", "Cañón de humo cada hora", "Pluja de confeti cada hora", "Canó de fum cada hora", "Confetti rain every hour", "Smoke cannon every hour"],
  ["entrada-gratis", "Entrada gratis pero copas a 18 €", "Entrada a 25 € con dos copas", "Entrada gratis però copes a 18 €", "Entrada a 25 € amb dues copes", "Free entry but €18 drinks", "€25 entry with two drinks"],
  ["despedida", "Organizar una despedida de soltero", "Sobrevivir a una despedida de soltero ajena", "Organitzar un comiat de solter", "Sobreviure a un comiat de solter aliè", "Plan a stag/hen do", "Survive someone else's stag/hen do"],
  ["disfraz-tema", "Fiesta de disfraces obligatoria", "Fiesta de etiqueta obligatoria", "Festa de disfresses obligatòria", "Festa d'etiqueta obligatòria", "Mandatory fancy-dress party", "Mandatory black-tie party"],
  ["telefono-ex", "Escribir a tu ex a las 4", "Recibir un mensaje de tu ex a las 4", "Escriure al teu ex a les 4", "Rebre un missatge del teu ex a les 4", "Text your ex at 4am", "Get a text from your ex at 4am"],
  ["patatas-pizza", "Pizza a las 5", "Patatas bravas a las 5", "Pizza a les 5", "Patates braves a les 5", "Pizza at 5am", "Patatas bravas at 5am"],
  ["horario-club", "Clubs que cierran a las 3 pero empiezan a las 23", "Clubs que abren a la 1 y cierran a las 7", "Clubs que tanquen a les 3 però comencen a les 23", "Clubs que obren a la 1 i tanquen a les 7", "Clubs open 11pm-3am", "Clubs open 1am-7am"],
  ["fiesta-semana", "Salir solo los jueves", "Salir solo los domingos", "Sortir només els dijous", "Sortir només els diumenges", "Only go out on Thursdays", "Only go out on Sundays"],
  ["cancion-repetida", "Que ponga la misma canción 3 veces en la noche", "Que no ponga ni una que conozcas", "Que posi la mateixa cançó 3 cops a la nit", "Que no posi cap que coneguis", "Same song played 3 times", "Not a single song you know"],
  ["bailar-solo-grupo", "Bailar solo y libre", "Coreografía en grupo ensayada", "Ballar sol i lliure", "Coreografia en grup assajada", "Dance alone and free", "A rehearsed group routine"],
  ["sudor-frio", "Club con calor de sauna", "Club con aire acondicionado polar", "Club amb calor de sauna", "Club amb aire condicionat polar", "Club as hot as a sauna", "Club with arctic air-con"],
  ["vaso-plastico", "Copa buena en vaso de plástico", "Copa mala en copa de cristal", "Copa bona en got de plàstic", "Copa dolenta en copa de vidre", "Good drink in a plastic cup", "Bad drink in a proper glass"],
  ["tinto-sangria", "Tinto de verano", "Sangría", "Tinto de verano", "Sangria", "Tinto de verano", "Sangria"],
  ["cava-champagne", "Cava catalán", "Champán francés", "Cava català", "Xampany francès", "Catalan cava", "French champagne"],
  ["bar-club", "Bar de toda la vida con amigos", "El club de moda con desconocidos", "Bar de tota la vida amb amics", "El club de moda amb desconeguts", "Old-school bar with friends", "Trendy club with strangers"],
  ["viaje-fiesta", "Fin de semana de fiesta en Ibiza", "Fin de semana de fiesta en Berlín", "Cap de setmana de festa a Eivissa", "Cap de setmana de festa a Berlín", "Party weekend in Ibiza", "Party weekend in Berlin"],
  ["fiesta-mayor", "Fiesta mayor de pueblo", "Macrofestival de ciudad", "Festa major de poble", "Macrofestival de ciutat", "Village festival", "Huge city festival"],
  ["correfoc-castells", "Correr en un correfoc", "Subir a un castell", "Córrer en un correfoc", "Pujar a un castell", "Run in a correfoc", "Climb a human tower"],
  ["tardeo-noche", "Tardeo de 17 a 23", "Noche de 1 a 7", "Tardeo de 17 a 23", "Nit d'1 a 7", "Day party 5pm-11pm", "Night party 1am-7am"],
  ["silencio-gritos", "Fiesta de cascos silenciosa", "Fiesta con los altavoces a tope", "Festa de cascos silenciosa", "Festa amb els altaveus a tope", "Silent headphone party", "Speakers at full blast"],
  ["chupito-limon", "Chupito con limón y sal", "Chupito con canela y naranja", "Xupito amb llimona i sal", "Xupito amb canyella i taronja", "Shot with lime and salt", "Shot with cinnamon and orange"],
  ["copa-pagar", "Que cada uno pague lo suyo", "Bote común", "Que cadascú pagui el seu", "Pot comú", "Everyone pays their own", "A shared kitty"],
  ["llegar-tarde", "Llegar a las 2 y que esté a tope", "Llegar a las 12 y que esté vacío", "Arribar a les 2 i que estigui a tope", "Arribar a les 12 i que estigui buit", "Arrive at 2 and it's packed", "Arrive at 12 and it's empty"],
  ["puerta-dresscode", "Que te echen por la ropa", "Que te echen por ir con mucho grupo", "Que et facin fora per la roba", "Que et facin fora per anar amb molt grup", "Turned away for your outfit", "Turned away for your group size"],
  ["playlist-dj", "Pinchar tu playlist en casa de un amigo", "Que te dejen el aux en el coche", "Punxar la teva playlist a casa d'un amic", "Que et deixin l'aux al cotxe", "DJ your playlist at a house party", "Get the aux in the car"],
  ["noche-vieja", "Nochevieja en casa con amigos", "Nochevieja en un club con entrada de 80 €", "Cap d'any a casa amb amics", "Cap d'any en un club amb entrada de 80 €", "NYE at home with friends", "NYE at an €80 club"],
  ["uvas-cava", "Comerte las uvas a tiempo", "Brindar con cava sin uvas", "Menjar-te el raïm a temps", "Brindar amb cava sense raïm", "Eat all 12 grapes on time", "Toast with cava, no grapes"],
  ["halloween-disfraz", "Disfraz currado de Halloween", "Ir de calle y ser el único", "Disfressa currada de Halloween", "Anar de carrer i ser l'únic", "Elaborate Halloween costume", "Go as yourself and be the only one"],
  ["carnaval-sitges", "Carnaval de Sitges", "Carnaval de Cádiz", "Carnaval de Sitges", "Carnaval de Cadis", "Sitges carnival", "Cádiz carnival"],
  ["sonar-primavera", "Sónar", "Primavera Sound", "Sónar", "Primavera Sound", "Sónar", "Primavera Sound"],
  ["cruilla-brunch", "Cruïlla", "Brunch Electronik", "Cruïlla", "Brunch Electronik", "Cruïlla", "Brunch Electronik"],
  ["altura-sotano", "Bailar en una azotea a 100 metros", "Bailar en un búnker bajo tierra", "Ballar en un terrat a 100 metres", "Ballar en un búnquer sota terra", "Dance on a rooftop 100m up", "Dance in an underground bunker"],
  ["barco-playa", "Fiesta en barco", "Fiesta en chiringuito", "Festa en vaixell", "Festa en xiringuito", "Boat party", "Beach bar party"],
  ["bebida-nueva", "Probar un cóctel rarísimo", "Pedir lo de siempre", "Provar un còctel raríssim", "Demanar el de sempre", "Try a weird cocktail", "Order your usual"],
  ["agua-gratis", "Agua gratis en todos los clubs", "Ropero gratis en todos los clubs", "Aigua gratis a tots els clubs", "Guarda-roba gratis a tots els clubs", "Free water in every club", "Free cloakroom in every club"],
  ["dormir-tren", "Dormirte en el bus y acabar en la otra punta", "Dormirte en el sofá de un amigo", "Adormir-te al bus i acabar a l'altra punta", "Adormir-te al sofà d'un amic", "Fall asleep on the bus, wake up across town", "Crash on a friend's sofa"],
  ["mejor-amigo-ligue", "Que tu mejor amigo liga con tu crush", "Que tu crush te ignore toda la noche", "Que el teu millor amic lligui amb el teu crush", "Que el teu crush t'ignori tota la nit", "Your best mate pulls your crush", "Your crush ignores you all night"],
  ["baile-oficial", "Bailar la Macarena", "Bailar el Aserejé", "Ballar la Macarena", "Ballar l'Aserejé", "Dance the Macarena", "Dance the Ketchup Song"],
  ["clasico-nuevo", "Solo clásicos de los 80", "Solo hits de los 90", "Només clàssics dels 80", "Només èxits dels 90", "Only 80s classics", "Only 90s hits"],
  ["house-techno", "House", "Techno", "House", "Techno", "House", "Techno"],
  ["latino-indie", "Latino", "Indie", "Llatí", "Indie", "Latin", "Indie"],
  ["rumba-flamenco", "Rumba catalana", "Flamenquito", "Rumba catalana", "Flamenquet", "Catalan rumba", "Flamenco pop"],
  ["trap-rock", "Trap", "Rock de toda la vida", "Trap", "Rock de tota la vida", "Trap", "Classic rock"],
  ["vinilo-digital", "DJ con vinilos", "DJ con portátil", "DJ amb vinils", "DJ amb portàtil", "Vinyl DJ", "Laptop DJ"],
  ["luz-oscuro", "Club oscuro total", "Club lleno de láseres", "Club fosc total", "Club ple de làsers", "Pitch-black club", "Club full of lasers"],
  ["camiseta-sudor", "Volver con la camiseta empapada", "Volver sin haber sudado nada", "Tornar amb la samarreta xopa", "Tornar sense haver suat gens", "Come home drenched in sweat", "Come home not having broken a sweat"],
  ["eco-sordo", "Pitido en los oídos 2 días", "Afonía 2 días", "Xiulet a les orelles 2 dies", "Afonia 2 dies", "Ears ringing for 2 days", "Losing your voice for 2 days"],
  ["primera-cita-club", "Primera cita en un club", "Primera cita en un karaoke", "Primera cita en un club", "Primera cita en un karaoke", "First date at a club", "First date at karaoke"],
  ["grupo-impar", "Ser el único soltero del grupo", "Ser el único con pareja del grupo", "Ser l'únic solter del grup", "Ser l'únic amb parella del grup", "Only single one in the group", "Only one in a couple"],
  ["mama-llama", "Que te llame tu madre a las 3", "Que te llame tu jefe a las 3", "Que et truqui la teva mare a les 3", "Que et truqui el teu cap a les 3", "Mum calls you at 3am", "Boss calls you at 3am"],
  ["bateria-5", "5 % de batería a la 1", "Batería llena pero sin cobertura", "5 % de bateria a la 1", "Bateria plena però sense cobertura", "5% battery at 1am", "Full battery but no signal"],
  ["selfie-video", "Grabar toda la noche", "No sacar el móvil ni una vez", "Gravar tota la nit", "No treure el mòbil ni un cop", "Film the whole night", "Never take your phone out"],
  ["mesa-barra", "Pedir en barra con 3 filas de gente", "Mesa con camarero pero el doble de caro", "Demanar a la barra amb 3 files de gent", "Taula amb cambrer però el doble de car", "Order at a 3-deep bar", "Table service at double price"],
  ["agua-copa", "Una copa, un vaso de agua", "Agua solo cuando ya es tarde", "Una copa, un got d'aigua", "Aigua només quan ja és tard", "One drink, one water", "Water only when it's too late"],
  ["viernes-sabado", "Salir viernes y sábado", "Salir solo el sábado pero hasta el final", "Sortir divendres i dissabte", "Sortir només dissabte però fins al final", "Out Friday and Saturday", "Only Saturday but till close"],
  ["nueva-gente", "Hacer 5 amigos nuevos en una noche", "Reencontrarte con un amigo de hace años", "Fer 5 amics nous en una nit", "Retrobar un amic de fa anys", "Make 5 new friends in one night", "Bump into an old friend"],
  ["idioma-guiri", "Ligar en inglés", "Ligar en catalán", "Lligar en anglès", "Lligar en català", "Flirt in English", "Flirt in Catalan"],
  ["paella-domingo", "Paella el domingo con resaca", "Caldo y sofá el domingo", "Paella el diumenge amb ressaca", "Brou i sofà el diumenge", "Hungover Sunday paella", "Broth and sofa Sunday"],
  ["chiringuito-club", "Chiringuito al atardecer", "Club a medianoche", "Xiringuito al capvespre", "Club a mitjanit", "Beach bar at sunset", "Club at midnight"],
  ["ruta-bares", "Ruta de 8 bares", "Un solo sitio toda la noche", "Ruta de 8 bars", "Un sol lloc tota la nit", "An 8-bar crawl", "One place all night"],
  ["happy-hour", "Happy hour a las 19", "Copa de madrugada sin descuento", "Happy hour a les 19", "Copa de matinada sense descompte", "Happy hour at 7pm", "Full-price drink at 3am"],
  ["fiesta-tematica", "Fiesta de los 2000", "Fiesta de los 80", "Festa dels 2000", "Festa dels 80", "2000s party", "80s party"],
  ["bailarin-pro", "Bailar como un profesional una noche", "Cantar como un profesional una noche", "Ballar com un professional una nit", "Cantar com un professional una nit", "Dance like a pro for one night", "Sing like a pro for one night"],
  ["entrada-lista", "Entrar por lista", "Comprar entrada anticipada", "Entrar per llista", "Comprar entrada anticipada", "Get in on the guest list", "Buy a ticket in advance"],
  ["club-pequeno", "Club pequeño con 100 personas", "Macroclub con 3.000 personas", "Club petit amb 100 persones", "Macroclub amb 3.000 persones", "Small club, 100 people", "Mega club, 3,000 people"],
  ["salir-lluvia", "Salir con lluvia torrencial", "Quedarse en casa el mejor sábado del año", "Sortir amb pluja torrencial", "Quedar-se a casa el millor dissabte de l'any", "Go out in a downpour", "Stay in on the best Saturday of the year"],
  ["gorra-gafas", "Gafas de sol en la discoteca", "Gorra en la discoteca", "Ulleres de sol a la discoteca", "Gorra a la discoteca", "Sunglasses in the club", "Cap in the club"],
  ["olor-humo", "Volver oliendo a humo", "Volver oliendo a alcohol derramado", "Tornar fent pudor de fum", "Tornar fent pudor d'alcohol vessat", "Come home smelling of smoke", "Come home smelling of spilt drinks"],
  ["mejor-fiesta", "Repetir tu mejor noche de fiesta", "Vivir una noche totalmente nueva", "Repetir la teva millor nit de festa", "Viure una nit totalment nova", "Relive your best night out", "Live a totally new one"],
  ["dj-peticion", "Que el DJ acepte todas tus peticiones", "Que el DJ te sorprenda toda la noche", "Que el DJ accepti totes les teves peticions", "Que el DJ et sorprengui tota la nit", "DJ takes all your requests", "DJ surprises you all night"],
  ["fiesta-pijamas", "Fiesta en pijama", "Fiesta en bañador", "Festa en pijama", "Festa en banyador", "Pyjama party", "Swimwear party"],
  ["chupitos-ruleta", "Ruleta de chupitos", "Beer pong", "Ruleta de xupitos", "Beer pong", "Shot roulette", "Beer pong"],
  ["juego-yo-nunca", "Yo nunca", "Verdad o reto", "Jo mai", "Veritat o repte", "Never have I ever", "Truth or dare"],
  ["borracho-sobrio", "Ser el más sobrio del grupo", "Ser el más animado del grupo", "Ser el més sobri del grup", "Ser el més animat del grup", "Be the soberest in the group", "Be the life of the party"],
  ["tiktok-baile", "Aprender el baile viral del momento", "Inventarte tu propio baile", "Aprendre el ball viral del moment", "Inventar-te el teu propi ball", "Learn the viral dance", "Invent your own dance"],
  ["camello-cola", "Pagar 10 € por saltarte la cola", "Esperar una hora gratis", "Pagar 10 € per saltar-te la cua", "Esperar una hora gratis", "Pay €10 to skip the queue", "Wait an hour for free"],
  ["fiesta-oficina", "Fiesta de empresa con barra libre", "Fiesta con tus amigos pagando tú", "Festa d'empresa amb barra lliure", "Festa amb els teus amics pagant tu", "Office party with open bar", "Party with friends on your dime"],
  ["vecino-musica", "Vecino de fiesta cada noche", "Vecino que llama a la policía por todo", "Veí de festa cada nit", "Veí que truca a la policia per tot", "Neighbour who parties nightly", "Neighbour who calls the cops for anything"],
  ["mar-piscina", "Fiesta en la piscina", "Fiesta en el mar", "Festa a la piscina", "Festa al mar", "Pool party", "Sea party"],
  ["canciones-desamor", "Noche de canciones de desamor", "Noche de canciones para venirse arriba", "Nit de cançons de desamor", "Nit de cançons per venir-se amunt", "Heartbreak songs night", "Hype songs night"],
  ["mismo-outfit", "Llevar el mismo outfit que otra persona", "Ser el único mal vestido", "Portar el mateix outfit que una altra persona", "Ser l'únic mal vestit", "Same outfit as someone else", "Only one badly dressed"],
  ["aplausos-dj", "Aplaudir al DJ al final", "Pedir \"la última\" tres veces", "Aplaudir el DJ al final", "Demanar \"l'última\" tres cops", "Applaud the DJ at the end", "Shout \"one more\" three times"],
  ["fiesta-lunes-resaca", "Resaca un lunes", "Cansancio un sábado sin haber salido", "Ressaca un dilluns", "Cansament un dissabte sense haver sortit", "Hangover on a Monday", "Tired on a Saturday without going out"],
  ["cerveza-marca", "Estrella", "Moritz", "Estrella", "Moritz", "Estrella", "Moritz"],
  ["vermut-cava", "Vermut con aceitunas", "Cava con jamón", "Vermut amb olives", "Cava amb pernil", "Vermouth with olives", "Cava with jamón"],
  ["sobremesa-fiesta", "Sobremesa que acaba en fiesta", "Fiesta que acaba en desayuno", "Sobretaula que acaba en festa", "Festa que acaba en esmorzar", "Lunch that turns into a party", "Party that turns into breakfast"],
  ["sol-luna", "Fiesta de día al sol", "Fiesta de noche bajo la luna", "Festa de dia al sol", "Festa de nit sota la lluna", "Day party in the sun", "Night party under the moon"],
  ["dj-famoso-gratis", "DJ famoso pagando 60 €", "DJ local gratis", "DJ famós pagant 60 €", "DJ local gratis", "Famous DJ for €60", "Local DJ for free"],
  ["grupo-whatsapp", "Grupo de WhatsApp que organiza todo", "Improvisar toda la noche", "Grup de WhatsApp que ho organitza tot", "Improvisar tota la nit", "WhatsApp group plans everything", "Improvise the whole night"],
  ["salida-emergencia", "Plan B si el club está lleno", "Ir a lo loco", "Pla B si el club és ple", "Anar a la bestiola", "Plan B if the club's full", "Wing it"],
  ["mascara-glitter", "Purpurina por toda la cara", "Pintura fluorescente", "Purpurina per tota la cara", "Pintura fluorescent", "Glitter all over your face", "Neon face paint"],
  ["cancion-entrada", "Que suene tu canción al entrar", "Que suene tu canción al salir", "Que soni la teva cançó en entrar", "Que soni la teva cançó en sortir", "Your song as you walk in", "Your song as you walk out"],
  ["zapatillas-nuevas", "Estrenar zapatillas blancas", "Que te las pisen 50 veces", "Estrenar sabatilles blanques", "Que te les trepitgin 50 cops", "Debut new white trainers", "Get them trodden on 50 times"],
  ["madrugar-domingo", "Madrugar el domingo para correr", "Dormir hasta las 3 de la tarde", "Matinar el diumenge per córrer", "Dormir fins a les 3 de la tarda", "Up early Sunday for a run", "Sleep till 3pm"],
  ["boliche-bolera", "Bolera y cervezas", "Karts y cervezas", "Bitlles i cerveses", "Karts i cerveses", "Bowling and beers", "Go-karts and beers"],
  ["escape-fiesta", "Escape room antes de salir", "Cena larga antes de salir", "Escape room abans de sortir", "Sopar llarg abans de sortir", "Escape room before going out", "Long dinner before going out"],
  ["cena-tapas", "Cena de tapas", "Cena de restaurante elegante", "Sopar de tapes", "Sopar de restaurant elegant", "Tapas dinner", "Fancy restaurant dinner"],
  ["copa-balcon", "Copas en un balcón con vistas", "Copas en una plaza llena de gente", "Copes en un balcó amb vistes", "Copes en una plaça plena de gent", "Drinks on a balcony with a view", "Drinks in a busy square"],
  ["cancion-coro", "Cantar a coro con todo el club", "Escuchar en silencio un temazo", "Cantar a cor amb tot el club", "Escoltar en silenci un temazo", "Sing along with the whole club", "Listen silently to a banger"],
  ["tipsy-zapatos", "Volver descalzo", "Volver con ampollas", "Tornar descalç", "Tornar amb butllofes", "Walk home barefoot", "Walk home with blisters"],
  ["foto-polaroid", "Fotomatón en la fiesta", "Fotógrafo profesional en la fiesta", "Fotomaton a la festa", "Fotògraf professional a la festa", "Photo booth at the party", "Pro photographer at the party"],
  ["fiesta-sorpresa", "Que te monten una fiesta sorpresa", "Montarle una a tu mejor amigo", "Que et muntin una festa sorpresa", "Muntar-ne una al teu millor amic", "Have a surprise party thrown for you", "Throw one for your best mate"],
  ["coche-musica", "Viaje en coche con música a tope", "Viaje en tren tranquilo", "Viatge en cotxe amb música a tope", "Viatge en tren tranquil", "Road trip with loud music", "Quiet train ride"],
  ["fiesta-norte-sur", "Fiesta en el norte (Bilbao, Santiago...)", "Fiesta en el sur (Sevilla, Málaga...)", "Festa al nord (Bilbao, Santiago...)", "Festa al sud (Sevilla, Màlaga...)", "Party in the north of Spain", "Party in the south of Spain"],
  ["madrid-bcn", "Fiesta en Madrid", "Fiesta en Barcelona", "Festa a Madrid", "Festa a Barcelona", "Night out in Madrid", "Night out in Barcelona"],
  ["fiesta-verano-invierno", "Fiesta de verano", "Fiesta de invierno", "Festa d'estiu", "Festa d'hivern", "Summer party", "Winter party"],
  ["dj-set-largo", "Set de 6 horas del mismo DJ", "6 DJs de una hora cada uno", "Set de 6 hores del mateix DJ", "6 DJs d'una hora cadascun", "One DJ, 6-hour set", "Six DJs, an hour each"],
  ["bebida-cara", "Cóctel de 20 € espectacular", "Cerveza de 3 € fresquita", "Còctel de 20 € espectacular", "Cervesa de 3 € fresqueta", "Spectacular €20 cocktail", "Ice-cold €3 beer"],
  ["fila-cero", "Estar en la primera fila de un concierto", "Estar en el reservado con buena vista", "Estar a la primera fila d'un concert", "Estar al reservat amb bona vista", "Front row at a gig", "VIP box with a good view"],
  ["cancion-boda", "Que pongan tu canción en tu boda", "Que la pongan en tu funeral", "Que posin la teva cançó al teu casament", "Que la posin al teu funeral", "Your song at your wedding", "Your song at your funeral"],
  ["frio-calor-cola", "Cola con frío", "Cola con lluvia", "Cua amb fred", "Cua amb pluja", "Queue in the cold", "Queue in the rain"],
  ["mismo-club", "Ir siempre al mismo club", "Probar uno nuevo cada semana", "Anar sempre al mateix club", "Provar-ne un de nou cada setmana", "Always the same club", "A new club every week"],
  ["fiesta-raro", "Fiesta en un museo", "Fiesta en un mercado", "Festa en un museu", "Festa en un mercat", "Party in a museum", "Party in a market"],
  ["noche-tranquila", "Noche de peli y pizza", "Noche loca improvisada", "Nit de peli i pizza", "Nit boja improvisada", "Movie and pizza night", "Spontaneous wild night"],
  ["club-cerrado", "Que cierren tu club favorito", "Que lo llenen de turistas", "Que tanquin el teu club preferit", "Que l'omplin de turistes", "Your favourite club closes", "It fills up with tourists"],
  ["fiesta-anos", "Volver a la fiesta de tus 18", "Saltar a la fiesta de tus 40", "Tornar a la festa dels teus 18", "Saltar a la festa dels teus 40", "Back to your 18th", "Jump to your 40th"],
  ["dj-hermano", "Que tu hermano sea el DJ", "Que tu ex sea el DJ", "Que el teu germà sigui el DJ", "Que el teu ex sigui el DJ", "Your sibling is the DJ", "Your ex is the DJ"],
  ["bailar-tacon-plano", "Bailar subido a una tarima", "Bailar escondido en una esquina", "Ballar dalt d'una tarima", "Ballar amagat en un racó", "Dance up on a podium", "Dance hidden in a corner"],
  ["cerrar-abrir", "Abrir la pista", "Cerrar la pista", "Obrir la pista", "Tancar la pista", "Open the dance floor", "Close the dance floor"],
  ["noche-poema", "Noche que nadie recuerda igual", "Noche que todos cuentan durante años", "Nit que ningú recorda igual", "Nit que tothom explica durant anys", "A night nobody remembers the same", "A night everyone retells for years"],
  ["selfie-espejo", "Selfie en el espejo del baño", "Foto de grupo que nadie sale bien", "Selfie al mirall del lavabo", "Foto de grup on ningú surt bé", "Bathroom mirror selfie", "Group photo where nobody looks good"],
  ["himno-final", "Que la última canción sea un himno", "Que se encienda la luz de golpe", "Que l'última cançó sigui un himne", "Que s'encengui el llum de cop", "Last song is an anthem", "Lights come on without warning"],
  ["portero-amigo", "Ser amigo del portero", "Ser amigo del dueño", "Ser amic del porter", "Ser amic del propietari", "Be mates with the bouncer", "Be mates with the owner"],
  ["boda-baile", "Abrir el baile en una boda", "Cerrar la barra libre en una boda", "Obrir el ball en un casament", "Tancar la barra lliure en un casament", "Open the dancing at a wedding", "Close the open bar at a wedding"],
  ["guiri-fiesta", "Salir con un grupo de Erasmus", "Salir con gente de tu pueblo", "Sortir amb un grup d'Erasmus", "Sortir amb gent del teu poble", "Go out with Erasmus students", "Go out with people from your hometown"],
  ["chupito-fuego", "Chupito en llamas", "Chupito con nata", "Xupito en flames", "Xupito amb nata", "Flaming shot", "Shot with whipped cream"],
  ["copa-pajita", "Copa con pajita", "Copa sin pajita", "Copa amb canyeta", "Copa sense canyeta", "Drink with a straw", "Drink without a straw"],
  ["club-terraza-fumadores", "Pasar la noche en la pista", "Pasar la noche en la terraza", "Passar la nit a la pista", "Passar la nit a la terrassa", "Spend the night on the floor", "Spend the night on the terrace"],
  ["mejor-dia", "Fiesta un martes en un club vacío", "Fiesta un sábado en un club petado", "Festa un dimarts en un club buit", "Festa un dissabte en un club petat", "Tuesday in an empty club", "Saturday in a rammed club"],
  ["canto-fondo", "Que tu grupo cante tu nombre", "Que el DJ diga tu nombre por el micro", "Que el teu grup cridi el teu nom", "Que el DJ digui el teu nom pel micro", "Your group chants your name", "The DJ shouts you out on the mic"],
  ["previa-parque", "Previa en un parque", "Previa en un piso pequeño", "Prèvia en un parc", "Prèvia en un pis petit", "Pre-drinks in a park", "Pre-drinks in a tiny flat"],
  ["cantante-dj", "Ser cantante una noche", "Ser DJ una noche", "Ser cantant una nit", "Ser DJ una nit", "Be a singer for one night", "Be a DJ for one night"],
  ["bano-compartido", "Compartir secretos en la cola del baño", "Hacer amigos en la cola del ropero", "Compartir secrets a la cua del lavabo", "Fer amics a la cua del guarda-roba", "Share secrets in the loo queue", "Make friends in the cloakroom queue"],
  ["foto-portada", "Salir en la foto oficial del club", "Salir en el vídeo aftermovie", "Sortir a la foto oficial del club", "Sortir al vídeo aftermovie", "Be in the club's official photos", "Be in the aftermovie"],
  ["vuelta-andando", "Volver andando una hora", "Volver en bici", "Tornar caminant una hora", "Tornar en bici", "Walk home for an hour", "Cycle home"],
  ["cena-kebab", "Cena de lujo y fiesta corta", "Kebab de cena y fiesta larga", "Sopar de luxe i festa curta", "Kebab per sopar i festa llarga", "Fancy dinner, short night", "Kebab dinner, long night"],
  ["primer-baile", "Bailar con desconocidos", "Bailar solo con tu grupo", "Ballar amb desconeguts", "Ballar només amb el teu grup", "Dance with strangers", "Dance only with your group"],
  ["ultimo-metro", "Coger el último metro", "Esperar al primero", "Agafar l'últim metro", "Esperar el primer", "Catch the last metro", "Wait for the first one"],
  ["botella-agua-cara", "Agua a 5 € en el club", "Salir a la calle a comprarla", "Aigua a 5 € al club", "Sortir al carrer a comprar-la", "€5 water in the club", "Pop outside to buy it"],
  ["fiesta-cumple-propio", "Celebrar tu cumple a lo grande", "Que nadie se acuerde y salir igual", "Celebrar el teu aniversari a lo gran", "Que ningú se'n recordi i sortir igual", "Celebrate your birthday big", "Nobody remembers, go out anyway"],
]

// ── Tanda 3 (30/10/2026): situaciones de fiesta y «qué preferirías» locos. Las últimas 11 hablan de
// bebida y están marcadas en ALCOHOL_POLL_IDS.
const MORE_3: PollRow[] = [
  ["foco-dj", "Que el DJ te señale y tengas que bailar solo 30 segundos", "Salir en la pantalla gigante con cara de susto", "Que el DJ t'assenyali i hagis de ballar sol 30 segons", "Sortir a la pantalla gegant amb cara d'ensurt", "The DJ points at you and you must dance solo for 30 seconds", "Appear on the giant screen looking terrified"],
  ["abrigo-cambiado", "Que en el ropero te den tu abrigo, pero dos tallas más grande", "Recuperar el tuyo con un chicle pegado dentro", "Que al guarda-roba et donin la teva jaqueta, dues talles més gran", "Recuperar la teva amb un xiclet enganxat a dins", "The cloakroom hands you the same coat, two sizes too big", "Get yours back with chewing gum stuck inside"],
  ["bano-sin-luz", "Un baño de club sin luz", "Un baño de club sin papel", "Un lavabo de club sense llum", "Un lavabo de club sense paper", "A club toilet with no light", "A club toilet with no paper"],
  ["codazos-canto", "Que te den un codazo cada vez que levantas los brazos", "Que te canten al oído toda la noche", "Que et donin un cop de colze cada cop que alces els braços", "Que et cantin a cau d'orella tota la nit", "Get elbowed every time you raise your arms", "Have someone sing in your ear all night"],
  ["hombros-concierto", "Llevar a un amigo a hombros todo el concierto", "Ir tú a hombros todo el concierto", "Portar un amic a coll tot el concert", "Anar tu a coll tot el concert", "Carry a friend on your shoulders through the whole gig", "Be carried on someone's shoulders through the whole gig"],
  ["dedicatoria-ex", "Cantarle una balada a tu ex delante de todos", "Que tu ex te dedique una canción por el micro", "Cantar-li una balada al teu ex davant de tothom", "Que el teu ex et dediqui una cançó pel micro", "Sing a ballad to your ex in front of everyone", "Have your ex dedicate a song to you on the mic"],
  ["guardian-grupo", "Ser quien guarda los abrigos y las llaves de todo el grupo", "Ser quien lleva el cargador del móvil de todo el grupo", "Ser qui guarda les jaquetes i les claus de tot el grup", "Ser qui porta el carregador del mòbil de tot el grup", "Be the one holding everyone's coats and keys", "Be the one carrying everyone's phone charger"],
  ["fotografo-ojos", "Ser el fotógrafo oficial del grupo y no salir en ninguna foto", "Salir en todas las fotos, pero siempre con los ojos cerrados", "Ser el fotògraf oficial del grup i no sortir a cap foto", "Sortir a totes les fotos, però sempre amb els ulls tancats", "Be the group's photographer and appear in no photos", "Be in every photo, always with your eyes closed"],
  ["pulsera-sello", "Una pulsera de entrada que no se quita en una semana", "Un sello en la mano que dura un mes", "Una polsera d'entrada que no es treu en una setmana", "Un segell a la mà que dura un mes", "A wristband that won't come off for a week", "A hand stamp that lasts a month"],
  ["luces-corte", "Que enciendan las luces a las 5 y se vea todo", "Que corten la música justo en el estribillo", "Que encenguin els llums a les 5 i es vegi tot", "Que tallin la música just a la tornada", "The lights come on at 5am and you see everything", "The music cuts out right at the chorus"],
  ["selfie-idolo", "Un selfie perfecto con alguien famoso que no conoces", "Un selfie movido con tu mayor ídolo", "Una selfie perfecta amb algú famós que no coneixes", "Una selfie moguda amb el teu màxim ídol", "A perfect selfie with a celebrity you don't know", "A blurry selfie with your biggest idol"],
  ["baile-viral", "Que tu peor baile se haga viral con un millón de vistas", "Que tu mejor baile lo vean solo tres personas", "Que el teu pitjor ball es faci viral, amb un milió de vistes", "Que el teu millor ball el vegin només tres persones", "Your worst dance goes viral with a million views", "Your best dance is seen by only three people"],
  ["hora-seguida", "Una hora seguida de bachata", "Una hora seguida de hardstyle", "Una hora seguida de bachata", "Una hora seguida de hardstyle", "An hour of non-stop bachata", "An hour of non-stop hardstyle"],
  ["cumple-club", "Que todo el club te cante el cumpleaños feliz", "Que el DJ pare la música para felicitarte", "Que tot el club et canti el Per molts anys", "Que el DJ aturi la música per felicitar-te", "The whole club sings happy birthday to you", "The DJ stops the music to wish you happy birthday"],
  ["tarta-cubo", "Una tarta en la cara", "Un cubo de agua fría por la cabeza", "Un pastís a la cara", "Un cubell d'aigua freda pel cap", "A cake smashed in your face", "A bucket of cold water over your head"],
  ["taxi-patinete", "Compartir taxi con cuatro desconocidos", "Volver en patinete eléctrico bajo la lluvia", "Compartir taxi amb quatre desconeguts", "Tornar amb patinet elèctric sota la pluja", "Share a taxi with four strangers", "Ride home on an e-scooter in the rain"],
  ["sala-secreta", "Descubrir una sala secreta con 10 personas y música increíble", "Quedarte en la pista principal, llena hasta los topes", "Descobrir una sala secreta amb 10 persones i música increïble", "Quedar-te a la pista principal, plena de gom a gom", "Find a secret room with 10 people and incredible music", "Stay on the main floor, packed to the walls"],
  ["dj-botones", "Poder saltar 5 canciones en toda la noche", "Poder pedir una canción que sí o sí suena", "Poder saltar 5 cançons en tota la nit", "Poder demanar una cançó que sí o sí sona", "Skip any 5 songs all night", "Request one song that is guaranteed to play"],
  ["musica-gente", "Una fiesta con la mejor música pero casi vacía", "Una fiesta llenísima con música regular", "Una festa amb la millor música però gairebé buida", "Una festa pleníssima amb música regular", "The best music, but almost empty", "Packed to the brim, but so-so music"],
  ["amigo-desastre", "Salir con el amigo que lo pierde todo", "Salir con el que se duerme en cualquier sitio", "Sortir amb l'amic que ho perd tot", "Sortir amb el que s'adorm a qualsevol lloc", "Go out with the friend who loses everything", "Go out with the friend who falls asleep anywhere"],
  ["amigo-cinco-min", "Salir con el que siempre dice «cinco minutos más»", "Salir con el que se va a casa a las 12 sin avisar", "Sortir amb el que sempre diu «cinc minuts més»", "Sortir amb el que se'n va a casa a les 12 sense avisar", "Go out with the friend who always says «five more minutes»", "Go out with the friend who vanishes home at midnight"],
  ["espuma-holi", "Fiesta de espuma", "Fiesta de polvos de colores", "Festa d'escuma", "Festa de pols de colors", "Foam party", "Colour-powder party"],
  ["fiesta-transporte", "Fiesta en un tren en marcha", "Fiesta en un autobús turístico de dos pisos", "Festa en un tren en marxa", "Festa en un autobús turístic de dos pisos", "Party on a moving train", "Party on a double-decker tour bus"],
  ["ano-fiesta", "Un año de fiesta solo con tus amigos de siempre", "Un año conociendo gente nueva cada noche", "Un any de festa només amb els teus amics de sempre", "Un any coneixent gent nova cada nit", "A year of partying only with your usual friends", "A year meeting new people every night"],
  ["remix-raros", "Que el DJ solo ponga remixes de canciones infantiles", "Que el DJ solo ponga remixes de sintonías de anuncios", "Que el DJ només posi remixos de cançons infantils", "Que el DJ només posi remixos de sintonies d'anuncis", "The DJ plays only remixes of nursery rhymes", "The DJ plays only remixes of advert jingles"],
  ["flashmob", "Una coreografía con 300 personas a la vez", "Un baile libre y caótico, cada uno a lo suyo", "Una coreografia amb 300 persones alhora", "Un ball lliure i caòtic, cadascú per la seva", "A 300-person synchronised dance", "A free-for-all chaotic dance floor"],
  ["entrada-secreta", "Entrar a un club por una puerta secreta con contraseña", "Entrar a un club por la cocina de un restaurante", "Entrar a un club per una porta secreta amb contrasenya", "Entrar a un club per la cuina d'un restaurant", "Enter a club through a secret door with a password", "Enter a club through a restaurant kitchen"],
  ["fiesta-cueva", "Fiesta en una cueva", "Fiesta en un faro", "Festa en una cova", "Festa en un far", "Party in a cave", "Party in a lighthouse"],
  ["sitio-altavoz", "Que te toque siempre el sitio pegado al altavoz", "Que te toque siempre el sitio más lejos de todo", "Que et toqui sempre el lloc enganxat a l'altaveu", "Que et toqui sempre el lloc més lluny de tot", "Always end up right next to the speaker", "Always end up the furthest from everything"],
  ["disfraz-hinchable", "Ir a la fiesta con un disfraz hinchable de dinosaurio", "Ir a la fiesta disfrazado de porción de pizza gigante", "Anar a la festa amb una disfressa inflable de dinosaure", "Anar a la festa disfressat de porció de pizza gegant", "Go to the party in an inflatable dinosaur costume", "Go to the party dressed as a giant pizza slice"],
  ["acompanante-abuela", "Salir de fiesta con tu abuela", "Salir de fiesta con tu profesor favorito", "Sortir de festa amb la teva àvia", "Sortir de festa amb el teu professor preferit", "Go out partying with your grandma", "Go out partying with your favourite teacher"],
  ["padres-fiesta", "Que tus padres elijan la música de tu cumple", "Que tus padres se queden toda la noche en tu fiesta", "Que els teus pares triïn la música del teu aniversari", "Que els teus pares es quedin tota la nit a la teva festa", "Your parents pick the music for your birthday", "Your parents stay all night at your party"],
  ["playa-altavoz", "Que se quede sin batería el altavoz en plena fiesta en la playa", "Que se levante viento y se lleve la sombrilla y la comida", "Que es quedi sense bateria l'altaveu en plena festa a la platja", "Que s'aixequi vent i s'emporti el para-sol i el menjar", "The speaker dies mid-party on the beach", "The wind blows away the parasol and all the food"],
  ["rima-opera", "Hablar solo en rimas todo el día", "Hablar solo cantando ópera todo el día", "Parlar només en rimes tot el dia", "Parlar només cantant òpera tot el dia", "Speak only in rhymes all day", "Speak only in opera singing all day"],
  ["superpoder-inutil", "Volar, pero solo a un metro del suelo", "Ser invisible, pero solo cuando nadie te mira", "Volar, però només a un metre del terra", "Ser invisible, però només quan ningú et mira", "Fly, but only one metre off the ground", "Be invisible, but only when nobody's looking"],
  ["banda-comentarista", "Que una banda de mariachis te siga a todas partes", "Que un narrador de documental comente todo lo que haces", "Que una banda de mariachis et segueixi a tot arreu", "Que un narrador de documental comenti tot el que fas", "A mariachi band follows you everywhere", "A nature-documentary narrator comments on everything you do"],
  ["vivir-sitio", "Vivir dentro de una discoteca", "Vivir dentro de un centro comercial", "Viure dins d'una discoteca", "Viure dins d'un centre comercial", "Live inside a nightclub", "Live inside a shopping mall"],
  ["estornudo-confeti", "Estornudar confeti", "Tener hipo con sonido de bocina", "Esternudar confeti", "Tenir singlot amb so de botzina", "Sneeze confetti", "Hiccup with a honking horn sound"],
  ["entender-animales", "Entender a los perros, pero que sean muy cotillas", "Entender a los gatos, pero que solo te insulten", "Entendre els gossos, però que siguin molt xafarders", "Entendre els gats, però que només t'insultin", "Understand dogs, but they're massive gossips", "Understand cats, but they only insult you"],
  ["pizza-kebab-vida", "Comer solo pizza el resto de tu vida", "Comer solo kebab el resto de tu vida", "Menjar només pizza la resta de la teva vida", "Menjar només kebab la resta de la teva vida", "Eat only pizza for the rest of your life", "Eat only kebab for the rest of your life"],
  ["mentira-bocina", "Que suene una bocina cada vez que mientes", "Que suenen aplausos cada vez que dices la verdad", "Que soni una botzina cada cop que menteixes", "Que sonin aplaudiments cada cop que dius la veritat", "A horn sounds every time you lie", "Applause plays every time you tell the truth"],
  ["teletransporte", "Teletransportarte a casa cuando estés cansado", "Teletransportarte a cualquier club del mundo una vez al mes", "Teletransportar-te a casa quan estiguis cansat", "Teletransportar-te a qualsevol club del món un cop al mes", "Teleport home whenever you're tired", "Teleport to any club in the world once a month"],
  ["lista-vergonzosa", "Que todos vean tu lista de reproducción más vergonzosa", "Que todos vean tu galería de fotos de los últimos 3 meses", "Que tothom vegi la teva llista de reproducció més vergonyosa", "Que tothom vegi la teva galeria de fotos dels últims 3 mesos", "Everyone sees your most embarrassing playlist", "Everyone sees your camera roll from the last 3 months"],
  ["entrada-luchador", "Que suene música épica de luchador cada vez que entras", "Que suenen risas enlatadas cada vez que dices algo", "Que soni música èpica de lluitador cada cop que entres", "Que sonin rialles enllaunades cada cop que dius alguna cosa", "Epic wrestler entrance music plays every time you walk in", "A laugh track plays every time you speak"],
  ["mascota-tamano", "Un hámster del tamaño de un perro como mascota", "Un perro del tamaño de un hámster como mascota", "Un hàmster de la mida d'un gos com a mascota", "Un gos de la mida d'un hàmster com a mascota", "A dog-sized hamster as a pet", "A hamster-sized dog as a pet"],
  ["baile-involuntario", "Bailar sin querer cada vez que suena música en el súper", "Cantar sin querer cada vez que oyes una canción en el metro", "Ballar sense voler cada cop que sona música al súper", "Cantar sense voler cada cop que sents una cançó al metro", "Dance involuntarily whenever music plays in the supermarket", "Sing involuntarily whenever you hear a song on the metro"],
  ["tono-vergonzoso", "Que tu móvil suene con una canción vergonzosa en una entrevista", "Que te suene la alarma en mitad del cine", "Que el teu mòbil soni amb una cançó vergonyosa en una entrevista", "Que et soni l'alarma enmig del cinema", "Your phone blasts an embarrassing song in a job interview", "Your alarm goes off in the middle of the cinema"],
  ["saber-cancion", "Saber siempre qué canción va a poner el DJ", "Saber siempre quién te va a escribir", "Saber sempre quina cançó posarà el DJ", "Saber sempre qui t'escriurà", "Always know the DJ's next song", "Always know who's about to text you"],
  ["semana-sin", "Una semana sin música", "Una semana sin salir de casa", "Una setmana sense música", "Una setmana sense sortir de casa", "A week without music", "A week without leaving the house"],
  ["fama-rara", "Ser famoso en todo el mundo por un baile malísimo", "Ser el mejor del mundo en algo, pero que nadie lo sepa", "Ser famós a tot el món per un ball dolentíssim", "Ser el millor del món en alguna cosa, però que ningú ho sàpiga", "Be world-famous for a terrible dance", "Be the best in the world at something, but nobody knows"],
  ["entrada-musica", "Entrar gratis a todos los clubs, pero sin elegir la música", "Pagar siempre 30 €, pero elegir tú la música", "Entrar gratis a tots els clubs, però sense triar la música", "Pagar sempre 30 €, però triar tu la música", "Free entry to every club, but no say in the music", "Always pay €30, but you pick the music"],
  ["disfraz-animal", "Fiesta donde todo el mundo va disfrazado de animal", "Fiesta donde todo el mundo va de personaje histórico", "Festa on tothom va disfressat d'animal", "Festa on tothom va de personatge històric", "A party where everyone dresses as an animal", "A party where everyone dresses as a historical figure"],
  ["ciudad-noche", "Vivir en una ciudad donde siempre es de noche", "Vivir en una ciudad donde nunca anochece", "Viure en una ciutat on sempre és de nit", "Viure en una ciutat on mai es fa de nit", "Live in a city where it's always night", "Live in a city where it never gets dark"],
  ["despertar-fiesta", "Despertarte cada mañana con tu canción favorita a todo volumen", "Despertarte cada mañana con la voz de tu madre", "Despertar-te cada matí amb la teva cançó preferida a tot volum", "Despertar-te cada matí amb la veu de la teva mare", "Wake up every morning to your favourite song at full volume", "Wake up every morning to your mum's voice"],
  ["pausa-rebobinar", "Un botón de pausa de 10 segundos al día", "Un botón de rebobinar 10 segundos al día", "Un botó de pausa de 10 segons al dia", "Un botó de rebobinar 10 segons al dia", "A 10-second pause button once a day", "A 10-second rewind button once a day"],
  ["vuelta-mundo", "Dar la vuelta al mundo solo yendo a clubs", "Dar la vuelta al mundo solo yendo a festivales", "Fer la volta al món només anant a clubs", "Fer la volta al món només anant a festivals", "Travel the world visiting only clubs", "Travel the world visiting only festivals"],
  ["guardaespaldas", "Un guardaespaldas que baila a tu lado toda la noche", "Un mayordomo que lleva tu abrigo y tu móvil", "Un guardaespatlles que balla al teu costat tota la nit", "Un majordom que porta la teva jaqueta i el teu mòbil", "A bodyguard who dances beside you all night", "A butler who carries your coat and phone"],
  ["perfil-madre", "Que tu madre escriba tu perfil de una app de citas", "Que lo escriba tu mejor amigo", "Que la teva mare escrigui el teu perfil d'una app de cites", "Que l'escrigui el teu millor amic", "Your mum writes your dating profile", "Your best friend writes your dating profile"],
  ["casa-loca", "Una piscina de bolas en el salón", "Un tobogán de tu cama al baño", "Una piscina de boles al menjador", "Un tobogan del teu llit al lavabo", "A ball pit in your living room", "A slide from your bed to the bathroom"],
  ["llueve-confeti", "Que llueva confeti en vez de agua", "Que nieve espuma en invierno", "Que plogui confeti en lloc d'aigua", "Que nevi escuma a l'hivern", "Confetti rain instead of water", "Foam snow every winter"],
  ["chasquido-pista", "Convertir cualquier sitio en pista de baile con un chasquido", "Hacer que cualquier cola avance al doble de velocidad", "Convertir qualsevol lloc en pista de ball amb un cop de dits", "Fer que qualsevol cua avanci al doble de velocitat", "Turn anywhere into a dance floor with a snap", "Make any queue move twice as fast"],
  ["risa-relincho", "Soltar un relincho de caballo cada vez que te ríes", "Soltar un canto de gallo cada vez que estornudas", "Deixar anar un renill de cavall cada cop que rius", "Deixar anar un cant de gall cada cop que esternudes", "Whinny like a horse whenever you laugh", "Crow like a rooster whenever you sneeze"],
  ["intercambio-ropa", "Intercambiar toda la ropa con tu mejor amigo por una noche", "Intercambiar los móviles con tu mejor amigo por una noche", "Intercanviar tota la roba amb el teu millor amic per una nit", "Intercanviar els mòbils amb el teu millor amic per una nit", "Swap outfits with your best friend for a night", "Swap phones with your best friend for a night"],
  ["loro-chismoso", "Un loro que repite todo lo que dices a todas horas", "Un loro que cuenta tus secretos a las visitas", "Un lloro que repeteix tot el que dius a totes hores", "Un lloro que explica els teus secrets a les visites", "A parrot that repeats everything you say, all day", "A parrot that tells your secrets to guests"],
  ["voz-dibujo", "Que tu voz suene siempre como un dibujo animado", "Que tu risa suene siempre como un pato de goma", "Que la teva veu soni sempre com un dibuix animat", "Que el teu riure soni sempre com un ànec de goma", "Your voice always sounds like a cartoon", "Your laugh always sounds like a rubber duck"],
  ["puntualidad", "Llegar siempre 2 horas antes a todo", "Llegar siempre 2 horas tarde a todo", "Arribar sempre 2 hores abans a tot", "Arribar sempre 2 hores tard a tot", "Always arrive 2 hours early to everything", "Always arrive 2 hours late to everything"],
  ["amigo-chiste", "Un amigo graciosísimo que repite siempre el mismo chiste", "Un amigo serio que siempre invita a todo", "Un amic graciosíssim que repeteix sempre el mateix acudit", "Un amic seriós que sempre convida a tot", "A hilarious friend who always repeats the same joke", "A serious friend who always pays for everything"],
  ["dormir-tres", "Dormir solo 3 horas por noche y estar siempre fresco", "Dormir 12 horas, pero no poder salir nunca de noche", "Dormir només 3 hores per nit i estar sempre fresc", "Dormir 12 hores, però no poder sortir mai de nit", "Sleep only 3 hours a night and always feel fresh", "Sleep 12 hours but never go out at night"],
  ["mascota-famosa", "Que tu gato tenga un millón de seguidores", "Que tu perro sea la mascota oficial de un club", "Que el teu gat tingui un milió de seguidors", "Que el teu gos sigui la mascota oficial d'un club", "Your cat has a million followers", "Your dog is a club's official mascot"],
  // — con alcohol (solo con cuenta) —
  ["barra-cola-libre", "Barra libre, pero con una hora de cola", "Un cubata caro, pero sin esperar", "Barra lliure, però amb una hora de cua", "Un cubata car, però sense esperar", "Open bar, but an hour's wait", "A pricey drink, but served instantly"],
  ["resaca-noche", "Una noche épica y dos días de resaca", "Una noche normal y cero resaca", "Una nit èpica i dos dies de ressaca", "Una nit normal i zero ressaca", "An epic night and two days of hangover", "An ordinary night and zero hangover"],
  ["camarero-error", "Que el camarero te ponga lo que no has pedido", "Que el camarero te cobre el doble sin que te des cuenta", "Que el cambrer et posi el que no has demanat", "Que el cambrer et cobri el doble sense que te n'adonis", "The bartender serves you something you didn't order", "The bartender charges you double without you noticing"],
  ["hielo-carga", "Cubata con mucho hielo y poco alcohol", "Cubata muy cargado y sin hielo", "Cubata amb molt de gel i poc alcohol", "Cubata molt carregat i sense gel", "A mixed drink with loads of ice and little booze", "A very strong mixed drink with no ice"],
  ["playa-lujo-bebida", "Cerveza en vaso de plástico en la playa", "Copa de cristal en un chiringuito de lujo", "Cervesa en got de plàstic a la platja", "Copa de cristall en un xiringuito de luxe", "Beer in a plastic cup on the beach", "A crystal glass at a posh beach bar"],
  ["dos-por-uno", "Dos copas por una hasta la medianoche", "Una copa gratis a las 5 de la mañana", "Dues copes per una fins a mitjanit", "Una copa gratis a les 5 de la matinada", "Two-for-one drinks until midnight", "One free drink at 5am"],
  ["camarero-fijo", "Que el camarero se acuerde de tu nombre y de lo que pides", "Que te sirva siempre el primero, sin cola", "Que el cambrer recordi el teu nom i què demanes", "Que et serveixi sempre el primer, sense cua", "The bartender remembers your name and your order", "Always get served first, no queue"],
  ["litro-playa", "Sangría de litro en la playa", "Cerveza bien fría en un chiringuito", "Sangria de litre a la platja", "Cervesa ben freda en un xiringuito", "A litre of sangria on the beach", "An ice-cold beer at a beach bar"],
  ["brindis-grupo", "Brindar con 20 personas y que todos hagan un discurso", "Brindar solo con tu mejor amigo, en silencio", "Brindar amb 20 persones i que tothom faci un discurs", "Brindar només amb el teu millor amic, en silenci", "Toast with 20 people, each giving a speech", "Toast with just your best friend, in silence"],
  ["carta-chupitos", "Una carta con 50 chupitos distintos", "Un solo cubata, pero perfecto", "Una carta amb 50 xupitos diferents", "Un sol cubata, però perfecte", "A menu of 50 different shots", "One single perfect mixed drink"],
  ["coctel-show", "Un cóctel que cambia de color", "Un cóctel que sale echando humo", "Un còctel que canvia de color", "Un còctel que surt traient fum", "A cocktail that changes colour", "A cocktail that arrives smoking"],
]

for (const [id, esA, esB, caA, caB, enA, enB] of [...MORE, ...MORE_3]) {
  PARTY_POLLS.push({ id, es: { a: esA, b: esB }, ca: { a: caA, b: caB }, en: { a: enA, b: enB } })
}

// Preguntas que hablan de alcohol: solo se enseñan a quien tiene cuenta (mayores de edad confirmados).
export const ALCOHOL_POLL_IDS: ReadonlySet<string> = new Set([
  "cubata-golpe", "chupito", "rondas-chofer", "bueno-garrafon",
  "agua-bailar", "botellon-vip", "vermut-ultimo", "chupito-misterio",
  "resaca-videos", "cerveza-gin", "ronda-cola", "mojito-margarita",
  "cumple-boda", "shot-sorpresa", "cerveza-vino", "gintonic-cubalibre",
  "previa-larga", "entrada-gratis", "vaso-plastico", "tinto-sangria",
  "cava-champagne", "chupito-limon", "uvas-cava", "bebida-nueva",
  "agua-copa", "paella-domingo", "ruta-bares", "happy-hour",
  "olor-humo", "chupitos-ruleta", "borracho-sobrio", "fiesta-oficina",
  "fiesta-lunes-resaca", "cerveza-marca", "vermut-cava", "boliche-bolera",
  "copa-balcon", "bebida-cara", "boda-baile", "chupito-fuego",
  "copa-pajita", "previa-parque", "camarero-amigo", "mesa-barra",
  "barra-cola-libre", "resaca-noche", "camarero-error", "hielo-carga",
  "playa-lujo-bebida", "dos-por-uno", "camarero-fijo", "litro-playa",
  "brindis-grupo", "carta-chupitos", "coctel-show",
])

export function isAlcoholPoll(poll: PartyPoll): boolean {
  return ALCOHOL_POLL_IDS.has(poll.id)
}

// Día de hoy en Barcelona como número (días desde 1970): la encuesta cambia a medianoche de aquí,
// no a la del navegador de cada uno.
export function madridDayNumber(d: Date = new Date()): number {
  const ymd = d.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" })
  return Math.floor(Date.parse(`${ymd}T00:00:00Z`) / 86400000)
}

// "La encuesta del día": la misma para todo el mundo ese día (así los porcentajes se comparan con
// los de los demás). Hay unas 280 preguntas: más de medio año sin repetir. Si alguien ya votó la de
// hoy en una vuelta anterior, se le da la siguiente que aún no haya votado.
// Sin `allowAlcohol` (por defecto, es decir, sin cuenta) se saltan las de alcohol y se da la siguiente
// que no lo sea: los días en que toca una de alcohol, quien no tiene cuenta ve otra distinta, y el resto
// de días ve la misma que quien sí la tiene (así los porcentajes suman votos de todos).
// Ojo: añadir preguntas nuevas cambia cuál toca cada día a partir de ese momento (no pasa nada).
export function pollOfTheDay(
  voted: Set<string>,
  day: number = madridDayNumber(),
  opts: { allowAlcohol?: boolean } = {}
): PartyPoll | null {
  const allowAlcohol = opts.allowAlcohol === true
  const n = PARTY_POLLS.length
  const start = ((day % n) + n) % n
  for (let k = 0; k < n; k++) {
    const poll = PARTY_POLLS[(start + k) % n]
    if (voted.has(poll.id)) continue
    if (!allowAlcohol && ALCOHOL_POLL_IDS.has(poll.id)) continue
    return poll
  }
  return null
}

export function pollText(poll: PartyPoll, locale: string): PollText {
  if (locale === "es") return poll.es
  if (locale === "ca") return poll.ca
  return poll.en
}
