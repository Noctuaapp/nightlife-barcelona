import ClubCard from "../nightlife/ClubCard"

interface Club {
  id: number
  name: string
  music: string
  neighborhood: string
  price: string
  hours: string
  image: string
  rating: number
  people: number
  badges?: string[]
}

interface CuratedSectionProps {

  title: string

  subtitle: string

  clubs: Club[]
}

export default function CuratedSection({
  title,
  subtitle,
  clubs,
}: CuratedSectionProps) {

  return (

    <section className="mt-24">

      <div className="mb-10 flex items-end justify-between">

        <div>

          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">

            Curated nightlife

          </p>

          <h2 className="mt-3 text-4xl font-black tracking-tight text-white">

            {title}

          </h2>

          <p className="mt-4 max-w-2xl text-zinc-400">

            {subtitle}

          </p>

        </div>

      </div>

      <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">

        {clubs.map((club, index) => (

          <div
            key={club.id}
            className="fade-up"
            style={{
              animationDelay: `${index * 0.08}s`,
            }}
          >

            <ClubCard
              name={club.name}
              music={club.music}
              area={club.neighborhood}
              price={club.price}
              hours={club.hours}
              image={club.image}
              rating={club.rating}
              people={club.people}
              badges={club.badges}
            />

          </div>

        ))}

      </div>

    </section>
  )
}