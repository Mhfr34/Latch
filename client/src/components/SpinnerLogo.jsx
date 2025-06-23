import React from "react";

const SpinnerLogo = ({ size = 72 }) => (
  <div
    className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-10"
    style={{ minHeight: "100vh" }}
  >
    <div
      className="animate-spin"
      style={{
        width: size,
        height: size,
        display: "inline-block",
      }}
    >
      <img
        src={require("../utils/images/Latch.jpg")}
        alt="Logo Spinner"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          objectFit: "cover",
          boxShadow: "0 0 18px 3px rgba(255, 204, 0, 0.4)",
        }}
      />
    </div>
  </div>
);

export default SpinnerLogo;
