import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function CreditsRoll() {
  const rollRef = useRef()

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(rollRef.current, {
        y: '-60%',
        ease: 'none',
        scrollTrigger: {
          trigger: '#credits',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5,
        }
      })
    })
    return () => ctx.revert()
  }, [])

  return (
    <section id="credits">
      <div ref={rollRef} className="credits-inner">
        <p className="credits-title">CINEMIES</p>
        <p className="credits-subtitle">A Student Project in Film & AI</p>
        <div className="credits-divider" />

        <p className="credits-category">DATA SOURCES</p>
        <div className="credits-row"><span className="credits-role">Movie Database</span><span className="credits-name">The Movie Database (TMDB)</span></div>
        <div className="credits-attribution">tmdb.org · Used under the TMDB API Terms of Service. This product uses the TMDB API but is not endorsed or certified by TMDB.</div>
        <div className="credits-row"><span className="credits-role">Ratings & Rankings</span><span className="credits-name">IMDb (Internet Movie Database)</span></div>
        <div className="credits-attribution">imdb.com · IMDb rating data is the intellectual property of IMDb.com. Used for display purposes only.</div>
        <div className="credits-divider" />

        <p className="credits-category">TRAILERS & CLIPS</p>
        <p className="credits-note">All video content shown consists of official trailers published by studios on YouTube. Cinemies does not host any video content.</p>
        <div className="credits-row"><span className="credits-role">Inception (2010)</span><span className="credits-name">© Warner Bros. Pictures</span></div>
        <div className="credits-row"><span className="credits-role">Bahubali 2 (2017)</span><span className="credits-name">© Arka Media Works / AA Films</span></div>
        <div className="credits-row"><span className="credits-role">Taare Zameen Par (2007)</span><span className="credits-name">© Aamir Khan Productions</span></div>
        <div className="credits-row"><span className="credits-role">3 Idiots (2009)</span><span className="credits-name">© Vinod Chopra Films</span></div>
        <div className="credits-row"><span className="credits-role">Parasite (2019)</span><span className="credits-name">© CJ ENM / Barunson E&A / Neon</span></div>
        <div className="credits-row"><span className="credits-role">Drishyam (2013)</span><span className="credits-name">© Aashirvad Cinemas</span></div>
        <div className="credits-row"><span className="credits-role">Andhadhun (2018)</span><span className="credits-name">© Viacom18 Motion Pictures</span></div>
        <div className="credits-row"><span className="credits-role">Interstellar (2014)</span><span className="credits-name">© Paramount / Warner Bros.</span></div>
        <div className="credits-divider" />

        <p className="credits-category">OPEN SOURCE</p>
        <div className="credits-row"><span className="credits-role">3D Rendering</span><span className="credits-name">Three.js — MIT License</span></div>
        <div className="credits-row"><span className="credits-role">React Renderer</span><span className="credits-name">@react-three/fiber — MIT</span></div>
        <div className="credits-row"><span className="credits-role">Animation</span><span className="credits-name">GSAP — Standard License</span></div>
        <div className="credits-row"><span className="credits-role">Motion</span><span className="credits-name">Framer Motion — MIT License</span></div>
        <div className="credits-row"><span className="credits-role">AI / Embeddings</span><span className="credits-name">sentence-transformers — Apache 2.0</span></div>
        <div className="credits-row"><span className="credits-role">Vector Search</span><span className="credits-name">FAISS — MIT (Facebook AI)</span></div>
        <div className="credits-divider" />

        <p className="credits-category">BUILT BY</p>
        <div className="credits-row"><span className="credits-role">AI / ML Engineer</span><span className="credits-name">Tushar</span></div>
        <div className="credits-row"><span className="credits-role">Institution</span><span className="credits-name">BTech — AI & Data Science</span></div>
        <div className="credits-divider" />

        <p className="credits-category">LEGAL NOTICE</p>
        <p className="credits-note">Cinemies is a non-commercial, educational student project. No revenue is generated. All trailers are embedded from official YouTube channels with attribution.</p>

        <div className="credits-final">
          <p>Made with obsession for cinema</p>
          <p style={{ opacity: 0.4, fontSize: '0.8rem', marginTop: '0.5rem' }}>Cinemies · {new Date().getFullYear()}</p>
        </div>
      </div>
    </section>
  )
}
