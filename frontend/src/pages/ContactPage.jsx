import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ContactPage.css";

export default function ContactPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const numericValue = value.replace(/\D/g, "").slice(0, 10);
      setForm((prev) => ({ ...prev, [name]: numericValue }));
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
      if (formError) setFormError("");
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (formError) setFormError("");
  };

  const validateForm = () => {
    const errs = {};

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      errs.name = "Full name is required.";
    } else if (trimmedName.length < 2) {
      errs.name = "Full name must be at least 2 characters.";
    } else if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
      errs.name = "Full name can only contain letters and spaces.";
    }

    const trimmedEmail = form.email.trim();
    if (!trimmedEmail) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmedEmail)) {
      errs.email = "Please enter a valid email address.";
    }

    const trimmedPhone = form.phone.trim();
    if (!trimmedPhone) {
      errs.phone = "Phone number is required.";
    } else if (!/^\d{10}$/.test(trimmedPhone)) {
      errs.phone = "Phone number must be exactly 10 digits.";
    }

    const trimmedSubject = form.subject.trim();
    if (!trimmedSubject) {
      errs.subject = "Subject is required.";
    } else if (trimmedSubject.length < 3) {
      errs.subject = "Subject must be at least 3 characters.";
    }

    const trimmedMessage = form.message.trim();
    if (!trimmedMessage) {
      errs.message = "Message is required.";
    } else if (trimmedMessage.length < 10) {
      errs.message = "Message must be at least 10 characters.";
    }

    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setFormError("Please fill out all required fields correctly.");
      const firstField = Object.keys(validationErrors)[0];
      const el = document.querySelector(`[name="${firstField}"]`);
      if (el) el.focus();
      return;
    }

    setErrors({});
    setFormError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1000);
  };

  const contactCards = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.17 4 2 2 0 012.18 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
        </svg>
      ),
      color: "blue",
      title: "Phone",
      lines: ["+91 7285983856"],
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
      ),
      color: "green",
      title: "Email",
      lines: ["info@busgo.com"],
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
      color: "purple",
      title: "Address",
      lines: ["Vijayanagar,", "Bangalore,", "India"],
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      color: "orange",
      title: "Business Hours",
      lines: ["Monday - Friday: 8AM - 8PM", "Saturday: 9AM - 6PM", "Sunday: 10AM - 4PM"],
    },
  ];

  const faqs = [
    { q: "How do I book a bus ticket?", a: "Simply select your route, date, choose your seat, and complete the booking with passenger details." },
    { q: "Can I cancel my booking?", a: "Yes, you can cancel your booking by contacting our support team." },
    { q: "How do I make payments for bookings?", a: "First, you need to make the advance payment online. The remaining balance must be paid at the bus." },
    { q: "How early should I arrive at the boarding point?", a: "We recommend arriving at least 15 minutes before the scheduled departure time." },
    { q: "Can I change my seat after booking?", a: "Seat changes are not allowed after confirmation. Please contact the admin for assistance." },
  ];

  return (
    <div className="cp-page">

      
      <div className="cp-page-header">
        <div className="cp-header-inner">
          <span className="cp-header-badge">📬 Contact Us</span>
          <h1 className="cp-page-title">We'd Love to <span className="cp-title-accent">Hear from You</span></h1>
          <p className="cp-page-subtitle">Have a question, feedback, or need help with your booking? Our team is ready to assist you.</p>
          <div className="cp-header-stats">
            <div className="cp-stat">
              <span className="cp-stat-num">24/7</span>
              <span className="cp-stat-label">Support</span>
            </div>
            <div className="cp-stat-divider" />
            <div className="cp-stat">
              <span className="cp-stat-num">&lt;24h</span>
              <span className="cp-stat-label">Response Time</span>
            </div>
            <div className="cp-stat-divider" />
            <div className="cp-stat">
              <span className="cp-stat-num">100%</span>
              <span className="cp-stat-label">Satisfaction</span>
            </div>
          </div>
        </div>
      </div>

      
      <section className="cp-body">

        
        <div className="cp-cards">
          {contactCards.map((card, i) => (
            <div className={`cp-card cp-card-${card.color}`} key={i}>
              <div className={`cp-card-icon cp-icon-${card.color}`}>{card.icon}</div>
              <div className="cp-card-content">
                <h3>{card.title}</h3>
                {card.lines.map((line, j) => <p key={j}>{line}</p>)}
              </div>
            </div>
          ))}
        </div>

        
        <div className="cp-form-wrap">
          {submitted ? (
            <div className="cp-success-state">
              <div className="cp-success-check">✓</div>
              <h3>Message Sent!</h3>
              <p>Thank you for reaching out. We'll get back to you within 24 hours.</p>
              <button
                className="cp-send-again-btn"
                onClick={() => {
                  setSubmitted(false);
                  setForm({ name: "", email: "", phone: "", subject: "", message: "" });
                  setErrors({});
                  setFormError("");
                }}
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <>
              <h2>Send Us a Message</h2>
              {formError && (
                <div className="cp-form-error" role="alert">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}
              <form onSubmit={handleSubmit} className="cp-form" noValidate>
                <div className="cp-form-row">
                  <div className={`cp-field ${errors.name ? "has-error" : ""}`}>
                    <label htmlFor="cp-name">Full Name <span className="cp-req">*</span></label>
                    <input
                      id="cp-name"
                      name="name"
                      type="text"
                      placeholder="Enter your name"
                      value={form.name}
                      onChange={handleChange}
                    />
                    {errors.name && <span className="cp-error-msg">{errors.name}</span>}
                  </div>
                  <div className={`cp-field ${errors.email ? "has-error" : ""}`}>
                    <label htmlFor="cp-email">Email Address <span className="cp-req">*</span></label>
                    <input
                      id="cp-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={form.email}
                      onChange={handleChange}
                    />
                    {errors.email && <span className="cp-error-msg">{errors.email}</span>}
                  </div>
                </div>
                <div className="cp-form-row">
                  <div className={`cp-field ${errors.phone ? "has-error" : ""}`}>
                    <label htmlFor="cp-phone">Phone Number <span className="cp-req">*</span></label>
                    <input
                      id="cp-phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="Enter 10-digit phone number"
                      value={form.phone}
                      onChange={handleChange}
                    />
                    {errors.phone && <span className="cp-error-msg">{errors.phone}</span>}
                  </div>
                  <div className={`cp-field ${errors.subject ? "has-error" : ""}`}>
                    <label htmlFor="cp-subject">Subject <span className="cp-req">*</span></label>
                    <input
                      id="cp-subject"
                      name="subject"
                      type="text"
                      placeholder="Message subject"
                      value={form.subject}
                      onChange={handleChange}
                    />
                    {errors.subject && <span className="cp-error-msg">{errors.subject}</span>}
                  </div>
                </div>
                <div className={`cp-field ${errors.message ? "has-error" : ""}`}>
                  <label htmlFor="cp-message">Message <span className="cp-req">*</span></label>
                  <textarea
                    id="cp-message"
                    name="message"
                    rows={5}
                    placeholder="Write your message here (min 10 characters)..."
                    value={form.message}
                    onChange={handleChange}
                  />
                  {errors.message && <span className="cp-error-msg">{errors.message}</span>}
                </div>
                <button type="submit" className="cp-submit-btn" disabled={loading}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Map Section */}
      <section className="cp-map-section">
        <div className="cp-map-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" width="18" height="18"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>Vijayanagar, Bangalore, India</span>
        </div>
        <div className="cp-map-container">
          <iframe
            title="BusGo Location - Vijayanagar, Bangalore"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15551.8906!2d77.5255!3d12.9716!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDU4JzE3LjgiTiA3N8KwMzInMDkuNiJF!5e0!3m2!1sen!2sin!4v1710000000000!5m2!1sen!2sin"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      
      <section className="cp-faq-section">
        <h2 className="cp-faq-title">Frequently Asked Questions</h2>
        <p className="cp-faq-sub">Quick answers to common questions</p>
        <div className="cp-faq-list">
          {faqs.map((faq, i) => (
            <div className={`cp-faq-item ${openFaq === i ? "open" : ""}`} key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <div className="cp-faq-question">
                <span>{faq.q}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" className="cp-faq-arrow">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
              {openFaq === i && <div className="cp-faq-answer">{faq.a}</div>}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
