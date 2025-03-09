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
      const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isLogin ? '/login' : '/signup';
        try {
          const payload = isLogin
            ? { email, password }
            : { firstName, lastName, email, password };
      
          const response = await axios.post(`http://localhost:5000${endpoint}`, payload);
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          onAuthSuccess(response.data.user);
          onRequestClose(); // Close modal after success
        } catch (error) {
          alert(error.response?.data?.error || (isLogin ? 'Login failed' : 'Signup failed'));
        }
      };
            onRequestClose(); // Close the modal after successful login/signup
    } catch (error) {
      alert(error.response?.data?.error || (isLogin ? 'Login failed' : 'Signup failed'));
    }
  };

  // Handle Google OAuth login
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      // Fetch user data using the token
      axios.get('http://localhost:5000/api/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
      <button type="button" onClick={onRequestClose} style={{ marginTop: '10px' }}>
        close
      </button>
    </ReactModal>
  );
};

export default AuthModal;