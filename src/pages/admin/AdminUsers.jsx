import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { serverUrl } from "../../App";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ role: "", status: "" });
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    status: "approved",
  });
  const [passwordUpdates, setPasswordUpdates] = useState({});
  const [editingPassword, setEditingPassword] = useState(null);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/admin/users`, {
        params: { ...filters },
        withCredentials: true,
      });
      setUsers(res.data);
    } catch (error) {
      toast.error("Failed to load users");
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.role, filters.status]);

  const createUser = async () => {
    if (!form.name || !form.email || !form.password) {
      toast.error("Name, email, password required");
      return;
    }
    try {
      await axios.post(`${serverUrl}/api/admin/users`, form, { withCredentials: true });
      toast.success("User created");
      setForm({ name: "", email: "", password: "", role: "student", status: "approved" });
      fetchUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Create failed");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(
        `${serverUrl}/api/admin/users/${id}/status`,
        { status },
        { withCredentials: true }
      );
      toast.success("Status updated");
      fetchUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Update failed");
    }
  };

  const updatePassword = async (userId) => {
    const newPassword = passwordUpdates[userId];
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    try {
      await axios.patch(
        `${serverUrl}/api/admin/users/${userId}/password`,
        { password: newPassword },
        { withCredentials: true }
      );
      toast.success("Password updated successfully");
      setPasswordUpdates((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      setEditingPassword(null);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update password");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin - Users</h1>
          <div className="flex gap-2">
            <select
              className="border rounded p-2 text-sm text-black"
              value={filters.role}
              onChange={(e) => setFilters((p) => ({ ...p, role: e.target.value }))}
            >
              <option value="">All roles</option>
              <option value="student">Student</option>
              <option value="educator">Educator</option>
              <option value="admin">Admin</option>
            </select>
            <select
              className="border rounded p-2 text-sm text-black"
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="">All status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h2 className="font-semibold">Create User</h2>
            <input
              className="w-full border rounded p-2 text-black"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              className="w-full border rounded p-2 text-black"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
            <input
              className="w-full border rounded p-2 text-black"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            />
            <select
              className="w-full border rounded p-2 text-black"
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
            >
              <option value="student">Student</option>
              <option value="educator">Educator</option>
              <option value="admin">Admin</option>
            </select>
            <select
              className="w-full border rounded p-2 text-black"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            <button onClick={createUser} className="px-4 py-2 bg-black text-white rounded-lg">
              Create
            </button>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold">Users</h2>
            <div className="max-h-[520px] overflow-y-auto space-y-2">
              {users.map((u) => (
                <div key={u._id} className="border rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold">{u.name}</p>
                      <p className="text-sm text-gray-600">{u.email}</p>
                      <p className="text-xs text-gray-500">
                        Role: {u.role} • Status: {u.status}
                      </p>
                      
                      {/* Password Update Section */}
                      {editingPassword === u._id ? (
                        <div className="mt-3 space-y-2">
                          <input
                            type="password"
                            className="w-full border rounded p-2 text-sm text-black"
                            placeholder="New password (min 8 chars)"
                            value={passwordUpdates[u._id] || ""}
                            onChange={(e) =>
                              setPasswordUpdates((prev) => ({
                                ...prev,
                                [u._id]: e.target.value,
                              }))
                            }
                          />
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded"
                              onClick={() => updatePassword(u._id)}
                            >
                              Save
                            </button>
                            <button
                              className="px-3 py-1 bg-gray-300 text-black text-sm rounded"
                              onClick={() => {
                                setEditingPassword(null);
                                setPasswordUpdates((prev) => {
                                  const updated = { ...prev };
                                  delete updated[u._id];
                                  return updated;
                                });
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="mt-2 text-xs text-blue-600 hover:underline"
                          onClick={() => setEditingPassword(u._id)}
                        >
                          🔑 Update Password
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex gap-2">
                        <button
                          className="text-green-600 hover:bg-green-50 px-2 py-1 rounded"
                          onClick={() => updateStatus(u._id, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded"
                          onClick={() => updateStatus(u._id, "pending")}
                        >
                          Pending
                        </button>
                        <button
                          className="text-red-600 hover:bg-red-50 px-2 py-1 rounded"
                          onClick={() => updateStatus(u._id, "rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 && <p className="text-gray-500 text-sm">No users.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminUsers;

