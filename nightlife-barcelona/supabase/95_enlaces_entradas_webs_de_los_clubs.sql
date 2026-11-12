-- =====================================================================================
-- Noctua · Enlace de entradas = la página de venta de la WEB DEL PROPIO CLUB · 12/11/2026
-- Ejecutar entero en Supabase › SQL Editor (después del 92 y del 94). Se puede repetir sin problema.
--
-- Qué hace: en cada discoteca pone como «Entradas» la página de SU PROPIA WEB donde se compran las entradas
-- (su agenda con los botones de compra, o su tienda de entradas en su propio dominio). El botón de la ficha lleva
-- ahí y cada clic se anota (Admin › Datos › Clics). Ninguna va a plataformas de la competencia: si el club usa
-- una internamente, es cosa suya y la web del club ya lo enlaza.
-- Cómo está hecho para no equivocarse:
--   · Cada fila exige a la vez el id del club Y que su nombre se parezca (ilike): si el id ya no es ese local, no toca nada.
--   · Solo rellena los que no tienen enlace; nunca pisa uno puesto a mano.
--   · Al final enseña todos los clubs con enlace, para revisarlos.
-- Abiertas y vistas con sus botones de compra: Sala Apolo y Opium. El resto las he sacado de buscadores y del menú
-- de la propia web de cada club; Sutton y Twenties no las pude abrir (su web lo bloquea). Antes de dar nada por bueno,
-- pulsa «Entradas» en 3-4 fichas. Quedan sin enlace: Macarena, Hyde, Downtown, Marula, Club Sauvage, The Garage,
-- Estraperlo (ha cambiado de dominio), Boris (no sé su id) y los demás; esos puedes ponerlos tú a mano en la ficha.
-- =====================================================================================
with v(id, pat, url) as (
  values
    (10,  '%razzmatazz%',     'https://www.salarazzmatazz.com/en/agenda/'),
    (11,  '%apolo%',          'https://www.sala-apolo.com/en/schedule'),
    (12,  '%opium%',          'https://opiumbarcelona.com/en/our-events/'),
    (13,  'ku barcelona%',    'https://www.kubarcelona.com/events'),
    (6,   'pacha%',           'https://www.kubarcelona.com/events'),
    (14,  '%sh_ko%',          'https://shoko.biz/collections/eventos-shoko-barcelona'),
    (15,  '%cdlc%',           'https://cdlcbarcelona.com/en/cdlc-sales/'),
    (16,  '%sutton%',         'https://tickets.suttonbarcelona.com/es/'),
    (17,  '%bling bling%',    'https://blingblingbcn.com/events-calendar/'),
    (18,  '%otto zutz%',      'https://www.ottozutz.com/event'),
    (19,  '%luz de gas%',     'https://luzdegas.com/en/calendar/'),
    (20,  '%moog%',           'https://moogbarcelona.com/es/agenda/'),
    (21,  '%jamboree%dance%', 'https://jamboreejazz.com/es/disco/'),
    (23,  '%city hall%',      'https://www.cityhallbarcelona.com/en-us/event-list'),
    (24,  '%input%',          'https://inputbcn.com/events/'),
    (25,  '%terrrazza%',      'https://laterrrazza.com/tickets/'),
    (26,  'laut',             'https://laut.es/concert'),
    (29,  '%upload%',         'https://sala-upload.com/agenda/'),
    (30,  '%arena%',          'https://tickets.arenadisco.com/es/'),
    (31,  '%safari%',         'https://tickets.safaridiscoclub.com/es/'),
    (33,  '%villarroel%',     'https://www.lafiravillarroel.com/'),
    (36,  '%twenties%',       'https://tickets.twentiesbarcelona.com/en/'),
    (37,  '%wolf%',           'https://wolfbarcelona.com/conciertos/'),
    (215, '%draco%',          'https://dracodisco.com/eventos/')
)
update public.clubs c
set tickets_url = v.url
from v
where c.id = v.id
  and c.name ilike v.pat
  and (c.tickets_url is null or trim(c.tickets_url) = '');

-- Resultado: todos los clubs con enlace de entradas
select id, name, tickets_url
from public.clubs
where tickets_url is not null and trim(tickets_url) <> ''
order by id;
