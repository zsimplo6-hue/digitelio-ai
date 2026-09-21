import { useState } from "react";

const testimonials = [
  {
    name: "Aïcha K.",
    text: "J'ai publié mon premier eBook en une soirée. Incroyable gain de temps.",
    photo: "/testimonials/aicha.jpg",
  },
  {
    name: "Marc D.",
    text: "La génération de pages de vente m'a fait gagner des semaines de travail.",
    photo: "/testimonials/marc.jpg",
  },
  {
    name: "Fatou S.",
    text: "Simple, rapide, efficace. Exactement ce qu'il me fallait pour lancer ma formation.",
    photo: "/testimonials/fatou.jpg",
  },
];

function Avatar({ name, photo }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2);

  if (failed) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-digi-gradient font-bold text-white">
        {initials}
      </span>
    );
  }
  return (
    <img
      src={photo}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white shadow-md dark:ring-white/20"
    />
  );
}

export default function Testimonials() {
  // On répète la liste 4 fois pour une boucle sans trou
  const loop = [...testimonials, ...testimonials, ...testimonials, ...testimonials];

  return (
    <section className="overflow-hidden py-16">
      <h2 className="px-6 text-center text-3xl font-bold">
        Ils créent déjà avec <span className="text-gradient">Digitelio AI</span>
      </h2>

      <div className="marquee mt-10">
        <div className="marquee-track">
          {loop.map((t, i) => (
            <figure
              key={i}
              aria-hidden={i >= testimonials.length}
              className="card mx-3 flex w-72 shrink-0 flex-col justify-between sm:w-80"
            >
              <blockquote className="text-digi-navy/70 dark:text-white/70">
                “{t.text}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 font-semibold">
                <Avatar name={t.name} photo={t.photo} />
                {t.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
              }
