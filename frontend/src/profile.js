import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Profile.css';

console.log('Profile component rendered'); // Debugging

const Profile = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Token:', token); // Debugging

        const response = await axios.get('http://localhost:5000/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log('Profile data:', response.data); // Debugging
        setUser(response.data.user);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, []);

  if (!user) return <div className="loading">Loading...</div>;

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