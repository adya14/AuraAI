import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Profile.css';
import avatar from './images/profile_avatar.png' //https://www.streamlinehq.com/illustrations/free-illustrations-bundle/milano?icon=ico_zeNpEDMmZWtyXUsk

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/'; 
  };  

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          handleLogout();
          return;
        }

        const response = await axios.get('http://localhost:5000/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(response.data.user);
        setFirstName(response.data.user.firstName);
        setLastName(response.data.user.lastName);
      } catch (error) {
        console.error('Error fetching profile:', error);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Handle Profile Update
  const handleUpdateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const updatedData = {
        firstName,
        lastName,
        ...(password && { password }) // Only send password if it's entered
      };

      await axios.put('http://localhost:5000/api/profile', updatedData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(prev => ({ ...prev, firstName, lastName })); // Update UI instantly
      setShowEditPopup(false); // Close popup
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.delete('http://localhost:5000/api/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/'; // Redirect after deletion

    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="profile-container">
      <h1 className="profile-header">Profile</h1>

      <div className="profile-content">
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
            <span>*********</span> {/* Hidden password */}
          </div>
          <div className="profile-field">
            <label>Plan:</label>
            <span>{user.plan || 'No plan selected'}</span>
          </div>
        </div>

        <div className="profile-image">
          <img 
            src= {avatar}
            alt="Profile Character"
          />
        </div>
      </div>

      {/* Buttons Section */}
      <div className="profile-buttons">
        <button className="edit-button" onClick={() => setShowEditPopup(true)}>
          Edit Profile
        </button>
        <button className="delete-button" onClick={() => setShowDeletePopup(true)}>
          Delete Account
        </button>
      </div>

      {/* Edit Profile Popup */}
      {showEditPopup && (
        <div className="edit-popup">
          <h3>Edit Profile</h3>
          <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" />
          <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" />

          {/* Hide password field for OAuth users */}
          {!user.googleId && (
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="New Password (leave blank to keep current)" 
            />
          )}          
          <div className="popup-buttons">
            <button className="cancel-button" onClick={() => setShowEditPopup(false)}>Cancel</button>
            <button className="confirm-edit-button" onClick={handleUpdateProfile}>Save Changes</button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {showDeletePopup && (
        <div className="delete-popup">
          <p>Are you sure you want to delete this account? <br />
          All your data, including your plan, will be permanently deleted.</p>
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
