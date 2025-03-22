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
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState(''); // Store error messages
  const [otpSent, setOtpSent] = useState(false); // Track if OTP has been sent

  // Function to reset all form fields
  const resetFormFields = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setResetEmail('');
    setOtp('');
    setNewPassword('');
    setError('');
    setShowForgotPassword(false);
    setOtpSent(false);
  };

  // Handle modal close
  const handleModalClose = () => {
    resetFormFields(); // Reset form fields
    onRequestClose(); // Close the modal
  };

  // Handle login/signup submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    const endpoint = isLogin ? '/login' : '/signup';
  
    try {
      const payload = isLogin
        ? { email, password }
        : { firstName, lastName, email, password };
  
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}${endpoint}`, payload);
  
      // Store the token and user data in localStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('email', response.data.user.email);
  
      // Trigger the onAuthSuccess callback
      onAuthSuccess(response.data.user);
  
      // Close the modal and reset form fields
      handleModalClose();
    } catch (error) {
      setError(error.response?.data?.error || (isLogin ? 'Login failed' : 'Signup failed'));
    }
  };

  // Handle password reset request
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/forgot-password`, { email: resetEmail });
      setError('OTP has been sent to your email.');
      setOtpSent(true);
    } catch (error) {
      setError('Error sending OTP');
    }
  };

  // Handle OTP and new password submission
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
  
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/reset-password`, {
        email: resetEmail,
        otp,
        newPassword,
      });
  
      // If the password reset is successful
      if (response.data.success) {
        setError('Password reset successfully.');
        setShowForgotPassword(false);
        setOtpSent(false);
      } else {
        setError(response.data.message || 'Error resetting password');
      }
    } catch (error) {
      // Log the error for debugging
      console.error('Error resetting password:', error.response?.data || error.message);
  
      // Display a user-friendly error message
      setError(error.response?.data?.message || 'Error resetting password.');
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
      axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(response => {
        const userData = response.data.user;
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('email', userData.email);
        if (typeof onAuthSuccess === 'function') {
          onAuthSuccess(userData);
        }
      })
      .catch(error => {
        console.error('Error fetching user profile:', error);
      });
    }
  }, [onAuthSuccess]);

  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={handleModalClose}
      contentLabel="Login/Signup Modal"
      className="modal"
      overlayClassName="overlay"
    >
      {showForgotPassword ? (
        <div>
          <h2>Forgot Password</h2>
          <form onSubmit={otpSent ? handleResetPassword : handleForgotPassword}>
            <input
              type="email"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
            />
            {otpSent && (
              <>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </>
            )}
            {error && <p className="error-message">{error}</p>}
            <button type="submit">{otpSent ? 'Reset Password' : 'Send OTP'}</button>
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
            <a href={`${process.env.REACT_APP_BACKEND_URL}/auth/google`} className="google-button">
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