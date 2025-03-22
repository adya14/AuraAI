import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Profile.css';
import avatar from './images/profile.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

const Profile = ({ onClose }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // State to toggle editing mode
  const [name, setName] = useState(''); // Combined name field
  const [email, setEmail] = useState(''); 
  const [currentPassword, setCurrentPassword] = useState(''); // Current password field
  const [newPassword, setNewPassword] = useState(''); // New password field
  const [verificationCode, setVerificationCode] = useState(''); // Verification code field
  const [showVerificationPopup, setShowVerificationPopup] = useState(false); // Show/hide verification code popup
  const [error, setError] = useState(''); 

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

        const response = await axios.get(`${process.env.BACKEND_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(response.data.user);
        setName(`${response.data.user.firstName} ${response.data.user.lastName}`); // Set combined name
        setEmail(response.data.user.email); // Set email from response
      } catch (error) {
        console.error('Error fetching profile:', error);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Send verification code first
      await sendVerificationCode();

      // Show the verification popup
      setShowVerificationPopup(true);
    } catch (error) {
      console.error('Error updating profile:', error.response?.data || error.message);
      setError('Failed to send verification code. Please check your current password.');
    }
  };

  const handleVerifyAndUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
  
      // Split the name into firstName and lastName
      const [firstName, lastName] = name.split(' ');
  
      const updatedData = {
        firstName,
        lastName,
        currentPassword, // Include current password (temporary password)
        ...(newPassword && { newPassword, verificationCode }), // Include new password and verification code if newPassword is entered
      };
  
      const response = await axios.put(`${process.env.BACKEND_URL}/api/profile`, updatedData, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      setUser((prev) => ({ ...prev, firstName, lastName })); // Update UI instantly
      setIsEditing(false); // Exit editing mode
      setShowVerificationPopup(false); // Hide verification code popup
      setError(''); // Clear errors
    } catch (error) {
      console.error('Error updating profile:', error.response?.data || error.message);
      setError('Failed to update profile. Please check your verification code.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.delete(`${process.env.BACKEND_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/'; // Redirect after deletion
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const sendVerificationCode = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.post(
        `${process.env.BACKEND_URL}/api/send-verification-code`,
        { currentPassword }, // Include current password
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('Verification code sent:', response.data); // Debugging
      setError('A verification code has been sent to your email.'); // Notify user
    } catch (error) {
      console.error('Error sending verification code:', error.response?.data || error.message);
      setError('Failed to send verification code. Please check your current password.');
    }
  };

  if (loading) return <div className="loading"></div>;

  return (
    <div className="profile-modal-overlay">
      <div className="profile-container">
        {/* Close Button */}
        <button className="close-button" onClick={onClose}>
          <FontAwesomeIcon icon={faXmark} />
        </button>

        {/* Upper Half with Gradient Background */}
        <div className="profile-header-section"></div>

        {/* Profile Image (Circle) */}
        <div className="profile-image">
          <img src={avatar} alt="Profile Character" />
        </div>

        {/* Profile Content */}
        <div className="profile-content">
          <div className="profile-info">
            {/* Name Field */}
            <div className="profile-field">
              <label>Name:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                />
              ) : (
                <span>{name}</span>
              )}
            </div>

            {/* Email Field (Non-Editable) */}
            <div className="profile-field">
              <label>Email:</label>
              <span>{user.email}</span> {/* Always display email as non-editable text */}
            </div>

            {/* Password Field (Conditional for JWT Login) */}
            {!user.googleId && isEditing && ( // Only show password fields for JWT login in editing mode
              <>
                <div className="profile-field">
                  <label>Current Password:</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="profile-field">
                  <label>New Password:</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
              </>
            )}
            {!user.googleId && !isEditing && ( // Show password placeholder for JWT login in non-editing mode
              <div className="profile-field">
                <label>Password:</label>
                <span>*********</span>
              </div>
            )}
          </div>
          {/* Plan Field (Non-Editable) */}
          <div className="profile-field">
            <label>Plan:</label>
            <span>{user.plan || 'No active plan'}</span>
          </div>

          {/* Buttons Section */}
          <div className="profile-buttons">
            {isEditing ? (
              <>
                <button className="cancel-button" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button className="confirm-edit-button" onClick={handleUpdateProfile}>
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button className="edit-button" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </button>
                <button className="delete-button" onClick={() => setShowDeletePopup(true)}>
                  Delete Account
                </button>
              </>
            )}
          </div>
        </div>

        {/* Delete Confirmation Popup */}
        {showDeletePopup && (
          <div className="delete-popup">
            <p>
              Are you sure you want to delete this account? <br />
              All your data, including your plan, will be permanently deleted.
            </p>
            <div className="popup-buttons">
              <button className="cancel-button" onClick={() => setShowDeletePopup(false)}>
                Cancel
              </button>
              <button className="confirm-delete-button" onClick={handleDeleteAccount}>
                Proceed with Deletion
              </button>
            </div>
          </div>
        )}

        {/* Verification Code Popup */}
        {showVerificationPopup && (
          <div className="delete-popup">
            <p>A verification code has been sent to your email. Please enter it below:</p>
            <div className="profile-field">
              <label>Verification Code:</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter verification code"
              />
            </div>
            <div className="popup-buttons">
              <button className="cancel-button" onClick={() => setShowVerificationPopup(false)}>
                Cancel
              </button>
              <button className="confirm-edit-button" onClick={handleVerifyAndUpdate}>
                Verify and Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;