import { db } from './config';
import { collection, doc, setDoc, getDocs, limit, query } from "firebase/firestore";

const DB_SEED_JOBS = [
  { title: 'Full-Stack Web Developer',       category: 'Web Development',    budget: 5000, type: 'local', skills: ['React', 'Node.js', 'Firebase'],                   deadline: '2026-06-01', icon: 'fa-laptop-code', color: '#0074D9', description: 'Build a modern web platform for our e-commerce startup using React and Node.js backend.', createdAt: new Date().toISOString() },
  { title: 'UI/UX Designer for Mobile App',  category: 'Design',             budget: 3500, type: 'local', skills: ['Figma', 'Prototyping', 'User Research'],         deadline: '2026-05-20', icon: 'fa-paint-brush', color: '#e74c3c', description: 'Design a beautiful and intuitive mobile app experience for iOS and Android.', createdAt: new Date().toISOString() },
  { title: 'Digital Marketing Specialist',   category: 'Marketing',          budget: 2500, type: 'local', skills: ['SEO', 'Google Ads', 'Social Media'],             deadline: '2026-05-15', icon: 'fa-chart-line',  color: '#f1c40f', description: 'Drive organic growth and manage paid campaigns for our growing brand.', createdAt: new Date().toISOString() },
  { title: 'React Native Mobile Developer',  category: 'Mobile Development', budget: 6000, type: 'local', skills: ['React Native', 'TypeScript', 'Redux'],           deadline: '2026-07-15', icon: 'fa-mobile-alt',  color: '#2ecc71', description: 'Develop a cross-platform mobile app for both iOS and Android platforms.', createdAt: new Date().toISOString() },
  { title: 'Content Writer & SEO Specialist',category: 'Writing',            budget: 1800, type: 'local', skills: ['SEO Writing', 'WordPress', 'Research'],          deadline: '2026-05-30', icon: 'fa-file-alt',    color: '#e67e22', description: 'Create high-quality, SEO-optimized blog posts and website copy.', createdAt: new Date().toISOString() },
  { title: 'Video Editor & Motion Designer', category: 'Other',              budget: 4000, type: 'local', skills: ['Premiere Pro', 'After Effects', 'Motion Graphics'],deadline: '2026-06-10', icon: 'fa-video',       color: '#9b59b6', description: 'Edit and produce professional marketing videos and motion graphics.', createdAt: new Date().toISOString() }
];

const DB_SEED_CATEGORIES = [
  { id: 'cat-1', name: 'Web Development',    description: 'Websites, web apps, APIs, and full-stack solutions.' },
  { id: 'cat-2', name: 'Design',             description: 'UI/UX, branding, logo, and graphic design.' },
  { id: 'cat-3', name: 'Marketing',          description: 'SEO, SEM, social media, and digital advertising.' },
  { id: 'cat-4', name: 'Mobile Development', description: 'Native and cross-platform iOS and Android apps.' },
  { id: 'cat-5', name: 'Writing',            description: 'Content writing, copywriting, SEO articles, and documentation.' },
  { id: 'cat-6', name: 'Other',              description: 'Video editing, motion graphics, and other creative services.' }
];

export const seedDatabase = async () => {
  console.log("Starting database seeding...");

  // Seed Categories
  for (const cat of DB_SEED_CATEGORIES) {
    await setDoc(doc(db, "categories", cat.id), cat);
    console.log(`Seeded category: ${cat.name}`);
  }

  // Seed Jobs (only if empty)
  const jobsRef = collection(db, "jobs");
  const snapshot = await getDocs(query(jobsRef, limit(1)));
  
  if (snapshot.empty) {
    for (const job of DB_SEED_JOBS) {
      const newJobRef = doc(collection(db, "jobs"));
      await setDoc(newJobRef, job);
      console.log(`Seeded job: ${job.title}`);
    }
  } else {
    console.log("Jobs collection already has data, skipping job seeding.");
  }

  console.log("Database seeding completed!");
};
