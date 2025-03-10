import React, { useState, useEffect } from 'react';
import ReactModal from 'react-modal';
import axios from 'axios';
import googleicon from "./images/google.png";

// Set the root element for accessibility (required by ReactModal)
ReactModal.setAppElement('#root');

const AuthModal = ({ isOpen, onRequestClose, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState(''); // Store error messages

  // Handle login/signup submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    const endpoint = isLogin ? '/login' : '/signup';

    try {
      const payload = isLogin
        ? { email, password }
        : { firstName, lastName, email, password };

      const response = await axios.post(`http://localhost:5000${endpoint}`, payload);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onAuthSuccess(response.data.user);
      onRequestClose();
    } catch (error) {
      setError(error.response?.data?.error || (isLogin ? 'Login failed' : 'Signup failed')); // Show error inside modal
    }
  };

  // Handle password reset request
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    try {
      await axios.post('http://localhost:5000/api/forgot-password', { email: resetEmail });
      setError('A password reset link has been sent to your email.');
      setShowForgotPassword(false);
    } catch (error) {
      setError('Error sending reset email. Please try again.');
    }
  };

  // Handle Google OAuth login
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const token = urlParams.get('token');

    if (error) {
      setError(decodeURIComponent(error));
      window.history.replaceState({}, document.title, window.location.pathname);
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
      {showForgotPassword ? (
        <div>
          <h2>Forgot Password</h2>
          <form onSubmit={handleForgotPassword}>
            <input
              type="email"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
            {error && <p className="error-message">{error}</p>}
            <button type="submit">Send Reset Link</button>
          </form>
          <button
            type="button"
            onClick={() => setShowForgotPassword(false)}
            style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}
          >
            Back to Login
          </button>
        </div>
      ) : (
        <>
          <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
          <form onSubmit={handleSubmit}>
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

            {/* Display Errors Here */}
            {error && <p className="error-message">{error}</p>}

            <button type="submit">{isLogin ? 'Login' : 'Sign Up'}</button>
          </form>

          {/* Forgot Password Link */}
          {isLogin && (
            <p>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}
              >
                Forgot Password?
              </button>
            </p>
          )}

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
        </>
      )}

      {/* Close Button */}
      <button
        type="button"
        onClick={onRequestClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
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
