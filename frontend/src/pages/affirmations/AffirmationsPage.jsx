import React, { useState } from 'react';
import Navbar from '../../components/navbar/NavBar';
import { Heart, RefreshCw, Sun, Cloud, Smile } from 'lucide-react';
import './AffirmationsPage.css';

const AFFIRMATIONS_DATA = [
  { id: 1, text: "I am worthy of all the good things life creates for me, and I deserve to receive love, kindness, and prosperity in abundance.", category: "Self-Esteem" },
  { id: 2, text: "This too shall pass; just as the clouds move to reveal the sun, this difficult moment is temporary and better days are coming.", category: "Anxiety" },
  { id: 3, text: "I choose to be happy and love myself today, embracing my unique journey and finding joy in the simple moments.", category: "Depression" },
  { id: 4, text: "My possibilities are endless, and I am capable of achieving anything I set my mind to with patience and persistence.", category: "Hope" },
  { id: 5, text: "I am enough just as I am; I do not need to prove my worth to anyone, for my value is inherent and constant.", category: "Self-Esteem" },
  { id: 6, text: "I breathe in calmness and breathe out stress, allowing my body to relax and my mind to find a peaceful center.", category: "Anxiety" },
  { id: 7, text: "I have the power to create change in my life, and I trust in my ability to make decisions that lead to my growth and happiness.", category: "Confidence" },
  { id: 8, text: "My challenges help me grow, transforming obstacles into stepping stones that build my resilience and character.", category: "Growth" },
  { id: 9, text: "I forgive myself and set myself free from the weight of past mistakes, choosing to learn from them and move forward with grace.", category: "Forgiveness" },
  { id: 10, text: "I am in charge of how I feel and today I am choosing happiness, focusing on the positive aspects of my life and letting go of negativity.", category: "Depression" },
  { id: 11, text: "I am safe and protected, grounded in the present moment, and I trust that I have the strength to handle whatever comes my way.", category: "Anxiety" },
  { id: 12, text: "I love the person I am becoming, celebrating my progress and embracing every part of my journey with compassion.", category: "Self-Esteem" },
  { id: 13, text: "Small steps are still progress; I celebrate every victory, no matter how small, knowing they lead to great achievements.", category: "Depression" },
  { id: 14, text: "I trust the process of life, believing that everything is unfolding exactly as it should for my highest good.", category: "Hope" },
  { id: 15, text: "I release the need for perfection and embrace my authentic self, knowing that my best is always good enough.", category: "Anxiety" },
  { id: 16, text: "I deserve to be at peace, and I give myself permission to rest, recharge, and protect my inner tranquility.", category: "Peace" },
  { id: 17, text: "I am stronger than my struggles, possessing an inner resilience that allows me to overcome any adversity with courage.", category: "Strength" },
  { id: 18, text: "Every day is a fresh start, a new opportunity to write my story, pursue my dreams, and create the life I desire.", category: "Hope" },
  { id: 19, text: "I am allowed to take up space, to speak my truth, and to be seen and heard exactly as I am.", category: "Confidence" },
  { id: 20, text: "My feelings are valid, and I honor them by allowing myself to feel, express, and release emotions in a healthy way.", category: "Self-Validation" },
  { id: 21, text: "I am fearfully and wonderfully made: \"I praise you because I am fearfully and wonderfully made; your works are wonderful, I know that full well.\" – Psalm 139:14", category: "Faith" },
  { id: 22, text: "I am God's masterpiece: \"For we are God’s masterpiece. He has created us anew in Christ Jesus, so we can do the good things he planned for us long ago.\" – Ephesians 2:10", category: "Faith" },
  { id: 23, text: "I am deeply loved: \"I have loved you with an everlasting love; I have drawn you with unfailing kindness.\" – Jeremiah 31:3", category: "Faith" },
  { id: 24, text: "I am the apple of His eye: \"He shielded him and cared for him; he guarded him as the apple of his eye.\" – Deuteronomy 32:10", category: "Faith" },
  { id: 25, text: "I am chosen and accepted: \"Therefore, as God’s chosen people, holy and dearly loved...\" – Colossians 3:12", category: "Faith" },
];

const CATEGORIES = ["All", "Anxiety", "Depression", "Self-Esteem", "Hope", "Confidence", "Faith"];

export default function AffirmationsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [randomAffirmation, setRandomAffirmation] = useState(AFFIRMATIONS_DATA[0]);

  const filteredAffirmations = activeCategory === "All" 
    ? AFFIRMATIONS_DATA 
    : AFFIRMATIONS_DATA.filter(a => a.category === activeCategory);

  const getNewRandomAffirmation = () => {
    const randomIndex = Math.floor(Math.random() * AFFIRMATIONS_DATA.length);
    setRandomAffirmation(AFFIRMATIONS_DATA[randomIndex]);
  };

  return (
    <div className="affirmations-page">
      <Navbar />
      <div className="affirmations-container">
        <div className="affirmations-header">
          <h1><Sun className="inline-icon" size={32} color="#f39c12" /> Daily Affirmations</h1>
          <p>Positive words to lift your spirit and calm your mind.</p>
        </div>

        <div className="random-affirmation-section">
          <div className="random-affirmation-content">
            <h2>Today's Focus</h2>
            <div className="random-affirmation-text">
              "{randomAffirmation.text}"
            </div>
            <button onClick={getNewRandomAffirmation} className="refresh-btn">
              <RefreshCw size={16} style={{display: 'inline', marginRight: '8px'}}/>
              New Affirmation
            </button>
          </div>
        </div>

        <div className="category-filters">
          {CATEGORIES.map(category => (
            <button
              key={category}
              className={`filter-btn ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="affirmations-grid">
          {filteredAffirmations.map(affirmation => (
            <div key={affirmation.id} className="affirmation-card">
              <p className="affirmation-text">{affirmation.text}</p>
              <span className="affirmation-category">{affirmation.category}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
