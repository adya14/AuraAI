import React, { useState } from 'react';
import ReactModal from 'react-modal';
import axios from 'axios';
import googleicon from "./images/google.png"

// Set the root element for accessibility (required by ReactModal)
ReactModal.setAppElement('#root');

const AuthModal = ({ isOpen, onRequestClose }) => {
  const [isLogin, setIsLogin] = useState(true); // Toggle between login and signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? '/api/login' : '/api/signup';
    try {
      const response = await axios.post(`http://localhost:5000${endpoint}`, { email, password });
      localStorage.setItem('token', response.data.token);
      alert(isLogin ? 'Login successful!' : 'Signup successful!');
      onRequestClose(); // Close the modal after successful login/signup
    } catch (error) {
      alert(error.response?.data?.error || (isLogin ? 'Login failed' : 'Signup failed'));
    }
  };

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
        <a href="http://localhost:5000/api/auth/google" className="google-button">
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