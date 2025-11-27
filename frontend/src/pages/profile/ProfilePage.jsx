import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { 
  getUserProfile, 
  getMoodEntries, 
  logoutUser, 
  updateUserProfile, 
  updateUserPreferences,
  changeUserPassword,
  deleteUserAccount
} from "../../lib/api";
import Navbar from "../../components/navbar/NavBar";
import "./ProfilePage.css";
import { User, Mail, Calendar, Settings, LogOut, Activity, Edit2, Lock, Trash2, X, Check } from "lucide-react";

export default function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [editForm, setEditForm] = useState({ name: "", age: "", preferredLanguage: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [deleteForm, setDeleteForm] = useState({ password: "", reason: "" });
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["userProfile"],
    queryFn: getUserProfile,
  });

  const { data: moodData } = useQuery({
    queryKey: ["moodEntries"],
    queryFn: () => getMoodEntries({ limit: 5 }),
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries(["userProfile"]);
      setIsEditing(false);
      setSuccessMsg("Profile updated successfully");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
    onError: (err) => setErrorMsg(err.response?.data?.error || "Failed to update profile")
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries(["userProfile"]);
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: changeUserPassword,
    onSuccess: () => {
      setIsChangingPassword(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccessMsg("Password changed successfully");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
    onError: (err) => setErrorMsg(err.response?.data?.error || "Failed to change password")
  });

  const deleteAccountMutation = useMutation({
    mutationFn: deleteUserAccount,
    onSuccess: () => {
      localStorage.removeItem("token");
      navigate("/login");
    },
    onError: (err) => setErrorMsg(err.response?.data?.error || "Failed to delete account")
  });

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error("Logout failed", e);
    }
    localStorage.removeItem("token");
    navigate("/login");
  };

  const startEditing = () => {
    setEditForm({
      name: user.name,
      age: user.age || "",
      preferredLanguage: user.preferredLanguage || "en"
    });
    setIsEditing(true);
    setErrorMsg("");
  };

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(editForm);
  };

  const handleTogglePreference = (key, currentValue) => {
    updatePreferencesMutation.mutate({ [key]: !currentValue });
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword
    });
  };

  const handleDeleteAccount = (e) => {
    e.preventDefault();
    deleteAccountMutation.mutate(deleteForm);
  };

  if (isLoading) {
    return (
      <div className="profile-page-container">
        <Navbar />
        <div className="profile-content loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page-container">
        <Navbar />
        <div className="profile-content error">
          <h2>Error loading profile</h2>
          <p>Please try again later.</p>
        </div>
      </div>
    );
  }

  const user = data?.data?.user;
  const recentMoods = moodData?.data?.entries || [];

  return (
    <div className="profile-page-container">
      <Navbar />
      <div className="profile-content">
        <div className="profile-header">
          <h1>My Profile</h1>
        </div>

        {successMsg && <div className="alert success">{successMsg}</div>}
        {errorMsg && <div className="alert error">{errorMsg}</div>}

        {user && (
          <div className="profile-grid">
            <div className="profile-card">
              <div className="profile-avatar-section">
                <div className="profile-avatar-placeholder">
                  <User size={64} color="#fff" />
                </div>
                <h2>{user.name}</h2>
                <p className="profile-email">{user.email}</p>
                <button className="edit-profile-btn" onClick={startEditing}>
                  <Edit2 size={16} /> Edit Profile
                </button>
              </div>

              <div className="profile-details">
                <div className="detail-item">
                  <Mail className="detail-icon" size={20} />
                  <div className="detail-info">
                    <span className="detail-label">Email</span>
                    <span className="detail-value">{user.email}</span>
                  </div>
                </div>

                <div className="detail-item">
                  <Calendar className="detail-icon" size={20} />
                  <div className="detail-info">
                    <span className="detail-label">Joined</span>
                    <span className="detail-value">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="detail-item">
                  <Settings className="detail-icon" size={20} />
                  <div className="detail-info">
                    <span className="detail-label">Preferences</span>
                    <div className="preferences-list">
                      <button 
                        className={`preference-tag ${user.preferences?.notificationsEnabled ? 'active' : ''}`}
                        onClick={() => handleTogglePreference('notificationsEnabled', user.preferences?.notificationsEnabled)}
                      >
                        Notifications
                      </button>
                      <button 
                        className={`preference-tag ${user.preferences?.dailyCheckIns ? 'active' : ''}`}
                        onClick={() => handleTogglePreference('dailyCheckIns', user.preferences?.dailyCheckIns)}
                      >
                        Daily Check-ins
                      </button>
                    </div>
                  </div>
                </div>

                <div className="account-actions">
                  <button className="action-link" onClick={() => setIsChangingPassword(true)}>
                    <Lock size={16} /> Change Password
                  </button>
                  <button className="action-link danger" onClick={() => setIsDeleting(true)}>
                    <Trash2 size={16} /> Delete Account
                  </button>
                </div>

                <div className="logout-section">
                  <button onClick={handleLogout} className="logout-btn">
                    <LogOut size={20} />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mood-history-card">
              <div className="card-header">
                <Activity size={24} />
                <h3>Recent Mood History</h3>
              </div>
              <div className="mood-list">
                {recentMoods.length > 0 ? (
                  recentMoods.map((entry) => (
                    <div key={entry._id} className="mood-item">
                      <div className="mood-score" style={{
                        backgroundColor: entry.overall >= 7 ? '#dcfce7' : entry.overall >= 4 ? '#dbeafe' : '#fee2e2',
                        color: entry.overall >= 7 ? '#166534' : entry.overall >= 4 ? '#1e40af' : '#991b1b'
                      }}>
                        {entry.overall}/10
                      </div>
                      <div className="mood-info">
                        <span className="mood-date">
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                        <span className="mood-time">
                          {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-moods">No mood entries yet. Check in on the home page!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Profile Modal */}
        {isEditing && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Edit Profile</h3>
              <form onSubmit={handleUpdateProfile}>
                <div className="form-group">
                  <label>Name</label>
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Age</label>
                  <input 
                    type="number" 
                    value={editForm.age} 
                    onChange={(e) => setEditForm({...editForm, age: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Language</label>
                  <select 
                    value={editForm.preferredLanguage} 
                    onChange={(e) => setEditForm({...editForm, preferredLanguage: e.target.value})}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="save-btn" disabled={updateProfileMutation.isPending}>Save</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {isChangingPassword && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Change Password</h3>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label>Current Password</label>
                  <input 
                    type="password" 
                    value={passwordForm.currentPassword} 
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input 
                    type="password" 
                    value={passwordForm.newPassword} 
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input 
                    type="password" 
                    value={passwordForm.confirmPassword} 
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    required 
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setIsChangingPassword(false)}>Cancel</button>
                  <button type="submit" className="save-btn" disabled={changePasswordMutation.isPending}>Update Password</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Account Modal */}
        {isDeleting && (
          <div className="modal-overlay">
            <div className="modal-content danger-modal">
              <h3>Delete Account</h3>
              <p>This action cannot be undone. Please enter your password to confirm.</p>
              <form onSubmit={handleDeleteAccount}>
                <div className="form-group">
                  <label>Password</label>
                  <input 
                    type="password" 
                    value={deleteForm.password} 
                    onChange={(e) => setDeleteForm({...deleteForm, password: e.target.value})}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Reason (Optional)</label>
                  <textarea 
                    value={deleteForm.reason} 
                    onChange={(e) => setDeleteForm({...deleteForm, reason: e.target.value})}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="cancel-btn" onClick={() => setIsDeleting(false)}>Cancel</button>
                  <button type="submit" className="delete-confirm-btn" disabled={deleteAccountMutation.isPending}>Delete Permanently</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
