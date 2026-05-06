'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { projects } from '@/data/projects'

gsap.registerPlugin(ScrollTrigger)

export default function ProjectsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const gridRef    = useRef<HTMLDivElement>(null)
  const headRef    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const headItems = headRef.current?.querySelectorAll('.reveal-head')
      if (headItems?.length) {
        gsap.fromTo(
          headItems,
          { y: 28, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out',
            scrollTrigger: { trigger: headRef.current, start: 'top 75%' },
          },
        )
      }

      const cards = gridRef.current?.querySelectorAll('.project-card')
      if (cards?.length) {
        gsap.fromTo(
          cards,
          { y: 45, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.85, stagger: 0.18, ease: 'power3.out',
            scrollTrigger: { trigger: gridRef.current, start: 'top 75%' },
          },
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  const [featured, ...rest] = projects

  return (
    <section ref={sectionRef} id="projetos" className="bg-moss py-24 lg:py-36 relative overflow-hidden">
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, #F4EAD8 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">

        {/* Heading */}
        <div ref={headRef} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
          <div>
            <div className="reveal-head flex items-center gap-3 mb-5">
              <span className="h-px w-8 bg-gold/50" />
              <span className="section-label text-gold/65">Projetos em Destaque</span>
            </div>
            <h2 className="reveal-head font-serif text-4xl lg:text-[2.8rem] text-cream font-light leading-[1.15]">
              Da semente à<br />floresta
            </h2>
          </div>
          <a
            href="#contato"
            className="reveal-head self-start sm:self-auto inline-flex items-center gap-2 text-sm text-sand/70 hover:text-cream transition-colors duration-300 group flex-shrink-0"
          >
            Propor uma parceria
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
              className="group-hover:translate-x-1 transition-transform duration-300">
              <path d="M3 8H13M13 8L9 4M13 8L9 12"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        {/* Editorial grid */}
        <div ref={gridRef} className="grid lg:grid-cols-5 gap-5">
          {/* Featured — large */}
          <Link
            href={`/projetos/${featured.slug}`}
            className="project-card lg:col-span-3 group relative rounded-lg overflow-hidden bg-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <div className="relative h-72 lg:h-96 overflow-hidden">
              <Image
                src={featured.image}
                alt={featured.title}
                fill
                className="object-cover img-zoom"
                sizes="(max-width: 1024px) 90vw, 600px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark/80 via-dark/20 to-transparent" />
            </div>
            <div className="absolute bottom-0 inset-x-0 p-7">
              <span className="inline-block text-[0.65rem] text-gold uppercase mb-2">
                {featured.category}
              </span>
              <h3 className="font-serif text-2xl lg:text-3xl text-cream font-light mb-2 leading-snug">
                {featured.title}
              </h3>
              <p className="text-sand/70 text-sm leading-relaxed max-w-[38ch]">
                {featured.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs text-gold transition-colors group-hover:text-gold/80">
                Ver detalhes do projeto
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                  className="group-hover:translate-x-1 transition-transform duration-300">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </Link>

          {/* Three stacked */}
          <div className="lg:col-span-2 flex flex-col gap-5">
            {rest.map((project) => (
              <Link
                key={project.title}
                href={`/projetos/${project.slug}`}
                className="project-card group relative rounded-lg overflow-hidden bg-forest flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              >
                <div className="relative h-44 lg:h-full min-h-40 overflow-hidden">
                  <Image
                    src={project.image}
                    alt={project.title}
                    fill
                    className="object-cover img-zoom"
                    sizes="(max-width: 1024px) 90vw, 380px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark/85 via-dark/30 to-transparent" />
                </div>
                <div className="absolute bottom-0 inset-x-0 p-5">
                  <span className="inline-block text-[0.65rem] text-gold uppercase mb-1">
                    {project.category}
                  </span>
                  <h3 className="font-serif text-lg text-cream font-light leading-snug mb-1">
                    {project.title}
                  </h3>
                  <p className="text-sand/65 text-xs leading-relaxed">
                    {project.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
