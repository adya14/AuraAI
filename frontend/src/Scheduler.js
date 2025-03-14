import React, { useState } from "react";
import "./Scheduler.css"; // Import the CSS file

const Scheduler = () => {
  const [candidates, setCandidates] = useState([{ name: "", phone: "+91" }]); // Initialize phone with +91
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [interviewDateTime, setInterviewDateTime] = useState("");

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
  const handleScheduler = () => {
    console.log("Call scheduled with the following details:");
    candidates.forEach((candidate, index) => {
      console.log(`Candidate ${index + 1}:`, candidate.name, candidate.phone);
    });
    console.log("Job Role:", jobRole);
    console.log("Job Description:", jobDescription);
    console.log("Interview Date & Time:", interviewDateTime);
    alert("Call scheduled successfully!");
  };

  return (
    <div className="scheduler">
      <h1>Welcome HRs! </h1>
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
        <button className="scheduler-button" onClick={handleScheduler}>
          Schedule
        </button>
      </div>
    </div>
  );
};

export default Scheduler;