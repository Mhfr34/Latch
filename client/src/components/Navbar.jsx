import React, { useState } from "react";
import latchLogo from "../utils/images/Latch.jpg";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";

/**
 * Responsive Navbar component with logo and search bar.
 * Uses axios to perform driver search and updates parent state via props.
 */
function Navbar({ setDrivers, setLoading, setError }) {
  const [search, setSearch] = useState("");

  // Handles both input and API search
  const onChangeSearch = async (e) => {
    const val = e.target.value;
    setSearch(val);

    setLoading(true);
    setError(null);

    try {
      let driversResponse;
      if (val.trim().length === 0) {
        driversResponse = await axios.get(`${API_URL}/get-all-drivers`);
      } else {
        driversResponse = await axios.get(
          `${API_URL}/search-driver?q=${encodeURIComponent(val)}`
        );
      }
      setDrivers(driversResponse.data.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to fetch/search drivers."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className="bg-yellow-400 text-black px-4 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between shadow-md sticky top-0 z-50 gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img
            src={latchLogo}
            alt="Latch Logo"
            className="h-10 w-10 rounded-lg bg-white p-1.5 shadow mr-3 sm:mr-4"
          />
          <span className="font-bold text-xl sm:text-2xl tracking-wide">
            LATCH DRIVERS
          </span>
        </div>
      </div>
      <input
        type="text"
        placeholder="Search by name or phone..."
        value={search}
        onChange={onChangeSearch}
        className="px-3 sm:px-4 py-2 rounded-md border-none outline-none w-full sm:w-72 text-black bg-white text-base shadow focus:ring-2 focus:ring-yellow-500 transition"
      />
    </nav>
  );
}

export default Navbar;
