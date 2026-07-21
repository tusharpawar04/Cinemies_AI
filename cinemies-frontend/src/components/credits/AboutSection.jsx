export default function AboutSection() {
  return (
    <section id="about">
      <div className="about-inner">
        <span className="section-eyebrow">What is Cinemies</span>

        <h2 className="about-title">
          We believe the best movies<br />
          find you by <em>feeling</em>,<br />
          not by genre.
        </h2>

        <div className="about-body">
          <p>
            Cinemies is a mood-first movie discovery platform built by students
            who love cinema across every industry — Hollywood, Bollywood, Tollywood,
            and beyond. We were tired of being asked "what genre?" when the real
            question is always "how do you feel right now?"
          </p>
          <p>
            Our AI doesn't just match keywords. It uses semantic vector embeddings
            to understand the emotional frequency of 10,000+ films — then finds
            the ones that resonate with where you are today.
          </p>
          <p>
            This is a student project. It is non-commercial, built for learning,
            and made with deep respect for the art of filmmaking.
          </p>
        </div>

        <div className="about-stats">
          <div className="stat">
            <span className="stat-num">10,000+</span>
            <span className="stat-label">Films indexed</span>
          </div>
          <div className="stat">
            <span className="stat-num">3</span>
            <span className="stat-label">Industries covered</span>
          </div>
          <div className="stat">
            <span className="stat-num">6</span>
            <span className="stat-label">Emotional moods</span>
          </div>
          <div className="stat">
            <span className="stat-num">&lt;50ms</span>
            <span className="stat-label">Avg. recommendation</span>
          </div>
        </div>
      </div>
    </section>
  )
}
