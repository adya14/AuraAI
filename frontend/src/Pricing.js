import React, { useState, useEffect } from "react";
import "./Pricing.css";
import AuthModal from "./AuthModal";
import axios from "axios";

const Pricing = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeCard, setActiveCard] = useState(1); // Track the active card (1: middle, 0: left, 2: right)

  // Check authentication status on component mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token); // Convert token existence to boolean
  }, []);

  // Handle Buy Now Click
  const handleBuyNow = async (planName, price) => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true); // Show login/signup popup if user is not authenticated
      return;
    }

    try {
      // Create a payment order on the backend
      const response = await axios.post("http://localhost:5000/api/create-order", {
        plan: planName,
        amount: price,
      });

      const { orderId, amount } = response.data;

      // Check if Razorpay is available
      if (!window.Razorpay) {
        throw new Error("Razorpay SDK not loaded");
      }
      // Configure Razorpay payment options
      const options = {
        key: "rzp_test_hQcNyHrxX8CxIR", // Replace with your Razorpay Key ID
        amount: amount * 100, // Amount in paisa (₹1 = 100 paise)
        currency: "INR",
        name: "Aura AI",
        description: `Payment for ${planName}`,
        order_id: orderId,
        handler: async function (response) {
          alert("Payment Successful!");
          console.log(response);
        },
        prefill: {
          email: localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).email : "",
        },
        theme: {
          color: "#3399cc",
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error("Payment error:", error);
      alert("Error processing payment. Please try again.");
    }
  };

  return (
    <div className="pricing">
      <h1>Pricing</h1>
      <div className="pricing-cards">
        {/* Left Card */}
        <div
          className={`card ${activeCard === 0 ? "active" : ""}`}
          onClick={() => setActiveCard(0)}
        >
          <h2>Basic Plan</h2>
          <p>₹999/month</p>
          <ul>
            <li>50 AI Interviews per month</li>
            <li>Basic Analytics</li>
            <li>Email Support</li>
          </ul>
          <button className="pricing-button" onClick={() => handleBuyNow("Basic Plan", 999)}>
            Buy Now
          </button>
        </div>

        {/* Middle Card */}
        <div
          className={`card ${activeCard === 1 ? "active" : ""}`}
          onClick={() => setActiveCard(1)}
        >
          <h2>Pro Plan</h2>
          <p>₹4999/month</p>
          <ul>
            <li>250 AI Interviews per month</li>
            <li>Advanced Analytics</li>
            <li>Priority Support</li>
          </ul>
          <button className="pricing-button" onClick={() => handleBuyNow("Pro Plan", 4999)}>
            Buy Now
          </button>
        </div>

        {/* Right Card */}
        <div
          className={`card ${activeCard === 2 ? "active" : ""}`}
          onClick={() => setActiveCard(2)}
        >
          <h2>Quantum Flex Plan</h2>
          <p>Pay as you go</p>
          <ul>
            <li>Unlimited AI Interviews</li>
            <li>Advanced Analytics</li>
            <li>Priority Support</li>
          </ul>
          <button className="pricing-button" onClick={() => handleBuyNow("Quantum Flex Plan", 10000)}>
            Buy Now
          </button>
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onRequestClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default Pricing;