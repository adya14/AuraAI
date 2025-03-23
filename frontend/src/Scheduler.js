import React, { useState } from "react";
import axios from "axios";
import "./Scheduler.css";

const Scheduler = () => {
  const [candidates, setCandidates] = useState([{ name: "", phone: "+91" }]); // Initialize phone with +91
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [interviewDateTime, setInterviewDateTime] = useState("");
  const [loading, setLoading] = useState(false); // Track loading state
  const [error, setError] = useState(""); // Track error messages
  const [successMessage, setSuccessMessage] = useState(""); // Track success messages

  // Handle adding more candidate fields
  const addCandidateField = () => {
    setCandidates([...candidates, { name: "", phone: "+91" }]); // Initialize new phone with +91
  };

  // Handle removing a candidate field
  const removeCandidateField = (index) => {
    const updatedCandidates = candidates.filter((_, i) => i !== index); // Remove the candidate at the specified index
    setCandidates(updatedCandidates);
  };

  // Handle changes in candidate fields
  const handleCandidateChange = (index, field, value) => {
    const updatedCandidates = [...candidates];

    // Ensure the phone number starts with +91 and only allows digits after it
    if (field === "phone") {
      if (!value.startsWith("+91")) {
        value = "+91" + value.replace(/\D/g, ""); // Remove non-digits and prepend +91
      } else {
        value = "+91" + value.slice(3).replace(/\D/g, ""); // Ensure only digits after +91
      }
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

      // Prepare data to send to the backend
      const data = {
        jobRole,
        jobDescription,
        candidates, // Send all candidates to the backend
        scheduledTime: scheduledTime.toISOString(),
        email,
      };

      // Make a POST request to the /make-call API
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/make-call`, data);

      console.log("Calls scheduled with the following details:");
      console.log("Job Role:", jobRole);
      console.log("Job Description:", jobDescription);
      console.log("Scheduled Time:", scheduledTime.toLocaleString());
      console.log("API Response:", response.data);

      // Set success message
      setSuccessMessage(`Calls scheduled successfully for ${scheduledTime.toLocaleString()}!`);

      // Reset the form fields after successful scheduling
      setCandidates([{ name: "", phone: "+91" }]); // Reset to one empty candidate field
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
      {/* Overlay Div */}
      <div className="overlay">
        <div className="overlay-content">
          <h2>We Will Launch Soon</h2>
          <p>Stay tuned for the exciting launch of our scheduler feature!</p>
        </div>
      </div>
      <h2> Let's Automate That Phone Interview for You.</h2>
      <p className="tagline">
        Say goodbye to manual scheduling and hello to AI-powered interviews. Let’s make hiring smarter, faster, and cooler
        than ever!
      </p>

      <div className="form-container">
        {/* Candidate Name and Phone Number Fields */}
        {candidates.map((candidate, index) => (
          <div key={index} className="candidate-group">
            <div className="form-group">
              <label htmlFor={`candidateName-${index}`}>Candidate Name</label>
              <input
                type="text"
                id={`candidateName-${index}`}
                value={candidate.name}
                onChange={(e) => handleCandidateChange(index, "name", e.target.value)}
                placeholder="Enter the candidate's name"
                required
              />
            </div>
            <div className="form-group phone-group">
              <label htmlFor={`candidatePhone-${index}`}>Candidate's Phone Number</label>
              <input
                type="tel"
                id={`candidatePhone-${index}`}
                value={candidate.phone}
                onChange={(e) => handleCandidateChange(index, "phone", e.target.value)}
                placeholder="+91XXXXXXXXXX"
                required
              />
              {/* Minus Icon to Remove Candidate Fields */}
              {index !== candidates.length - 1 && ( // Show minus icon for all fields except the last one
                <button
                  type="button"
                  className="remove-icon"
                  onClick={() => removeCandidateField(index)}
                >
                  <i className="fa-solid fa-minus"></i>
                </button>
              )}
              {/* Plus Icon to Add More Candidates */}
              {index === candidates.length - 1 && ( // Show plus icon only for the last candidate
                <button type="button" className="add-more-icon" onClick={addCandidateField}>
                  <i className="fa-solid fa-plus"></i>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Job Role Field */}
        <div className="form-group">
          <label htmlFor="jobRole">Job Role</label>
          <input
            type="text"
            id="jobRole"
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
            placeholder="Enter the job role (e.g., Software Engineer)"
            required
          />
        </div>

        {/* Job Description Field */}
        <div className="form-group">
          <label htmlFor="jobDescription">Job Description</label>
          <textarea
            id="jobDescription"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Enter the job description"
            required
          />
        </div>

        {/* Interview Date & Time Field */}
        <div className="form-group">
          <label htmlFor="interviewDateTime">Interview Date & Time</label>
          <input
            type="datetime-local"
            id="interviewDateTime"
            value={interviewDateTime}
            onChange={(e) => setInterviewDateTime(e.target.value)}
            required
          />
        </div>

        {/* Schedule Button */}
        <button className="scheduler-button" onClick={handleScheduler} disabled={loading}>
          {loading ? "Scheduling..." : "Schedule"}
        </button>

        {/* Display Success and Error Messages Here */}
        {successMessage && <p className="success-message">{successMessage}</p>}
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
};

export default Scheduler;