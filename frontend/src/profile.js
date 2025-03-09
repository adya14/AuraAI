import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Added loading state

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
        setLoading(false); // Ensure loading stops
      }
    };

    fetchProfile();
  }, []); // Empty dependency array ensures this runs only once

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="profile-container">
      <h1 className="profile-header">Profile</h1>
      <div className="profile-details">
        <div className="profile-field">
          <label>Name:</label>
          <p>{user.firstName} {user.lastName}</p>
        </div>
        <div className="profile-field">
          <label>Email:</label>
          <p>{user.email}</p>
        </div>
        <div className="profile-field">
          <label>Plan:</label>
          <p>{user.plan || 'No plan selected'}</p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
