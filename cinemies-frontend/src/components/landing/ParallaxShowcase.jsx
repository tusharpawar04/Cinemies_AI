import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useCinemiesStore } from '../../store/useCinemiesStore'

gsap.registerPlugin(ScrollTrigger)

// High-quality movie posters - Using reliable image sources
const SHOWCASE_MOVIES = [
  { 
    title: 'Inception', 
    year: '2010', 
    rating: '8.8', 
    poster: 'https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg',
    genre: 'Sci-Fi Thriller',
    color: '#1a1a2e'
  },
  { 
    title: 'Interstellar', 
    year: '2014', 
    rating: '8.7', 
    poster: 'https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg',
    genre: 'Sci-Fi Drama',
    color: '#0a0d18'
  },
  { 
    title: 'Parasite', 
    year: '2019', 
    rating: '8.5', 
    poster: 'https://m.media-amazon.com/images/M/MV5BYWZjMjk3ZTItODQ2ZC00NTY5LWE0ZDYtZTI3MjcwN2Q5NTVkXkEyXkFqcGdeQXVyODk4OTc3MTY@._V1_SX300.jpg',
    genre: 'Thriller',
    color: '#0d0d0d'
  },
  { 
    title: 'The Dark Knight', 
    year: '2008', 
    rating: '9.0', 
    poster: 'https://m.media-amazon.com/images/M/MV5BMTMxNTMwODM0NF5BMl5BanBnXkFtZTcwODAyMTk2Mw@@._V1_SX300.jpg',
    genre: 'Action',
    color: '#0a0a12'
  },
  { 
    title: 'Oppenheimer', 
    year: '2023', 
    rating: '8.3', 
    poster: 'https://m.media-amazon.com/images/M/MV5BMDBmYTZjNjUtN2M1MS00MTQ2LTk2ODgtNzc2M2QyZGE5NTVjXkEyXkFqcGdeQXVyNzAwMjU2MTY@._V1_SX300.jpg',
    genre: 'Biography',
    color: '#1a0f0a'
  },
  { 
    title: 'Dune', 
    year: '2021', 
    rating: '8.0', 
    poster: 'https://m.media-amazon.com/images/M/MV5BN2FjNmEyNWMtYzM0ZS00NjIyLTg5YzYtYThlMGVjNzE1OGViXkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_SX300.jpg',
    genre: 'Sci-Fi Epic',
    color: '#1a1208'
  },
  { 
    title: 'Spider-Man', 
    year: '2023', 
    rating: '8.7', 
    poster: 'https://m.media-amazon.com/images/M/MV5BMmZiNTk1MzktOWNjOS00Yjc3LTkxYjktZTI1ZTQxNWFhY2Q3XkEyXkFqcGdeQXVyMTUzMTg2ODkz._V1_SX300.jpg',
    genre: 'Animation',
    color: '#1a0d1a'
  },
  { 
    title: '3 Idiots', 
    year: '2009', 
    rating: '8.4', 
    poster: 'https://m.media-amazon.com/images/M/MV5BNTkyOGVjMGEtNmQzZi00NzFlLTlhOWQtODYyMDc2ZGJmYzFhXkEyXkFqcGdeQXVyNjU0OTQ0OTY@._V1_SX300.jpg',
    genre: 'Bollywood',
    color: '#0a1008'
  },
]

export default function ParallaxShowcase() {
  const { entryComplete } = useCinemiesStore()
  const sectionRef = useRef()
  const cardsRef = useRef([])

  useEffect(() => {
    if (!entryComplete || !sectionRef.current) return

    const ctx = gsap.context(() => {
      // Cinematic header reveal
      const headerTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
        }
      })

      headerTl
        .from('.parallax-showcase-header .section-eyebrow', {
          opacity: 0,
          y: 30,
          duration: 0.8,
          ease: 'power3.out'
        })
        .from('.parallax-showcase-header .section-title', {
          opacity: 0,
          y: 40,
          duration: 1,
          ease: 'power3.out'
        }, '-=0.5')
        .from('.parallax-showcase-header .section-subtitle', {
          opacity: 0,
          y: 25,
          duration: 0.8,
          ease: 'power2.out'
        }, '-=0.6')

      // Dramatic staggered card reveal with 3D rotation
      cardsRef.current.forEach((card, i) => {
        if (!card) return
        
        gsap.fromTo(card, 
          {
            opacity: 0,
            y: 80,
            rotateY: -15,
            scale: 0.9,
          },
          {
            opacity: 1,
            y: 0,
            rotateY: 0,
            scale: 1,
            duration: 1,
            delay: i * 0.12, // Longer stagger for more dramatic effect
            ease: 'power4.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 55%',
            },
          }
        )
      })

      // Subtle parallax on scroll for cards
      cardsRef.current.forEach((card, i) => {
        if (!card) return
        gsap.to(card, {
          y: (i % 2 === 0 ? -30 : -50),
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.5,
          },
        })
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [entryComplete])

  if (!entryComplete) return null

  return (
    <section ref={sectionRef} className="parallax-showcase">
      {/* Floating parallax decorations */}
      <div className="parallax-floater parallax-floater--1" />
      <div className="parallax-floater parallax-floater--2" />
      <div className="parallax-floater parallax-floater--3" />
      <div className="parallax-floater parallax-floater--ring" />
      <div className="showcase-ambient" />

      <div className="parallax-showcase-header">
        <span className="section-eyebrow">CURATED CINEMA</span>
        <h2 className="section-title">Movies That Move You</h2>
        <p className="section-subtitle">
          From mind-bending thrillers to heartwarming stories — discover cinema across cultures.
        </p>
      </div>

      <div className="showcase-grid">
        {SHOWCASE_MOVIES.map((movie, i) => (
          <div
            key={movie.title}
            ref={el => cardsRef.current[i] = el}
            className="showcase-card"
          >
            <div className="showcase-card-poster">
              <img
                src={movie.poster}
                alt={`${movie.title} poster`}
                loading="lazy"
                draggable="false"
                onError={(e) => {
                  // Fallback to colored gradient if image fails
                  e.target.style.display = 'none'
                  const parent = e.target.parentElement
                  parent.style.background = `linear-gradient(135deg, ${movie.color || '#1a1a2e'}, rgba(17,24,39,0.95))`
                  parent.innerHTML += `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:2rem;opacity:0.3;">🎬</div>`
                }}
              />
            </div>
            <div className="showcase-card-overlay">
              <div className="showcase-card-genre">{movie.genre}</div>
              <div className="showcase-card-title">{movie.title}</div>
              <div className="showcase-card-meta">
                <span>{movie.year}</span>
                <span>•</span>
                <span className="showcase-card-rating">⭐ {movie.rating}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
