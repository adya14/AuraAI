import React, { useState, useEffect } from 'react';
import ReactModal from 'react-modal';
import axios from 'axios';
import googleicon from "./images/google.png";

// Set the root element for accessibility (required by ReactModal)
ReactModal.setAppElement('#root');

const AuthModal = ({ isOpen, onRequestClose, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true); // Toggle between login and signup
  const [firstName, setFirstName] = useState(''); // State for first name
  const [lastName, setLastName] = useState(''); // State for last name
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/login' : '/signup';
    try {
      const payload = isLogin
        ? { email, password } // For login, only email and password are needed
        : { firstName, lastName, email, password }; // For signup, include firstName and lastName

      const response = await axios.post(`http://localhost:5000${endpoint}`, payload);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user)); // Save user data
      onAuthSuccess(response.data.user); // Notify parent component of successful auth
      onRequestClose(); // Close modal after success
    } catch (error) {
      const errorMessage = error.response?.data?.error || (isLogin ? 'Login failed' : 'Signup failed');

      if (errorMessage.includes("Account already exists")) {
        alert("This email is already registered with Google. Please log in using Google.");
      } else {
        alert(errorMessage);
      }
    }
  };

  // Handle Google OAuth login
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const token = urlParams.get('token');
  
    if (error) {
      alert(decodeURIComponent(error)); // Show error message
      window.history.replaceState({}, document.title, window.location.pathname); // Remove error from URL
    }
  
    if (token) {
      localStorage.setItem('token', token);
      axios.get('http://localhost:5000/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(response => {
        const userData = response.data.user;
        localStorage.setItem('user', JSON.stringify(userData));
        onAuthSuccess(userData);
      })
      .catch(error => {
        console.error('Error fetching user profile:', error);
      });
    }
  }, [onAuthSuccess]);
  

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Login/Signup Modal"
      className="modal"
      overlayClassName="overlay"
    >
      <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
      <form onSubmit={handleSubmit}>
        {/* Show firstName and lastName fields only during signup */}
        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">{isLogin ? 'Login' : 'Sign Up'}</button>
      </form>

      {/* Toggle between login and signup */}
      <p>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}
        >
          {isLogin ? 'Sign Up' : 'Login'}
        </button>
      </p>

      {/* Google Login Button */}
      <div className="google-login">
        <p>Or {isLogin ? 'login' : 'sign up'} with:</p>
        <a href="http://localhost:5000/auth/google" className="google-button">
          <img src={googleicon} alt="Google Icon" />
          <span>Google</span>
        </a>
      </div>

      {/* Close Button */}
        <button 
          type="button" 
          onClick={onRequestClose} 
          style={{
            position: 'absolute',  // Position it absolutely within the modal
            top: '10px',           // 10px from the top
            right: '10px',          // 10px from the left
            background: 'none', 
            border: 'none', 
            fontSize: '18px', 
            cursor: 'pointer'
          }}
        >
          ✖
        </button>
    </ReactModal>
  );
};

export default AuthModal;
