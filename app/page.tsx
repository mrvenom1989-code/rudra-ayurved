'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Star, Calendar, Phone } from 'lucide-react';

// 1. Define the "Shape" of the data for the Card component
interface TreatmentCardProps {
  title: string;
  desc: string;
  image: string;
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      
      {/* --- Navigation --- */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-rudra-green/95 backdrop-blur-md shadow-lg py-4' : 'bg-transparent py-6'
      }`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-rudra-gold rounded-full flex items-center justify-center text-rudra-green font-serif font-bold text-xl">R</div>
            <span className={`font-serif text-2xl font-bold tracking-wide ${scrolled ? 'text-white' : 'text-rudra-green'}`}>
              RUDRA <span className="text-rudra-gold">AYURVED</span>
            </span>
          </div>

          <div className={`hidden md:flex gap-8 font-medium ${scrolled ? 'text-gray-200' : 'text-rudra-green'}`}>
            <Link href="#treatments" className="hover:text-rudra-gold transition">Treatments</Link>
            <Link href="#about" className="hover:text-rudra-gold transition">Our Philosophy</Link>
            <Link href="#contact" className="hover:text-rudra-gold transition">Contact</Link>
          </div>

          <button className="bg-rudra-gold text-rudra-green px-6 py-2 rounded font-bold hover:bg-white transition shadow-lg flex items-center gap-2">
            <Calendar size={18} />
            Book Consultation
          </button>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <header className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          {/* Note: In a real app, use the Next.js <Image> component for better performance */}
          <img 
            src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=2070&auto=format&fit=crop" 
            alt="Ayurvedic Spa Setting" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-rudra-green/90 to-rudra-green/40"></div>
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-20">
          <span className="block text-rudra-gold tracking-[0.2em] text-sm uppercase mb-4">
            Ancient Wisdom • Modern Comfort
          </span>
          <h1 className="font-serif text-5xl md:text-7xl text-white font-bold leading-tight mb-6 drop-shadow-lg">
            Restore Balance to Your <br/> Body, Mind & Soul
          </h1>
          <p className="text-gray-200 text-lg md:text-xl mb-10 max-w-2xl mx-auto font-light">
            Experience authentic Panchkarma therapies and personalized Ayurvedic care in a premium, hygienic environment designed for your healing.
          </p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button className="bg-rudra-gold text-rudra-green px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition transform shadow-xl border border-rudra-gold">
              Start Your Healing Journey
            </button>
            <button className="bg-transparent border border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-rudra-green transition">
              Explore Treatments
            </button>
          </div>
        </div>
      </header>

      {/* --- Stats / Trust Banner --- */}
      <section className="bg-rudra-green text-white py-12 border-t border-white/10">
        <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/20">
          <div>
            <span className="block text-4xl font-serif text-rudra-gold mb-1">15+</span>
            <span className="text-sm opacity-80 uppercase tracking-widest">Years Experience</span>
          </div>
          <div>
            <span className="block text-4xl font-serif text-rudra-gold mb-1">5k+</span>
            <span className="text-sm opacity-80 uppercase tracking-widest">Happy Patients</span>
          </div>
          <div>
            <span className="block text-4xl font-serif text-rudra-gold mb-1">100%</span>
            <span className="text-sm opacity-80 uppercase tracking-widest">Natural Herbs</span>
          </div>
          <div>
            <span className="block text-4xl font-serif text-rudra-gold mb-1">4.9</span>
            <span className="text-sm opacity-80 uppercase tracking-widest">Google Rating</span>
          </div>
        </div>
      </section>

      {/* --- Treatments Section --- */}
      <section id="treatments" className="py-24 bg-rudra-cream">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl text-rudra-green font-bold mb-4">Our Signature Therapies</h2>
            <div className="w-24 h-1 bg-rudra-gold mx-auto mb-6"></div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We specialize in Keraleeya Panchkarma treatments, customized to your Prakriti (Body Type) by expert Vaidyas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <TreatmentCard 
              title="Shirodhara"
              desc="A continuous stream of warm medicated oil is poured onto the forehead to calm the nervous system and relieve stress."
              image="https://images.unsplash.com/photo-1519823551278-64ac92734fb1?q=80&w=800&auto=format&fit=crop"
            />
            <TreatmentCard 
              title="Abhyanga"
              desc="Full body massage with herbal oils to improve circulation, remove toxins, and rejuvenate the skin."
              image="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop"
            />
            <TreatmentCard 
              title="Kati Basti"
              desc="A specialized localized treatment for lower back pain using a dam of dough to hold warm medicated oil."
              image="https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=800&auto=format&fit=crop"
            />
          </div>
          
          <div className="text-center mt-12">
            <button className="text-rudra-green border-b-2 border-rudra-gold pb-1 font-bold hover:text-rudra-gold transition">
              View All Treatments &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* --- Feature/About Section --- */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <div className="md:w-1/2 relative">
             <div className="absolute -top-4 -left-4 w-24 h-24 bg-rudra-gold/20 rounded-full z-0"></div>
             <img 
               src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1000&auto=format&fit=crop" 
               alt="Doctor Consultation" 
               className="relative z-10 rounded-lg shadow-2xl"
             />
             <div className="absolute -bottom-6 -right-6 bg-rudra-green text-white p-6 rounded-lg shadow-xl z-20 hidden md:block">
               <p className="font-serif text-xl italic">"Health is not just absence of disease, <br/> it is the balance of Doshas."</p>
             </div>
          </div>
          <div className="md:w-1/2">
            <h3 className="text-rudra-gold font-bold uppercase tracking-widest mb-2">Why Rudra Ayurved?</h3>
            <h2 className="font-serif text-4xl text-rudra-green font-bold mb-6">Authentic Care, Modern Approach</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              At Rudra Ayurved, we bridge the gap between ancient Vedic wisdom and modern lifestyle needs. 
              Our clinic provides a strictly hygienic, premium environment where you can undergo authentic treatments without compromising on comfort.
            </p>
            <ul className="space-y-4 mb-8">
              {[
                'Personalized Nadi Pariksha (Pulse Diagnosis)',
                'FDA Approved, Chemical-free Herbal Medicines',
                'Private Therapy Suites with Attached Showers',
                'Post-treatment Diet & Lifestyle Counseling'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span className="text-rudra-gold bg-rudra-green/10 p-1 rounded-full"><ArrowRight size={14}/></span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-rudra-green text-white border-t border-white/10 pt-16 pb-8">
        <div className="container mx-auto px-6 grid md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-1 md:col-span-2">
            <h4 className="font-serif text-2xl font-bold mb-4">RUDRA <span className="text-rudra-gold">AYURVED</span></h4>
            <p className="text-gray-400 max-w-xs">
              Restoring health through the timeless wisdom of Ayurveda. Premium care for the modern individual.
            </p>
          </div>
          <div>
            <h5 className="font-bold text-rudra-gold mb-4 uppercase text-sm tracking-wider">Quick Links</h5>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li><Link href="#" className="hover:text-white">About Us</Link></li>
              <li><Link href="#" className="hover:text-white">Treatments</Link></li>
              <li><Link href="#" className="hover:text-white">Doctors</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-rudra-gold mb-4 uppercase text-sm tracking-wider">Visit Us</h5>
            <p className="text-gray-400 text-sm leading-loose">
              101, Vedant Complex,<br/>
              Near Alpha One Mall,<br/>
              Vastrapur, Ahmedabad<br/>
            </p>
          </div>
        </div>
        <div className="text-center text-gray-500 text-xs border-t border-white/10 pt-8">
          © {new Date().getFullYear()} Rudra Ayurved. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

// 2. Apply the interface to the component props
function TreatmentCard({ title, desc, image }: TreatmentCardProps) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-300 group">
      <div className="h-64 overflow-hidden relative">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover group-hover:scale-110 transition duration-700" 
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition"></div>
      </div>
      <div className="p-6 relative">
        <div className="absolute -top-8 right-6 bg-rudra-gold text-rudra-green p-3 rounded-full shadow-lg">
          <Star size={20} fill="currentColor" />
        </div>
        <h3 className="font-serif text-2xl font-bold text-rudra-green mb-3">{title}</h3>
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">{desc}</p>
        <Link href="#" className="text-rudra-green text-sm font-bold uppercase tracking-wide hover:text-rudra-gold transition">
          Learn More &rarr;
        </Link>
      </div>
    </div>
  )
}