import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  getResources, 
  getResourceCategories, 
  getCrisisHotlines, 
  getRecommendedResources,
  engageResource
} from "../../lib/api";
import Navbar from "../../components/navbar/NavBar";
import "./ResourcesPage.css";
import { Search, BookOpen, Video, Headphones, Activity, Phone, AlertTriangle, Star } from "lucide-react";

export default function ResourcesPage() {
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  // Fetch Resources
  const { data: resourcesData, isLoading: isLoadingResources, error: resourcesError } = useQuery({
    queryKey: ["resources", category, search],
    queryFn: () => getResources({ category, search }),
  });

  // Fetch Categories
  const { data: categoriesData } = useQuery({
    queryKey: ["resourceCategories"],
    queryFn: getResourceCategories,
  });

  // Fetch Crisis Hotlines
  const { data: hotlinesData } = useQuery({
    queryKey: ["crisisHotlines"],
    queryFn: () => getCrisisHotlines({ country: "US" }), // Defaulting to US for now
  });

  // Fetch Recommendations
  const { data: recommendationsData } = useQuery({
    queryKey: ["recommendedResources"],
    queryFn: getRecommendedResources,
    retry: false, // Don't retry if 401 (not logged in)
  });

  const resources = resourcesData?.data?.resources || [];
  const categories = categoriesData?.data?.categories || [];
  const hotlines = hotlinesData?.data?.hotlines || [];
  const recommendations = recommendationsData?.data?.recommendations || [];

  const getIcon = (type) => {
    switch (type) {
      case "video": return <Video size={20} />;
      case "audio": return <Headphones size={20} />;
      case "exercise": return <Activity size={20} />;
      case "hotline": return <Phone size={20} />;
      default: return <BookOpen size={20} />;
    }
  };

  const handleAccessResource = async (resourceId, url) => {
    try {
      await engageResource(resourceId, "complete");
    } catch (error) {
      console.error("Failed to track engagement", error);
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="resources-page">
      <Navbar />
      <div className="resources-content">
        <div className="resources-header">
          <h1>Mental Health Resources</h1>
          <p>Curated tools and guides to support your journey.</p>
        </div>

        {/* Crisis Support Section */}
        {hotlines.length > 0 && (
          <div className="crisis-section">
            <div className="crisis-header">
              <AlertTriangle size={24} />
              <h2>Immediate Crisis Support</h2>
            </div>
            <div className="hotlines-grid">
              {hotlines.map((hotline, index) => (
                <div key={index} className="hotline-card">
                  <h3>{hotline.title}</h3>
                  <p>{hotline.description}</p>
                  <div className="hotline-number">{hotline.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Section */}
        {recommendations.length > 0 && !search && !category && (
          <div className="recommended-section">
            <div className="section-header">
              <Star size={20} className="star-icon" />
              <h2>Recommended for You</h2>
            </div>
            <div className="resources-grid">
              {recommendations.map((resource) => (
                <div key={resource._id} className="resource-card recommended">
                  <div className="resource-type">
                    {getIcon(resource.type)}
                    <span>{resource.type}</span>
                  </div>
                  <h3>{resource.title}</h3>
                  <p>{resource.description}</p>
                  <div className="resource-footer">
                    <span className={`difficulty ${resource.difficulty}`}>
                      {resource.difficulty}
                    </span>
                    <button 
                      onClick={() => handleAccessResource(resource._id, resource.content)}
                      className="access-btn"
                    >
                      Access Resource
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="filters-section">
          <div className="search-bar">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="category-filters">
            <button
              className={`category-btn ${category === "" ? "active" : ""}`}
              onClick={() => setCategory("")}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                className={`category-btn ${category === cat.name ? "active" : ""}`}
                onClick={() => setCategory(cat.name)}
              >
                {cat.name.charAt(0).toUpperCase() + cat.name.slice(1).replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {isLoadingResources ? (
          <div className="loading-state">
            <div className="spinner"></div>
          </div>
        ) : resourcesError ? (
          <div className="error-state">
            <p>Failed to load resources. Please try again.</p>
          </div>
        ) : (
          <div className="resources-grid">
            {resources.length > 0 ? (
              resources.map((resource) => (
                <div key={resource._id} className="resource-card">
                  <div className="resource-type">
                    {getIcon(resource.type)}
                    <span>{resource.type}</span>
                  </div>
                  <h3>{resource.title}</h3>
                  <p>{resource.description}</p>
                  <div className="resource-footer">
                    <span className={`difficulty ${resource.difficulty}`}>
                      {resource.difficulty}
                    </span>
                    <button 
                      onClick={() => handleAccessResource(resource._id, resource.content)}
                      className="access-btn"
                    >
                      Access Resource
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">
                <p>No resources found matching your criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
