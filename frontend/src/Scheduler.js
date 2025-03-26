import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Scheduler.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faMinus, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

const Scheduler = () => {
  const [candidates, setCandidates] = useState([{ name: "", phone: "+91" }]);
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [interviewDateTime, setInterviewDateTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [remainingCalls, setRemainingCalls] = useState(0);

  // Fetch user's plan and remaining calls
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

        const totalRemaining = response.data.totalCalls - response.data.usedCalls;
        setRemainingCalls(totalRemaining > 0 ? totalRemaining : 0);
      } catch (error) {
        console.error("Error fetching user plan:", error);
      }
    };

    fetchUserPlan();
  }, []);

  // Add candidate field
  const addCandidateField = () => {
    setCandidates([...candidates, { name: "", phone: "+91" }]);
    setError("");
  };

  // Remove candidate field
  const removeCandidateField = (index) => {
    const updatedCandidates = candidates.filter((_, i) => i !== index);
    setCandidates(updatedCandidates);
    setError("");
  };

  // Handle candidate field changes
  const handleCandidateChange = (index, field, value) => {
    const updatedCandidates = [...candidates];
    if (field === "phone") {
      value = "+91" + (value.startsWith("+91") ? value.slice(3) : value).replace(/\D/g, "");
    }
    updatedCandidates[index][field] = value;
    setCandidates(updatedCandidates);
  };

  // Handle form submission
  const handleScheduler = async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      // Validate input
      if (!candidates[0].name || !candidates[0].phone || !jobRole || !jobDescription || !interviewDateTime) {
        throw new Error("Please fill in all fields.");
      }

      const now = new Date();
      const scheduledTime = new Date(interviewDateTime);

      if (scheduledTime <= now) {
        throw new Error("Interview date and time must be in the future.");
      }

      const email = localStorage.getItem("email");
      if (!email) {
        throw new Error("User email not found. Please log in.");
      }

      // Prepare data
      const data = {
        jobRole,
        jobDescription,
        candidates,
        scheduledTime: scheduledTime.toISOString(),
        email,
      };

      // Make API call
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/make-call`, data);

      // Refresh plan data
      const planResponse = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/user-plan`, {
        params: { email },
      });
      
      const newRemaining = planResponse.data.totalCalls - planResponse.data.usedCalls;
      setRemainingCalls(newRemaining > 0 ? newRemaining : 0);
      setSuccessMessage(`Interview scheduled successfully for ${scheduledTime.toLocaleString()}!`);

      // Reset form
      setCandidates([{ name: "", phone: "+91" }]);
      setJobRole("");
      setJobDescription("");
      setInterviewDateTime("");
    } catch (error) {
      console.error("Error scheduling call:", error);
      setError(error.response?.data?.error || error.message || "Failed to schedule call.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scheduler">
      <h2>Let's Automate That Phone Interview for You.</h2>
      <p className="tagline">
        Say goodbye to manual scheduling and hello to AI-powered interviews.
      </p>

      <div className="form-container">
        {/* Candidate fields */}
        {candidates.map((candidate, index) => (
          <div key={index} className="candidate-group">
            <div className="form-group">
              <label>Candidate Name</label>
              <input
                type="text"
                value={candidate.name}
                onChange={(e) => handleCandidateChange(index, "name", e.target.value)}
                placeholder="Enter candidate's name"
                required
              />
            </div>
            <div className="form-group phone-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={candidate.phone}
                onChange={(e) => handleCandidateChange(index, "phone", e.target.value)}
                placeholder="+91XXXXXXXXXX"
                required
              />
              {/* Show minus icon for all candidates except when there's only one */}
              {candidates.length > 1 && (
                <button 
                  className="remove-icon" 
                  onClick={() => removeCandidateField(index)}
                  type="button"
                >
                  <FontAwesomeIcon icon={faMinus} />
                </button>
              )}
              {/* Show plus icon only on last candidate when calls remain */}
              {index === candidates.length - 1 && remainingCalls > candidates.length && (
                <button 
                  className="add-more-icon" 
                  onClick={addCandidateField}
                  type="button"
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Call limit reached alert - shows when user has added max candidates */}
        {remainingCalls > 0 && candidates.length === remainingCalls && (
          <div className="call-limit-alert">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            You've used all remaining calls in your current plan.
          </div>
        )}

        {/* Job details */}
        <div className="form-group">
          <label>Job Role</label>
          <input
            type="text"
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
            placeholder="Enter job role"
            required
          />
        </div>

        <div className="form-group">
          <label>Job Description</label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Enter job description"
            required
          />
        </div>

        <div className="form-group">
          <label>Interview Date & Time</label>
          <input
            type="datetime-local"
            value={interviewDateTime}
            onChange={(e) => setInterviewDateTime(e.target.value)}
            required
          />
        </div>

        {/* Status messages */}
        {successMessage && <p className="success-message">{successMessage}</p>}
        {error && <p className="error-message">{error}</p>}

        {/* Schedule button */}
        <button
          className="scheduler-button"
          onClick={handleScheduler}
          disabled={loading || remainingCalls === 0}
        >
          {loading ? "Scheduling..." : "Schedule"}
        </button>
      </div>
    </div>
  );
};

export default Scheduler;