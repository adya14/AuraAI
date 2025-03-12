import React, { useState, useEffect } from "react";
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faCalendar, faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { faUser } from '@fortawesome/free-regular-svg-icons';
import "./App.css";
import logo from "./images/logo.png";
import Pricing from "./Pricing";
import Contact from "./Contact";
import facebookIcon from "./images/facebook.png";
import linkedinIcon from "./images/linkedin.png";
import instagramIcon from "./images/instagram.png";
import AuthModal from './AuthModal';
import Profile from './profile';
import axios from 'axios';

function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Track authentication status
  const [user, setUser] = useState(null); // Store user data
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFAQ = (index) => {
    if (activeIndex === index) {
      setActiveIndex(null); // Collapse the FAQ if it's already open
    } else {
      setActiveIndex(index); // Expand the clicked FAQ
    }
  };

  // Navigate to profile page
  const handleProfileClick = () => {
    navigate('/profile');
  };

  // Handle logout
  const handleLogout = () => {
    // Clear authentication data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Update state to reflect logout
    setIsAuthenticated(false);
    setUser(null);

    // Redirect to the home page
    navigate('/');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      const userDataString = localStorage.getItem('user');
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          setUser(userData);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('user'); // Clear invalid data
        }
      }
    }

    // Check for token in the URL (for Google OAuth)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      localStorage.setItem('token', tokenFromUrl);
      axios.get('http://localhost:5000/api/profile', {
        headers: {
          Authorization: `Bearer ${tokenFromUrl}`,
        },
      })
        .then(response => {
          const userData = response.data.user;
          localStorage.setItem('user', JSON.stringify(userData));
          setIsAuthenticated(true);
          setUser(userData);
          navigate('/'); // Redirect to home after successful login
        })
        .catch(error => {
          console.error('Error fetching user profile:', error);
        });
    }

  }, [navigate]);

  // Handle successful login/signup
  const handleAuthSuccess = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    setIsAuthModalOpen(false);
  };

  // ProtectedRoute component
  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/" replace />; // Redirect to home if not authenticated
    }
    return children;
  };

  return (
    <div className="container-fluid">
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
            <Link
              to="/"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault(); // Prevent default navigation
                document.getElementById("pricing").scrollIntoView({ behavior: "smooth" }); // Smooth scroll to pricing section
              }}
            >
              Pricing
            </Link>
            <Link to="/contact" className="nav-link">Contact</Link>
          </div>
        </div>
        <div className="navbar-right">
          {console.log('isAuthenticated:', isAuthenticated)} {/* Debugging */}
          {isAuthenticated ? (
            <>
              <button className="profile-button" onClick={handleProfileClick}>
                <FontAwesomeIcon icon={faUser} className="user-icon" />
                <span className="profile-text">Profile</span>
              </button>
              <button className="logout-button" onClick={handleLogout}>
                <div className="logout-button-content">
                  <FontAwesomeIcon icon={faArrowRightFromBracket} className="logout-icon" /> {/* Use the imported icon here */}
                  <span className="logout-text">Log Out</span>
                </div>
              </button>
            </>
          ) : (
            <button className="signup-button" onClick={() => setIsAuthModalOpen(true)}>
              Login
            </button>
          )}
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onRequestClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess} // Pass the success handler
      />

      {/* Routes */}
      <Routes>
        <Route path="/" element={
          <>
            {/* Hero Section */}
            <header className="hero">
              <h1>The Future of AI-Powered Interviews</h1>
              <p>Experience seamless AI-driven phone interviews to automate your recruiting process.</p>
              <div className="hero-buttons">
              <button
                className="hero-button get-started"
                onClick={() => {
                  document.getElementById("pricing").scrollIntoView({ behavior: "smooth" }); // Smooth scroll to pricing section
                }}
              >
                Get Started
                <span className="icon-arrow">
                  <FontAwesomeIcon icon={faArrowRight} />
                </span>
              </button>
                <button className="hero-button book-call-button" onClick={() => navigate('/contact')}>
                  Book a Call
                  <span className="icon-calendar">
                    <FontAwesomeIcon icon={faCalendar} />
                  </span>
                </button>
              </div>
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

            <Pricing></Pricing>

            {/* How it works */}
             <section className="how-it-works">
               <h2>How It Works</h2>
             
               {/* Point 1 */}
               <div className="point point-1">
                 <div className="point-content">
                   <h3>Schedule an Interview</h3>
                   <p>
                     Easily schedule interviews at your convenience. Select a date and time that works best for both you and the candidate. Our system ensures seamless scheduling with automated reminders for both parties.
                   </p>
                 </div>
                 <div className="point-number">01</div>
               </div>
             
               {/* Point 2 */}
               <div className="point point-2">
                 <div className="point-number">02</div>
                 <div className="point-content">
                   <h3>Enter Candidate Details</h3>
                   <p>
                     Provide the candidate's phone number, job description, and role specifics. Our AI uses this information to tailor the interview questions, ensuring a personalized and relevant experience for each candidate.
                   </p>
                 </div>
               </div>
             
               {/* Point 3 */}
               <div className="point point-3">
                 <div className="point-content">
                   <h3>Candidate Joins the Interview</h3>
                   <p>
                     Candidates receive a direct phone call at the scheduled time—no apps or downloads required. They can join the interview from anywhere, making the process hassle-free and accessible.
                   </p>
                 </div>
                 <div className="point-number">03</div>
               </div>
             
               {/* Point 4 */}
               <div className="point point-4">
                 <div className="point-number">04</div>
                 <div className="point-content">
                   <h3>AI Conducts the Interview</h3>
                   <p>
                     Our advanced AI conducts the interview, asking tailored questions based on the job role. It evaluates responses in real-time, adapts the conversation, and ensures a natural and engaging interaction.
                   </p>
                 </div>
               </div>
             
               {/* Point 5 */}
               <div className="point point-5">
                 <div className="point-content">
                   <h3>Data-Driven Insights</h3>
                   <p>
                     After the interview, receive a comprehensive report with detailed scores, insights, and recommendations. Our AI analyzes key metrics such as communication skills, technical knowledge, and cultural fit.
                   </p>
                 </div>
                 <div className="point-number">05</div>
               </div>
             
               {/* Point 6 */}
               <div className="point point-6">
                 <div className="point-number">06</div>
                 <div className="point-content">
                   <h3>Review and Hire</h3>
                   <p>
                     Compare candidates effortlessly using the data provided. Make confident hiring decisions backed by actionable insights, ensuring you select the best fit for your team.
                   </p>
                 </div>
               </div>
             </section>
            <section className="faq">
              <h2>Frequently Asked Questions</h2>
              <div className="faq-container">
                <div className={`faq-item ${activeIndex === 0 ? "active" : ""}`}>
                  <button className="faq-question" onClick={() => toggleFAQ(0)}>
                    What is Aura AI?
                    <span className="faq-icon">+</span>
                  </button>
                  <div className="faq-answer">
                    <p>
                      Aura AI is an AI-powered platform that automates the recruitment process by conducting AI-driven phone interviews.
                    </p>
                  </div>
                </div>
                <div className={`faq-item ${activeIndex === 1 ? "active" : ""}`}>
                  <button className="faq-question" onClick={() => toggleFAQ(1)}>
                    How does Aura AI work?
                    <span className="faq-icon">+</span>
                  </button>
                  <div className="faq-answer">
                    <p>
                      Aura AI uses advanced natural language processing (NLP) to conduct interviews, evaluate responses, and provide detailed analytics.
                    </p>
                  </div>
                </div>

                <div className={`faq-item ${activeIndex === 2 ? "active" : ""}`}>
                  <button className="faq-question" onClick={() => toggleFAQ(2)}>
                    Is Aura AI free to use?
                    <span className="faq-icon">+</span>
                  </button>
                  <div className="faq-answer">
                    <p>
                      Aura AI offers a free trial for new users. After the trial, you can choose from our affordable pricing plans.
                    </p>
                  </div>
                </div>

                <div className={`faq-item ${activeIndex === 3 ? "active" : ""}`}>
                  <button className="faq-question" onClick={() => toggleFAQ(3)}>
                    Can I customize the interview questions?
                    <span className="faq-icon">+</span>
                  </button>
                  <div className="faq-answer">
                    <p>
                      Yes, you can customize the interview questions based on the job role and requirements.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        } />
        {/* <Route path="/pricing" element={<Pricing />} /> */}
        <Route path="/contact" element={<Contact />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
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
  );
}

export default App;