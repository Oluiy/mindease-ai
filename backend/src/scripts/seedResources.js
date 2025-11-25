const mongoose = require('mongoose');
const Resource = require('../models/Resource');
require('dotenv').config();

const sampleResources = [
  // Anxiety Resources
  {
    title: 'Understanding Anxiety: A Beginner\'s Guide',
    description: 'Learn about anxiety symptoms, causes, and management techniques',
    content: 'Anxiety is a natural response to stress, but when it becomes overwhelming, it can interfere with daily life. This guide covers breathing techniques, mindfulness exercises, and when to seek help.',
    type: 'article',
    category: 'anxiety',
    tags: ['anxiety', 'stress', 'mindfulness', 'breathing'],
    difficulty: 'beginner',
    duration: 15,
    language: 'en',
    priority: 8,
    accessibility: {
      hasAudio: true,
      hasTranscript: true
    }
  },
  {
    title: '5-Minute Breathing Exercise for Anxiety',
    description: 'Quick breathing technique to calm anxiety in moments of stress',
    content: 'This guided breathing exercise uses the 4-7-8 technique to quickly reduce anxiety symptoms. Follow along with the audio guide.',
    type: 'exercise',
    category: 'anxiety',
    tags: ['breathing', 'quick-relief', 'anxiety'],
    difficulty: 'beginner',
    duration: 5,
    language: 'en',
    priority: 9,
    accessibility: {
      hasAudio: true
    }
  },

  // Depression Resources
  {
    title: 'Daily Mood Tracking Journal',
    description: 'Simple techniques for tracking and understanding your mood patterns',
    content: 'Regular mood tracking can help identify triggers and patterns. This guide shows you how to start a mood journal and what to look for.',
    type: 'technique',
    category: 'depression',
    tags: ['mood-tracking', 'journaling', 'self-awareness'],
    difficulty: 'beginner',
    duration: 10,
    language: 'en',
    priority: 7
  },
  {
    title: 'Gentle Movement for Depression',
    description: 'Low-impact exercises to boost mood and energy',
    content: 'Physical activity can significantly improve mood. These gentle exercises can be done anywhere and don\'t require equipment.',
    type: 'exercise',
    category: 'depression',
    tags: ['exercise', 'movement', 'energy'],
    difficulty: 'beginner',
    duration: 20,
    language: 'en',
    priority: 6
  },

  // Crisis Resources
  {
    title: 'National Suicide Prevention Lifeline',
    description: '24/7 crisis support available immediately',
    content: 'If you\'re having thoughts of suicide or are in emotional distress, call 988 for immediate support. Trained counselors are available 24/7.',
    type: 'hotline',
    category: 'crisis',
    tags: ['crisis', 'hotline', 'immediate-help'],
    language: 'en',
    isCrisis: true,
    priority: 10,
    accessibility: {
      hasAudio: true
    }
  },
  {
    title: 'Crisis Text Line',
    description: 'Text-based crisis support',
    content: 'Text HOME to 741741 to connect with a crisis counselor. Free, confidential, 24/7 support via text message.',
    type: 'hotline',
    category: 'crisis',
    tags: ['crisis', 'text-support', 'immediate-help'],
    language: 'en',
    isCrisis: true,
    priority: 10
  },

  // Mindfulness Resources
  {
    title: '10-Minute Mindfulness Meditation',
    description: 'Guided meditation for beginners to reduce stress and anxiety',
    content: 'This gentle guided meditation helps you focus on the present moment and release tension. Perfect for daily practice.',
    type: 'audio',
    category: 'mindfulness',
    tags: ['meditation', 'guided', 'relaxation'],
    difficulty: 'beginner',
    duration: 10,
    language: 'en',
    priority: 8,
    accessibility: {
      hasAudio: true,
      hasTranscript: true
    }
  },

  // Sleep Resources
  {
    title: 'Sleep Hygiene: Better Rest for Better Mental Health',
    description: 'Evidence-based tips for improving sleep quality',
    content: 'Good sleep is crucial for mental health. Learn about sleep hygiene practices, bedtime routines, and when poor sleep might indicate a larger issue.',
    type: 'article',
    category: 'sleep',
    tags: ['sleep', 'hygiene', 'routine'],
    difficulty: 'beginner',
    duration: 12,
    language: 'en',
    priority: 7
  },

  // Stress Management
  {
    title: 'Progressive Muscle Relaxation Guide',
    description: 'Step-by-step guide to release physical tension',
    content: 'Progressive muscle relaxation involves tensing and releasing different muscle groups to reduce physical stress and promote relaxation.',
    type: 'technique',
    category: 'stress',
    tags: ['relaxation', 'tension-relief', 'body-awareness'],
    difficulty: 'beginner',
    duration: 15,
    language: 'en',
    priority: 7
  },

  // Self-Care Resources
  {
    title: 'Building a Self-Care Routine That Works',
    description: 'Practical guide to sustainable self-care practices',
    content: 'Self-care isn\'t selfish—it\'s essential. This guide helps you identify what self-care means for you and how to make it a regular part of your life.',
    type: 'article',
    category: 'self_care',
    tags: ['self-care', 'routine', 'wellness'],
    difficulty: 'beginner',
    duration: 8,
    language: 'en',
    priority: 6
  },

  // Spanish Resources
  {
    title: 'Entendiendo la Ansiedad: Guía para Principiantes',
    description: 'Aprende sobre los síntomas, causas y técnicas de manejo de la ansiedad',
    content: 'La ansiedad es una respuesta natural al estrés, pero cuando se vuelve abrumadora, puede interferir con la vida diaria. Esta guía cubre técnicas de respiración, ejercicios de atención plena y cuándo buscar ayuda.',
    type: 'article',
    category: 'anxiety',
    tags: ['ansiedad', 'estrés', 'mindfulness', 'respiración'],
    difficulty: 'beginner',
    duration: 15,
    language: 'es',
    priority: 8
  },
  {
    title: 'Línea Nacional de Prevención del Suicidio',
    description: 'Apoyo de crisis 24/7 disponible inmediatamente en español',
    content: 'Si tienes pensamientos de suicidio o estás en angustia emocional, llama al 988 y presiona 2 para apoyo inmediato en español.',
    type: 'hotline',
    category: 'crisis',
    tags: ['crisis', 'línea-directa', 'ayuda-inmediata'],
    language: 'es',
    isCrisis: true,
    priority: 10
  },

  // Hindi Resources
  {
    title: 'चिंता को समझना: शुरुआती गाइड',
    description: 'चिंता के लक्षण, कारण और प्रबंधन तकनीकों के बारे में जानें',
    content: 'चिंता तनाव की एक प्राकृतिक प्रतिक्रिया है, लेकिन जब यह भारी हो जाती है, तो यह दैनिक जीवन में हस्तक्षेप कर सकती है।',
    type: 'article',
    category: 'anxiety',
    tags: ['चिंता', 'तनाव', 'ध्यान', 'श्वास'],
    difficulty: 'beginner',
    duration: 15,
    language: 'hi',
    priority: 8
  },
  {
    title: 'आसरा हेल्पलाइन',
    description: '24/7 संकट सहायता तुरंत उपलब्ध',
    content: 'यदि आप आत्महत्या के विचार रख रहे हैं या भावनात्मक संकट में हैं, तो तुरंत सहायता के लिए +91 9820466726 पर कॉल करें।',
    type: 'hotline',
    category: 'crisis',
    tags: ['संकट', 'हेल्पलाइन', 'तत्काल-सहायता'],
    language: 'hi',
    isCrisis: true,
    priority: 10
  }
];

async function seedResources() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing resources (optional - comment out if you want to keep existing data)
    // await Resource.deleteMany({});
    // console.log('Cleared existing resources');

    // Insert sample resources
    const insertedResources = await Resource.insertMany(sampleResources);
    console.log(`Inserted ${insertedResources.length} resources`);

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding resources:', error);
    process.exit(1);
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedResources();
}

module.exports = { sampleResources, seedResources };