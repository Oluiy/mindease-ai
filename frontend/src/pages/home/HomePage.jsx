import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getUserProfile, createMoodEntry } from "../../lib/api";
import Navbar from "../../components/navbar/NavBar";
import "./HomePage.css";
import { MessageSquare, BookOpen, User, Heart, Sun, Moon, CheckCircle } from "lucide-react";

export default function HomePage() {
  const navigate = useNavigate();
  const [moodStatus, setMoodStatus] = useState(null); // 'success', 'error', or null
  const [statusMessage, setStatusMessage] = useState("");

  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: getUserProfile,
  });

  const moodMutation = useMutation({
    mutationFn: createMoodEntry,
    onSuccess: () => {
      setMoodStatus("success");
      setStatusMessage("Mood recorded! Thanks for checking in.");
      setTimeout(() => setMoodStatus(null), 3000);
    },
    onError: (error) => {
      setMoodStatus("error");
      setStatusMessage(error.response?.data?.error || "Failed to record mood.");
      setTimeout(() => setMoodStatus(null), 3000);
    }
  });

  const handleMoodClick = (score) => {
    moodMutation.mutate({
      overall: score,
      entryType: 'daily'
    });
  };

  const user = userProfile?.data?.user;
  const hour = new Date().getHours();
  let greeting = "Good Morning";
  if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
  if (hour >= 17) greeting = "Good Evening";

  return (
    <div className="home-page">
      <Navbar />
      <div className="home-content">
        <header className="home-header">
          <h1>{greeting}, {user?.name || "Friend"}</h1>
          <p className="subtitle">How are you feeling right now?</p>
        </header>

        {moodStatus === "success" ? (
          <div className="mood-feedback success">
            <CheckCircle size={32} />
            <p>{statusMessage}</p>
          </div>
        ) : (
          <div className="mood-selector">
            <button 
              className="mood-btn happy" 
              onClick={() => handleMoodClick(9)}
              disabled={moodMutation.isPending}
            >
              <Sun size={32} />
              <span>Great</span>
            </button>
            <button 
              className="mood-btn neutral" 
              onClick={() => handleMoodClick(6)}
              disabled={moodMutation.isPending}
            >
              <Heart size={32} />
              <span>Okay</span>
            </button>
            <button 
              className="mood-btn sad" 
              onClick={() => handleMoodClick(3)}
              disabled={moodMutation.isPending}
            >
              <Moon size={32} />
              <span>Not Good</span>
            </button>
          </div>
        )}
        
        {moodStatus === "error" && (
          <div className="mood-error-message">
            {statusMessage}
          </div>
        )}

        <div className="quick-actions">
          <div className="action-card" onClick={() => navigate("/chat")}>
            <div className="icon-wrapper chat-icon">
              <MessageSquare size={32} />
            </div>
            <h3>Talk to AI</h3>
            <p>Start a conversation with your companion.</p>
          </div>

          <div className="action-card" onClick={() => navigate("/resources")}>
            <div className="icon-wrapper resource-icon">
              <BookOpen size={32} />
            </div>
            <h3>Resources</h3>
            <p>Explore articles, exercises, and guides.</p>
          </div>

          <div className="action-card" onClick={() => navigate("/profile")}>
            <div className="icon-wrapper profile-icon">
              <User size={32} />
            </div>
            <h3>Your Profile</h3>
            <p>Manage your settings and preferences.</p>
          </div>
        </div>

        <div className="daily-quote">
          <blockquote>
            "You don't have to control your thoughts. You just have to stop letting them control you."
          </blockquote>
          <cite>— Dan Millman</cite>
        </div>
      </div>
    </div>
  );
}
