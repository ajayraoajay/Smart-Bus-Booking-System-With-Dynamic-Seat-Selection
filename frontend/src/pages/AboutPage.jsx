import "./AboutPage.css";

export default function AboutPage() {

  const stats = [
    { value: "8+",   label: "Routes Available" },
    { value: "500+", label: "Seats Booked" },
    { value: "10+",  label: "Bus Schedules" },
    { value: "99%",  label: "Booking Success Rate" },
  ];

  const benefits = [
    "Easy online booking process",
    "Wide network of routes",
    "Verified and safe buses",
    "Comfortable seating options",
    "24/7 customer support",
    "Best price guarantee",
    "Instant booking confirmation",
    "Flexible cancellation policy",
  ];

  const team = [
    { name: "Operations Team", role: "Route & Schedule Management", icon: "⚙️" },
    { name: "Support Team",    role: "Passenger Assistance",         icon: "🎧" },
    { name: "Tech Team",       role: "Platform Development",         icon: "💻" },
  ];

  return (
    <div className="about-page">

      
      <section className="about-hero">
        <div className="about-hero-content">
          <span className="about-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            ABOUT US
          </span>
          <h1 className="about-title">
            Travelling Made <span className="highlight">Simple</span> with BusGo
          </h1>
          <p className="about-subtitle">
            BusGo is a modern bus seat booking platform built to make inter-city travel
            easy, fast, and reliable for every passenger in India.
          </p>
        </div>
        <div className="about-hero-visual">
          <div className="bus-illustration">🚌</div>
        </div>
      </section>

      
      <section className="about-stats">
        {stats.map((s, i) => (
          <div className="stat-card" key={i}>
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      
      <section className="about-story">
        <div className="story-text">
          <h2 className="story-title">Our Story</h2>
          <p>Founded in 2020, BusGo has revolutionized the way people book bus tickets. We started with a simple mission: to make bus travel booking as easy as a few clicks.</p>
          <p>Today, we serve thousands of passengers daily, connecting cities and bringing people closer to their destinations safely and comfortably.</p>
          <p>Our commitment to excellence and customer satisfaction has made us one of the most trusted names in bus travel booking.</p>
        </div>
        <div className="story-visual">
          <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            
            <rect x="10" y="30" width="260" height="110" rx="18" fill="#c7d2fe"/>
            
            <rect x="28" y="52" width="60" height="42" rx="7" fill="#818cf8"/>
            <rect x="108" y="52" width="60" height="42" rx="7" fill="#818cf8"/>
            <rect x="188" y="52" width="60" height="42" rx="7" fill="#818cf8"/>
            
            <rect x="10" y="112" width="260" height="28" rx="0" fill="#a5b4fc"/>
            <rect x="10" y="130" width="260" height="10" rx="0" fill="#a5b4fc"/>
            
            <circle cx="68"  cy="148" r="20" fill="#6366f1"/>
            <circle cx="68"  cy="148" r="10" fill="#c7d2fe"/>
            <circle cx="212" cy="148" r="20" fill="#6366f1"/>
            <circle cx="212" cy="148" r="10" fill="#c7d2fe"/>
            
            <rect x="118" y="85" width="44" height="55" rx="5" fill="#a5b4fc"/>
          </svg>
        </div>
      </section>

      
      <section className="about-mission">
        <div className="mission-card">
          <div className="mission-icon">🎯</div>
          <h2>Our Mission</h2>
          <p>To provide a seamless, transparent, and reliable bus booking experience that saves passengers time and helps bus operators manage their schedules efficiently.</p>
        </div>
        <div className="mission-card">
          <div className="mission-icon">👁️</div>
          <h2>Our Vision</h2>
          <p>To become the leading digital platform for bus travel in India, connecting passengers and operators through smart, simple technology.</p>
        </div>
      </section>

      
      <section className="about-why">
        <h2 className="section-title">Why Travel With Us?</h2>
        <p className="section-subtitle">Benefits that make your journey better</p>
        <div className="benefits-grid">
          {benefits.map((item, i) => (
            <div className="benefit-item" key={i}>
              <span className="benefit-dot" />
              <span className="benefit-text">{item}</span>
            </div>
          ))}
        </div>
      </section>

      
      <section className="about-how">
        <h2 className="section-title">How It Works</h2>
        <div className="steps">
          {[
            { step: "01", title: "Choose Your Route",  desc: "Browse available routes and pick your origin and destination." },
            { step: "02", title: "Select a Schedule",  desc: "Pick a travel date and time that works best for you." },
            { step: "03", title: "Book Your Seat",     desc: "Choose from available seats on the visual seat map." },
            { step: "04", title: "Get Confirmation",   desc: "Receive your unique booking ID instantly after confirming." },
          ].map((s, i) => (
            <div className="step-card" key={i}>
              <span className="step-number">{s.step}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      
      <section className="about-team">
        <h2 className="section-title">Our Teams</h2>
        <div className="team-grid">
          {team.map((t, i) => (
            <div className="team-card" key={i}>
              <div className="team-icon">{t.icon}</div>
              <h3>{t.name}</h3>
              <p>{t.role}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
