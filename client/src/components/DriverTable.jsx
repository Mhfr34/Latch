import React, { useEffect, useState } from "react";
import axios from "axios";
import { AiOutlineClose } from "react-icons/ai";
import { FaTrash } from "react-icons/fa";
import Navbar from "./Navbar";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";

function DriverTable() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phoneNumber: "",
    subscriptionStatus: "inactive",
    nextSubscriptionDate: "",
  });
  const [formError, setFormError] = useState(null);

  // Fetch all drivers
  const fetchDrivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/get-all-drivers`);
      setDrivers(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch drivers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
    // eslint-disable-next-line
  }, []);

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    // Input validation
    if (!form.name.trim() || !form.phoneNumber.trim()) {
      setFormError("Name and phone number are required.");
      setFormLoading(false);
      return;
    }

    try {
      const payload = {
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
        subscriptionStatus: form.subscriptionStatus,
        nextSubscriptionDate: form.nextSubscriptionDate
          ? new Date(form.nextSubscriptionDate)
          : null,
      };

      if (selectedDriver) {
        // Update existing driver
        await axios.post(`${API_URL}/update-driver`, {
          _id: selectedDriver._id,
          ...payload,
        });
      } else {
        // Add new driver
        await axios.post(`${API_URL}/add-driver`, payload);
      }

      // Reset form and fetch drivers
      setShowModal(false);
      fetchDrivers();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to save driver."
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleRowClick = (driver) => {
    setSelectedDriver(driver);
    setForm({
      name: driver.name,
      phoneNumber: driver.phoneNumber,
      subscriptionStatus: driver.subscriptionStatus,
      nextSubscriptionDate: driver.nextSubscriptionDate
        ? new Date(driver.nextSubscriptionDate).toISOString().split("T")[0]
        : "",
    });
    setShowModal(true);
  };

  const handleAddNewDriver = () => {
    setSelectedDriver(null);
    setForm({
      name: "",
      phoneNumber: "",
      subscriptionStatus: "inactive",
      nextSubscriptionDate: "",
    });
    setShowModal(true);
  };

  const handleDeleteDriver = () => {
    confirmAlert({
      title: "Confirm to delete",
      message: `Are you sure you want to delete ${selectedDriver.name}?`,
      buttons: [
        {
          label: "Yes",
          onClick: async () => {
            try {
              await axios.delete(`${API_URL}/delete-driver`, {
                data: { driverId: selectedDriver._id },
              });
              setShowModal(false);
              fetchDrivers();
            } catch (err) {
              setError(
                err.response?.data?.message || "Failed to delete driver."
              );
            }
          },
        },
        {
          label: "No",
          onClick: () => {},
        },
      ],
    });
  };

  // QR Code logic
  useEffect(() => {
    let interval;
    if (showQr) {
      setQrLoading(true);
      fetchQr();

      // Poll every 10s to refresh QR code
      interval = setInterval(fetchQr, 10000);
    }
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [showQr]);

  const fetchQr = async () => {
    setQrLoading(true);
    try {
      const res = await fetch(`${API_URL}/whatsapp-qr`);
      const data = await res.json();
      setQrImageUrl(data.qrImageUrl || null);
    } catch {
      setQrImageUrl(null);
    }
    setQrLoading(false);
  };

  return (
    <div className="min-h-screen bg-yellow-50">
      <Navbar
        setDrivers={setDrivers}
        setLoading={setLoading}
        setError={setError}
      />
      <main className="max-w-4xl mx-auto mt-6 sm:mt-10 px-2 sm:px-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end mb-4 gap-2">
          <button
            onClick={handleAddNewDriver}
            className="px-5 sm:px-7 py-2 rounded-md bg-black text-yellow-400 font-semibold text-base shadow hover:bg-gray-900 transition"
          >
            + Add New Driver
          </button>
          <button
            onClick={() => setShowQr(true)}
            className="px-5 py-2 bg-green-600 text-white rounded font-semibold shadow hover:bg-green-700 transition"
          >
            Link WhatsApp
          </button>
        </div>
        {loading && <div className="text-black mb-2">Loading...</div>}
        {error && <div className="text-red-600 mb-2">{error}</div>}

        {/* Add/Update Driver Modal/Form */}
        {showModal && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-40 px-2"
            onClick={() => setShowModal(false)}
          >
            <form
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSubmit}
              className="bg-yellow-50 border-2 border-yellow-400 text-black rounded-lg shadow-xl px-4 py-5 sm:px-8 sm:py-6 w-full max-w-md relative"
            >
              <AiOutlineClose
                className="absolute top-3 right-3 text-black cursor-pointer"
                size={24}
                onClick={() => setShowModal(false)}
              />
              <h3 className="text-lg sm:text-xl font-bold mb-4">
                {selectedDriver ? "Update Driver" : "Add New Driver"}
              </h3>
              {formError && (
                <div className="text-red-600 mb-2">{formError}</div>
              )}
              <div className="mb-3">
                <label className="block mb-1 font-medium">
                  Name:
                  <input
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 mt-1 rounded-md border border-yellow-400 outline-none text-black bg-white"
                  />
                </label>
              </div>
              <div className="mb-3">
                <label className="block mb-1 font-medium">
                  Phone Number:
                  <input
                    name="phoneNumber"
                    type="text"
                    value={form.phoneNumber}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 mt-1 rounded-md border border-yellow-400 outline-none text-black bg-white"
                  />
                </label>
              </div>
              <div className="mb-3">
                <label className="block mb-1 font-medium">
                  Subscription Status:
                  <select
                    name="subscriptionStatus"
                    value={form.subscriptionStatus}
                    onChange={handleChange}
                    className="w-full px-3 py-2 mt-1 rounded-md border border-yellow-400 text-black bg-white"
                  >
                    <option value="inactive">Inactive</option>
                    <option value="active">Active</option>
                  </select>
                </label>
              </div>
              <div className="mb-4">
                <label className="block mb-1 font-medium">
                  Next Subscription Date:
                  <input
                    name="nextSubscriptionDate"
                    type="date"
                    value={form.nextSubscriptionDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 mt-1 rounded-md border border-yellow-400 text-black bg-white"
                  />
                </label>
              </div>
              <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                {selectedDriver && (
                  <button
                    type="button"
                    onClick={handleDeleteDriver}
                    className="flex items-center justify-center px-6 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                  >
                    <FaTrash className="mr-2" /> Delete Driver
                  </button>
                )}
                <button
                  type="submit"
                  className="px-6 py-2 rounded-md bg-black text-yellow-400 font-semibold hover:bg-gray-900 transition"
                  disabled={formLoading}
                >
                  {formLoading
                    ? "Saving..."
                    : selectedDriver
                    ? "Update Driver"
                    : "Add Driver"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* WhatsApp QR Modal */}
        {showQr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded p-6 min-w-[300px] relative">
              <button
                className="absolute top-2 right-2 text-gray-700"
                onClick={() => setShowQr(false)}
              >
                Close
              </button>
              <h2 className="text-lg font-semibold mb-4">
                Scan WhatsApp QR Code
              </h2>
              {qrLoading ? (
                <div>Loading QR code...</div>
              ) : qrImageUrl ? (
                <img src={qrImageUrl} alt="WhatsApp QR" className="mx-auto" />
              ) : (
                <div>No QR code available.</div>
              )}
              <div className="mt-4 text-xs text-gray-600">
                Open WhatsApp on your phone, go to Menu &gt; Linked Devices and
                scan this QR code.
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto border border-yellow-300 rounded-lg shadow">
          <table className="min-w-full text-left bg-white rounded-lg text-xs sm:text-base">
            <thead className="bg-yellow-400 text-black">
              <tr>
                <th
                  className="py-2 px-2 sm:px-4 font-semibold"
                  style={{ width: "25%" }}
                >
                  Name
                </th>
                <th
                  className="py-2 px-2 sm:px-4 font-semibold"
                  style={{ width: "25%" }}
                >
                  Phone Number
                </th>
                <th
                  className="py-2 px-2 sm:px-4 font-semibold"
                  style={{ width: "25%" }}
                >
                  Subscription Status
                </th>
                <th
                  className="py-2 px-2 sm:px-4 font-semibold"
                  style={{ width: "25%" }}
                >
                  Next Subscription Date
                </th>
              </tr>
            </thead>
            <tbody>
              {drivers && drivers.length > 0 ? (
                drivers.map((driver) => (
                  <tr
                    key={driver._id}
                    className="hover:bg-yellow-100 transition"
                    onClick={() => handleRowClick(driver)}
                  >
                    <td className="py-2 px-2 sm:px-4 break-all">
                      {driver.name}
                    </td>
                    <td className="py-2 px-2 sm:px-4 break-all">
                      {driver.phoneNumber}
                    </td>
                    <td className="py-2 px-2 sm:px-4 capitalize">
                      {driver.subscriptionStatus}
                    </td>
                    <td className="py-2 px-2 sm:px-4">
                      {driver.nextSubscriptionDate
                        ? new Date(
                            driver.nextSubscriptionDate
                          ).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-500">
                    {loading ? "Loading..." : "No drivers found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default DriverTable;
