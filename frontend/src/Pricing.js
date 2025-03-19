import React, { useState, useEffect } from "react";
import "./Pricing.css";
import AuthModal from "./AuthModal";
import axios from "axios";

const Pricing = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(1); // Track the active card index (0: left, 1: middle, 2: right)
  const [error, setError] = useState(""); // Track error messages
  const [successMessage, setSuccessMessage] = useState(""); // Track success messages

  const cards = [
    {
      title: "Basic Plan",
      price: "₹1/month",
      features: ["50 AI Interviews per month", "Basic Analytics", "Email Support"],
      plan: "Basic Plan",
      amount: 1,
    },
    {
      title: "Pro Plan",
      price: "₹4999/month",
      features: ["250 AI Interviews per month", "Advanced Analytics", "Priority Support"],
      plan: "Pro Plan",
      amount: 4999,
    },
    {
      title: "Quantum Flex Plan",
      price: "Pay as you go",
      features: ["Unlimited AI Interviews", "Advanced Analytics", "Priority Support"],
      plan: "Quantum Flex Plan",
      amount: 10000,
    },
  ];

  // Check authentication status on component mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token); // Convert token existence to boolean
  }, []);

  // Handle Buy Now Click
  const handleBuyNow = async (planName, price) => {
    setError("");
    setSuccessMessage("");

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
        name: "moon AI",
        description: `Payment for ${planName}`,
        order_id: orderId,
        handler: async function (response) {
          setSuccessMessage("Payment Successful!");
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
      setError(error.response?.data?.error || error.message || "Error processing payment. Please try again.");
    }
  };

  // Handle card click
  const handleCardClick = (index) => {
    setActiveIndex(index);
  };

  return (
    <section id="pricing" className="pricing scroll-reveal">
      <div className="pricing">
        <h1>Pricing</h1>
        <div className="pricing-cards">
          {cards.map((card, index) => {
            // Calculate the position of the card based on the active index
            let position = index - activeIndex;
            if (position < -1) position += 3; // Wrap around to the right
            if (position > 1) position -= 3; // Wrap around to the left

            return (
              <div
                key={index}
                className={`card ${activeIndex === index ? "active" : ""}`}
                onClick={() => handleCardClick(index)}
                style={{
                  transform: `translateX(${position * 80}%) scale(${activeIndex === index ? 1 : 0.85})`, // Reduced X translation and scale
                  zIndex: activeIndex === index ? 3 : 1,
                  opacity: activeIndex === index ? 1 : 0.6, // Increased visibility for side cards
                }}
              >
                <h2>{card.title}</h2>
                <p>{card.price}</p>
                <ul>
                  {card.features.map((feature, i) => (
                    <li key={i}>{feature}</li>
                  ))}
                </ul>
                <button className="pricing-button" onClick={() => handleBuyNow(card.plan, card.amount)}>
                  Buy Now
                </button>
                {/* Display Success and Error Messages Here */}
                {successMessage && activeIndex === index && (
                  <p className="success-message">{successMessage}</p>
                )}
                {error && activeIndex === index && (
                  <p className="error-message">{error}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Authentication Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onRequestClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    </section>
  );
};

export default Pricing;