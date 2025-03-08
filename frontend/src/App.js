import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import logo from "./images/logo.png";
import Pricing from "./Pricing";
import Contact from "./Contact";
import facebookIcon from "./images/facebook.png";
import linkedinIcon from "./images/linkedin.png";
import instagramIcon from "./images/instagram.png";
import AuthModal from './AuthModal';
import profile from './profile'

function App() {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const updateCursorPosition = (e) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", updateCursorPosition);

    return () => {
      window.removeEventListener("mousemove", updateCursorPosition);
    };
  }, []);

  return (
    <Router>
      <div className="container-fluid">
        {/* Interactive Cursor */}
        <div
          className="cursor"
          style={{
            left: `${cursorPosition.x}px`,
            top: `${cursorPosition.y}px`,
          }}
        ></div>

        {/* Custom Navbar */}
        <nav className="custom-navbar">
          <div className="navbar-left">
            <Link to="/">
              <img src={logo} alt="Logo" className="navbar-logo" />
            </Link>
          </div>
          <div className="navbar-center">
            <div className="nav-links-container">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/pricing" className="nav-link">Pricing</Link>
              <Link to="/contact" className="nav-link">Contact</Link>
            </div>
          </div>
          <div className="navbar-right">
            <button className="signup-button" onClick={() => setIsAuthModalOpen(true)}>
              Sign Up / Login
            </button>
          </div>
        </nav>
        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onRequestClose={() => setIsAuthModalOpen(false)}
        />

        {/* Routes */}
        <Routes>
          <Route path="/" element={
            <>
              {/* Hero Section */}
              <header className="hero">
                <h1>The Future of AI-Powered Interviews</h1>
                <p>Experience seamless AI-driven phone interviews to automate your recruiting process.</p>
                <button className="hero-button" onClick={() => window.location.href = '/pricing'}>Get Started</button>
              </header>

              {/* Features Section */}
              <section className="features">
                <h2>Why Choose Aura AI?</h2>
                <div className="feature-cards">
                  <div className="card">
                    <h3>Efficient Screening</h3>
                    <p>Automate the initial screening process with AI-powered interviews.</p>
                  </div>
                  <div className="card">
                    <h3>24/7 Availability</h3>
                    <p>Conduct interviews anytime, anywhere with our AI interviewer.</p>
                  </div>
                  <div className="card">
                    <h3>Data-Driven Insights</h3>
                    <p>Get detailed analytics and insights from each interview.</p>
                  </div>
                </div>
              </section>

              {/* How it works Section */}
              <section className="how-it-works">
                <h2>How It Works</h2>
                <div className="steps-container">
                  <div className="step">
                    <h3>1. Schedule an Interview</h3>
                    <p>Choose a date and time that works for you, and the candidate.</p>
                  </div>
                  <div className="step">
                    <h3>2. Enter the details</h3>
                    <p>Enter the candidates phone number, job description and job role.</p>
                  </div>
                  <div className="step">
                    <h3>3. Candidate Joins the Interview</h3>
                    <p>Candidates directly receive a interview via phone call—no downloads required.</p>
                  </div>
                  <div className="step">
                    <h3>4. AI Conducts the Interview</h3>
                    <p>Our AI asks tailored questions, evaluates responses, and adapts the conversation in real-time.</p>
                  </div>
                  <div className="step">
                    <h3>5. Data-Driven Insights</h3>
                    <p>Receive a detailed report with scores, insights, and recommendations after the interview.</p>
                  </div>
                  <div className="step">
                    <h3>6. Review and Hire</h3>
                    <p>Compare candidates and make confident hiring decisions with all the data you need.</p>
                  </div>
                </div>
              </section>
            </>
          } />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/contact" element={<Contact />} />
  
        </Routes>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-section">
              <h3>About Us</h3>
              <p>
                Aura AI is revolutionizing the hiring process with AI-powered phone interviews. 
                Our mission is to make recruitment seamless, efficient, and data-driven.
              </p>
            </div>
            <div className="footer-section">
              <h3>Quick Links</h3>
              <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/pricing">Pricing</Link></li>
                <li><Link to="/contact">Contact</Link></li>
                <li><Link to="/privacy-policy">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service">Terms of Service</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Contact Us</h3>
              <ul>
                <li>Email: adyatwr@gmail.com</li>
                <li>Phone: +91 88516 19182</li>
              </ul>
            </div>
            <div className="footer-section">
              <h3>Follow Us</h3>
              <div className="social-links">
                <a href="https://facebook.com/auraai" target="_blank" rel="noopener noreferrer">
                  <img src={facebookIcon} alt="Facebook" />
                </a>
                <a href="https://linkedin.com/company/auraai" target="_blank" rel="noopener noreferrer">
                  <img src={linkedinIcon} alt="LinkedIn" />
                </a>
                <a href="https://instagram.com/auraai" target="_blank" rel="noopener noreferrer">
                  <img src={instagramIcon} alt="Instagram" />
                </a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Aura AI. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;