import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import logo from "./logo.png";
import Pricing from "./Pricing";
import Contact from "./Contact";

function App() {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

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
            <button className="signup-button">Sign Up</button>
            <button className="login-button">Login</button>
          </div>
        </nav>

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

              {/* Testimonials Section */}
              <section className="testimonials">
                <h2>What Our Clients Say</h2>
                <div className="testimonial-cards">
                  <div className="card">
                    <p>"Aura AI has revolutionized our hiring process. Highly recommended!"</p>
                    <p>- John Doe, CEO of XYZ Corp</p>
                  </div>
                  <div className="card">
                    <p>"The AI interviews are seamless and efficient. Great product!"</p>
                    <p>- Jane Smith, HR Manager at ABC Inc</p>
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
          <p>&copy; 2024 Aura AI. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;