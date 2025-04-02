import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faArrowRight, faSearch, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import axios from "axios";
import "./Dashboard.css";

const Caller = () => {
  const navigate = useNavigate();
  const [scheduledCalls, setScheduledCalls] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userPlan, setUserPlan] = useState({
    activePlan: null,
    totalCalls: 0,
    usedCalls: 0,
    totalCallsTillDate: 0,
  });

  // Navigate to interview details page
  const navigateToInterviewDetails = (call, candidate) => {
    navigate('/interview-details', {
      state: {
        callData: call,
        candidateData: candidate
      }
    });
  };

  // Fetch user's active plan and call usage on component mount
  useEffect(() => {
    const fetchUserPlan = async () => {
      try {
        const email = localStorage.getItem("email");
        if (!email) {
          console.error("Email not found. Please log in.");
          return;
        }

        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/user-plan`, {
          params: { email },
        });

        setUserPlan(response.data);
      } catch (error) {
        console.error("Error fetching user plan:", error);
      }
    };

    fetchUserPlan();
  }, []);

  // Fetch scheduled calls when the component mounts
  useEffect(() => {
    const fetchScheduledCalls = async () => {
      try {
        const email = localStorage.getItem("email");
        if (!email) {
          console.error("Email not found. Please log in.");
          return;
        }

        const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/scheduled-calls`, {
          params: { email },
        });
        setScheduledCalls(response.data);
      } catch (error) {
        console.error("Error fetching scheduled calls:", error);
      }
    };

    fetchScheduledCalls();
  }, []);

  // Filter scheduled calls based on the search query
  const filteredCalls = scheduledCalls.filter((call) =>
    call.candidates.some((candidate) =>
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Separate scheduled calls and history calls
  const now = new Date();
  const scheduledCallsList = filteredCalls.filter((call) => new Date(call.scheduledTime) > now);
  const historyCallsList = filteredCalls.filter((call) => new Date(call.scheduledTime) <= now);

  // Helper function to format date and time
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString();
  };

  return (
    <div className="caller-dashboard">
      {/* Welcome Section */}
      <h1 className="welcome-heading">Welcome to the Dashboard</h1>
      <div className="schedule-call-prompt">
        <p>Do you want to schedule an interview?</p>
        <FontAwesomeIcon icon={faArrowRight} className="arrow-icon" />
        <button
          className="caller-button schedule-call"
          onClick={() => {
            if (userPlan.activePlan && userPlan.activePlan === "Basic Plan") {
              navigate("/Scheduler");
            } else {
              alert("You need an active plan to schedule a call.");
            }
          }}
        >          Schedule a Call <FontAwesomeIcon icon={faPhone} className="button-icon" />
        </button>
      </div>

      {/* Four Small Square Containers */}
      <div className="stats-container scroll-reveal">
        {/* Container 1: Current Active Plan */}
        <div className="stat-card">
          <h3>Current plan</h3>
          <p>{userPlan.activePlan || "No active plan"}</p>
          {userPlan.activePlan && <p>{userPlan.totalCalls} calls included</p>}
        </div>

        {/* Container 2: Total Calls Made */}
        <div className="stat-card">
          <h3>Calls made in current plan</h3>
          <p>{userPlan.usedCalls}</p>
        </div>

        {/* Container 3: Total Calls Remaining */}
        <div className="stat-card">
          <h3>Total calls remaining</h3>
          <p>{userPlan.totalCalls - userPlan.usedCalls}</p>
        </div>
        <div className="stat-card">
          <h3>Total calls made till date</h3>
          <p>{userPlan.totalCallsTillDate}</p>
        </div>
      </div>

      {/* Scheduled Calls Container */}
      <div className="scheduled-calls-container scroll-reveal">
        <h3>Scheduled Calls</h3>

        {/* Search Bar */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by candidate name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
        </div>

        {/* Table for Scheduled Calls */}
        <table className="scheduled-calls-table">
          <thead>
            <tr>
              <th>Candidate Name</th>
              <th>Phone Number</th>
              <th>Job Role</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {scheduledCallsList.length === 0 ? (
              <tr>
                <td colSpan="5" className="no-calls">No scheduled calls found.</td>
              </tr>
            ) : (
              scheduledCallsList.map((call) =>
                call.candidates.map((candidate, index) => (
                  <tr key={`${call._id}-${index}`}>
                    <td>{candidate.name}</td>
                    <td>{candidate.phone}</td>
                    <td>{call.jobRole}</td>
                    <td>{formatDate(call.scheduledTime)}</td>
                    <td>{formatTime(call.scheduledTime)}</td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>

      {/* History Calls Container */}
      <div className="history-calls-container scroll-reveal">
        <h3>History</h3>

        {/* Search Bar for History Calls */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by candidate name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
        </div>

        {/* Table for History Calls */}
        <table className="history-calls-table">
          <thead>
            <tr>
              <th>Candidate Name</th>
              <th>Phone Number</th>
              <th>Job Role</th>
              <th>Date</th>
              <th>Time</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {historyCallsList.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-calls">No history calls found.</td>
              </tr>
            ) : (
              historyCallsList
                .filter((call) =>
                  call.candidates.some((candidate) =>
                    candidate.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                )
                .map((call) =>
                  call.candidates.map((candidate, index) => (
                    <tr key={`${call._id}-${index}`}>
                      <td>{candidate.name}</td>
                      <td>{candidate.phone}</td>
                      <td>{call.jobRole}</td>
                      <td>{formatDate(call.scheduledTime)}</td>
                      <td>{formatTime(call.scheduledTime)}</td>
                      <td>
                        {candidate.score || "N/A"}
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          className="score-info-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToInterviewDetails(call, candidate);
                          }}
                        />
                      </td>
                    </tr>
                  ))
                )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Caller;