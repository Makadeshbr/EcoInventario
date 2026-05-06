import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import SmoothScroll from '@/components/SmoothScroll'
import { getProjectBySlug, projects } from '@/data/projects'

type ProjectPageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }))
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params
  const project = getProjectBySlug(slug)

  if (!project) {
    return {
      title: 'Projeto não encontrado | Comunidade Plantaê',
    }
  }

  return {
    title: `${project.title} | Comunidade Plantaê`,
    description: project.description,
    openGraph: {
      title: project.title,
      description: project.description,
      images: [project.image],
      locale: 'pt_BR',
      type: 'article',
    },
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params
  const project = getProjectBySlug(slug)

  if (!project) {
    notFound()
  }

  return (
    <SmoothScroll>
      <Header />
      <main className="bg-cream text-dark">
        <section className="relative overflow-hidden bg-forest pb-20 pt-32 text-cream lg:pb-28 lg:pt-40">
          <div
            className="absolute inset-0 opacity-[0.025] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, #F4EAD8 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
            <div className="flex flex-col justify-end">
              <Link
                href="/#projetos"
                className="mb-10 inline-flex w-fit items-center gap-2 text-sm text-gold/80 transition-colors hover:text-gold"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M13 8H3M3 8L7 4M3 8L7 12"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Voltar para projetos
              </Link>

              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-8 bg-gold/60" />
                <span className="section-label text-gold/75">{project.category}</span>
              </div>
              <h1 className="font-serif text-5xl font-light leading-[1.04] md:text-6xl">
                {project.title}
              </h1>
              <p className="mt-7 max-w-[48ch] text-base leading-[1.8] text-sand/70">
                {project.description}
              </p>

              <div className="mt-10 grid max-w-md grid-cols-2 gap-px bg-white/10">
                <div className="bg-forest/70 px-5 py-4">
                  <span className="block text-[0.68rem] uppercase text-sand/45">Local</span>
                  <span className="mt-1 block font-serif text-xl text-cream">{project.location}</span>
                </div>
                <div className="bg-forest/70 px-5 py-4">
                  <span className="block text-[0.68rem] uppercase text-sand/45">Ano</span>
                  <span className="mt-1 block font-serif text-xl text-cream">{project.year}</span>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-white/10 bg-moss shadow-2xl shadow-black/30">
              <div className="relative aspect-[4/3] lg:aspect-[5/4]">
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 90vw, 640px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest/30 via-transparent to-transparent" />
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-20 lg:py-28">
          <svg
            viewBox="0 0 300 500"
            fill="none"
            className="absolute -right-10 top-16 h-[70%] opacity-[0.07] pointer-events-none"
            aria-hidden="true"
          >
            <path d="M280 490 C240 400 195 310 160 220 C128 138 110 75 115 10"
              stroke="#647A4B" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M195 330 C220 308 250 316 252 340 C228 316 197 327 195 330 Z" fill="#8AAB6A" />
            <path d="M178 300 C155 278 128 286 126 308 C150 284 175 297 178 300 Z" fill="#7A9C5A" />
            <path d="M168 270 C192 250 220 258 220 280 C196 256 170 267 168 270 Z" fill="#8AAB6A" />
          </svg>

          <div className="relative mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.75fr_1fr] lg:px-10">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-8 bg-olive/60" />
                <span className="section-label text-olive">O que foi feito</span>
              </div>
              <h2 className="font-serif text-4xl font-light leading-[1.12] text-dark lg:text-5xl">
                Uma ação simples, com impacto que continua depois do encontro
              </h2>
            </div>

            <div>
              <p className="text-base leading-[1.9] text-dark/60">
                {project.summary}
              </p>

              <div className="mt-10 space-y-4">
                {project.highlights.map((highlight) => (
                  <div key={highlight} className="flex gap-4 border-t border-dark/10 pt-4">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold" />
                    <p className="text-sm leading-[1.8] text-dark/60">{highlight}</p>
                  </div>
                ))}
              </div>

              <div className="mt-12 flex flex-wrap gap-4">
                <Link
                  href="/#contato"
                  className="btn-gold inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-dark"
                >
                  Falar sobre este projeto
                </Link>
                <Link
                  href="/#projetos"
                  className="inline-flex items-center gap-2 rounded-full border border-olive/45 px-6 py-3.5 text-sm text-dark transition-colors hover:border-olive hover:bg-olive hover:text-cream"
                >
                  Ver outros projetos
                </Link>
              </div>
            </div>
          </div>
        </section>
        
        {project.gallery && project.gallery.length > 0 && (
          <section className="bg-cream py-16 lg:py-24 border-t border-dark/[0.04]">
            <div className="max-w-7xl mx-auto px-6 lg:px-10">
              <div className="mb-12 flex items-center justify-center gap-3">
                <span className="h-px w-8 bg-olive/40" />
                <h3 className="font-serif text-2xl text-dark text-center">Registros da Atividade</h3>
                <span className="h-px w-8 bg-olive/40" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {project.gallery.map((imgSrc, i) => (
                  <div key={i} className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg shadow-black/5 group">
                    <Image
                      src={imgSrc}
                      alt={`${project.title} - Registro ${i + 1}`}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
                    />
                    <div className="absolute inset-0 bg-forest/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>
      <Footer />
    </SmoothScroll>
  )
}
