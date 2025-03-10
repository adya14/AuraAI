import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeletePopup, setShowDeletePopup] = useState(false); // Controls delete confirmation popup

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get('http://localhost:5000/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!user || user._id !== response.data.user._id) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.delete('http://localhost:5000/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Clear local storage & redirect to home page
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/'; // Redirects to home page after deletion

    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="profile-container">
      <h1 className="profile-header">Profile</h1>

      <div className="profile-content">
        {/* Left Side: User Details */}
        <div className="profile-info">
          <div className="profile-field">
            <label>Name:</label>
            <span>{user.firstName} {user.lastName}</span>
          </div>
          <div className="profile-field">
            <label>Email:</label>
            <span>{user.email}</span>
          </div>
          <div className="profile-field">
            <label>Password:</label>
            <span>*********</span> {/* Hides password */}
          </div>
          <div className="profile-field">
            <label>Plan:</label>
            <span>{user.plan || 'No plan selected'}</span>
          </div>
        </div>

        {/* Right Side: Character Image */}
        <div className="profile-image">
          <img 
            src="https://via.placeholder.com/200" 
            alt="Profile Character"
          />
        </div>
      </div>

      {/* Delete Account Button */}
      <button className="delete-button" onClick={() => setShowDeletePopup(true)}>
        Delete Account
      </button>

      {/* Delete Confirmation Popup */}
      {showDeletePopup && (
        <div className="delete-popup">
          <p>Are you sure you want to delete this account? <br />
          If you delete your account, all your data will be permanently deleted, including your plan.</p>
          <div className="popup-buttons">
            <button className="cancel-button" onClick={() => setShowDeletePopup(false)}>Cancel</button>
            <button className="confirm-delete-button" onClick={handleDeleteAccount}>Proceed with Deletion</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
