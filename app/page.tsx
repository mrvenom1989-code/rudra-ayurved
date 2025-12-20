"use client"; 

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  ArrowRight, Phone, MapPin, Mail, Instagram, Facebook, 
  Sparkles, Leaf, Calendar, CheckCircle2, Loader2, X 
} from "lucide-react";
import { createConsultationRequest } from "@/app/actions"; // Import the server action

export default function LandingPage() {
  // --- MODAL STATE & LOGIC ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", symptoms: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.phone || !formData.name) return alert("Name and Phone are required!");

    setLoading(true);
    // Call the server action we created in Step 2
    const res = await createConsultationRequest(formData);
    setLoading(false);

    if(res.success) {
      alert("Request received! Our team will call you shortly to confirm the time.");
      setIsModalOpen(false);
      setFormData({ name: "", phone: "", symptoms: "" });
    } else {
      alert("Error submitting request. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-neutral-800 selection:bg-[#c5a059] selection:text-white">
      
      {/* --- NAVIGATION --- */}
      <nav className="sticky top-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="flex justify-between items-center px-6 md:px-10 py-3 max-w-7xl mx-auto">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3">
             <div className="relative w-14 h-14">
                <Image 
                  src="/Logo.png" 
                  alt="Rudra Ayurved Logo" 
                  fill
                  className="object-contain"
                  priority
                />
             </div>
             <div className="leading-tight flex flex-col justify-center">
               <h1 className="font-serif text-2xl font-bold text-[#B09B5C] tracking-wide">RUDRA AYURVED</h1>
               <span className="text-[10px] font-bold text-[#1e3a29] tracking-[0.2em] uppercase">Multi - Speciality Panchkarma Hospital</span>
             </div>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
             <Link href="#specialists" className="text-sm font-medium text-gray-600 hover:text-[#c5a059] transition">Specialists</Link>
             <Link href="#treatments" className="text-sm font-medium text-gray-600 hover:text-[#c5a059] transition">Treatments</Link>
             <Link href="#contact" className="text-sm font-medium text-gray-600 hover:text-[#c5a059] transition">Visit Us</Link>
             
             {/* Staff Login Button */}
             <Link href="/login" className="bg-[#1e3a29] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#2a4d38] transition flex items-center gap-2 shadow-lg shadow-[#1e3a29]/20">
               Staff Login <ArrowRight size={15}/>
             </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative pt-20 pb-32 px-6 md:px-10 overflow-hidden">
         <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-10 duration-700">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 text-[#c5a059] text-xs font-bold tracking-widest uppercase mb-6 border border-[#c5a059]/20">
                 <Sparkles size={12} /> Multi-Speciality Panchkarma Hospital
               </div>
               
               <h1 className="text-5xl md:text-7xl font-serif font-bold text-[#1e3a29] leading-[1.1] mb-6">
                 Healing Roots, <br/>
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a059] to-[#8a6e3e]">
                   Glowing Future.
                 </span>
               </h1>
               
               <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-lg">
                 <i>"Ayurvedah Shashwato Swasthya"</i> — Restoring your natural balance through ancient Nadi Pariksha and modern Aesthetic Laser treatments.
               </p>
               
               <div className="flex flex-col sm:flex-row gap-4">
                  {/* BUTTON UPDATED WITH ONCLICK */}
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-[#1e3a29] text-white px-8 py-3.5 rounded-lg font-bold hover:bg-[#2a4d38] transition shadow-xl shadow-[#1e3a29]/10 flex items-center justify-center gap-2"
                  >
                    <Calendar size={18} /> Book Consultation
                  </button>
                  <Link href="#treatments" className="px-8 py-3.5 border border-[#1e3a29]/20 rounded-lg font-bold text-[#1e3a29] hover:bg-[#1e3a29] hover:text-white transition text-center">
                    Explore Services
                  </Link>
               </div>
            </div>

            {/* Visual Decoration */}
            <div className="hidden md:block relative">
               <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#c5a059]/5 rounded-full blur-3xl -z-10"></div>
               <div className="relative z-10 grid grid-cols-2 gap-4">
                  <div className="space-y-4 mt-8">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transform hover:-translate-y-1 transition duration-300">
                       <Leaf className="text-[#1e3a29] mb-2" size={28}/>
                       <h3 className="font-bold text-[#1e3a29]">Panchakarma</h3>
                       <p className="text-xs text-gray-500 mt-1">Detoxification & Rejuvenation</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transform hover:-translate-y-1 transition duration-300">
                       <Sparkles className="text-[#c5a059] mb-2" size={28}/>
                       <h3 className="font-bold text-[#1e3a29]">Laser Tech</h3>
                       <p className="text-xs text-gray-500 mt-1">Advanced Hair Removal</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                     <div className="bg-[#1e3a29] p-6 rounded-2xl shadow-lg text-white transform hover:-translate-y-1 transition duration-300">
                        <h3 className="font-serif text-2xl font-bold">15+</h3>
                        <p className="text-xs text-[#c5a059] uppercase tracking-wider mt-1">Years Experience</p>
                     </div>
                     <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transform hover:-translate-y-1 transition duration-300">
                       <CheckCircle2 className="text-[#1e3a29] mb-2" size={28}/>
                       <h3 className="font-bold text-[#1e3a29]">Nadi Pariksha</h3>
                       <p className="text-xs text-gray-500 mt-1">Pulse Diagnosis</p>
                    </div>
                  </div>
               </div>
            </div>
         </div>
      </header>

      {/* --- SPECIALISTS SECTION --- */}
      <section id="specialists" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
           <div className="text-center mb-16">
              <span className="text-[#c5a059] font-bold text-xs uppercase tracking-widest">Our Experts</span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1e3a29] mt-3">Meet The Healers</h2>
              <div className="w-20 h-1 bg-[#c5a059] mx-auto mt-6 rounded-full"></div>
           </div>

           <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              {/* Doctor 1 */}
              <div className="group relative bg-[#FDFBF7] rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-[#1e3a29]/10 transition duration-500 border border-gray-100">
                 <div className="aspect-[4/3] relative overflow-hidden">
                    <Image 
                      src="/Chirag.JPG" 
                      alt="Dr. Chirag Raval"
                      fill
                      className="object-cover object-top transition duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1e3a29]/90 to-transparent opacity-0 group-hover:opacity-100 transition duration-500 flex items-end p-8">
                       <p className="text-white/90 text-sm">
                         "Ayurveda is not just a system of medicine, it is a science of life. My goal is to treat the root cause, not just symptoms."
                       </p>
                    </div>
                 </div>
                 <div className="p-8 relative">
                    <div className="absolute -top-6 right-8 w-12 h-12 bg-[#1e3a29] rounded-full flex items-center justify-center text-white shadow-lg">
                       <Leaf size={20} />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-[#1e3a29] mb-1">Dr. Chirag Raval</h3>
                    <p className="text-xs font-bold text-[#c5a059] uppercase tracking-wider mb-4">B.A.M.S, CCPT (Kerala)</p>
                    <p className="text-gray-600 italic mb-6 border-l-2 border-[#c5a059] pl-4">
                      "Expert in Pulse Diagnosis (Nadi Pariksha) and Panchakarma therapies for chronic lifestyle disorders."
                    </p>
                    <div className="flex flex-wrap gap-2">
                       {['Lifestyle Disorders', 'Nadi Pariksha', 'Panchakarma'].map(tag => (
                         <span key={tag} className="px-3 py-1 bg-[#1e3a29]/5 text-[#1e3a29] text-xs font-bold rounded-full">{tag}</span>
                       ))}
                    </div>
                 </div>
              </div>

              {/* Doctor 2 */}
              <div className="group relative bg-[#FDFBF7] rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-[#c5a059]/10 transition duration-500 border border-gray-100">
                 <div className="aspect-[4/3] relative overflow-hidden">
                    <Image 
                      src="/Dipal.JPG" 
                      alt="Dr. Dipal Raval"
                      fill
                      className="object-cover object-top transition duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#c5a059]/90 to-transparent opacity-0 group-hover:opacity-100 transition duration-500 flex items-end p-8">
                       <p className="text-white/95 text-sm">
                         "Enhancing your natural beauty with the precision of modern science and the care of a doctor."
                       </p>
                    </div>
                 </div>
                 <div className="p-8 relative">
                    <div className="absolute -top-6 right-8 w-12 h-12 bg-[#c5a059] rounded-full flex items-center justify-center text-white shadow-lg">
                       <Sparkles size={20} />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-[#1e3a29] mb-1">Dr. Dipal Raval</h3>
                    <p className="text-xs font-bold text-[#c5a059] uppercase tracking-wider mb-4">B.H.M.S, P.G.D.C.C, P.G.D.C.T</p>
                    <p className="text-gray-600 italic mb-6 border-l-2 border-[#c5a059] pl-4">
                      "Specialist in Laser Aesthetics, Skin Rejuvenation, and advanced Clinical Cosmetology treatments."
                    </p>
                    <div className="flex flex-wrap gap-2">
                       {['Laser Treatment', 'Cosmetology', 'Skin & Hair'].map(tag => (
                         <span key={tag} className="px-3 py-1 bg-[#c5a059]/10 text-[#c5a059] text-xs font-bold rounded-full">{tag}</span>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* --- TREATMENTS SECTION --- */}
      <section id="treatments" className="py-24 bg-[#1e3a29] text-white">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <span className="text-[#c5a059] font-bold text-xs uppercase tracking-widest">Our Services</span>
              <h2 className="text-3xl md:text-5xl font-serif font-bold mt-3">Signature Therapies</h2>
            </div>
            <p className="text-gray-300 max-w-md text-sm leading-relaxed">
              We combine the detoxification power of Kerala Panchakarma with state-of-the-art Laser technology for complete wellness.
            </p>
          </div>

          <div className="space-y-16">
            
            {/* 1. Panchakarma Grid */}
            <div>
              <h3 className="text-2xl font-serif font-bold mb-8 flex items-center gap-3">
                <Leaf className="text-[#c5a059]" /> Panchakarma & Detox
              </h3>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { name: "Shirodhara", desc: "Stress Relief & Insomnia", img: "/treatments/shirodhara.jpg" },
                  { name: "Abhyanga", desc: "Full Body Massage", img: "/treatments/abhyanga.jpg" },
                  { name: "Janu Basti", desc: "Knee Pain Treatment", img: "/treatments/janu-basti.jpg" },
                  { name: "Nasya", desc: "Sinus & Migraine", img: "/treatments/nasya.jpg" }
                ].map((item, i) => (
                  <div key={i} className="group relative h-64 rounded-xl overflow-hidden cursor-pointer bg-neutral-800">
                    <div className="absolute inset-0 bg-neutral-800 animate-pulse group-hover:animate-none flex items-center justify-center text-gray-700">
                      <img 
                        src={item.img} 
                        alt={item.name} 
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition duration-500 group-hover:scale-110"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <span className="absolute text-xs opacity-30"></span>
                    </div>
                    <div className="absolute bottom-0 left-0 p-6 z-10">
                      <h4 className="font-bold text-lg group-hover:text-[#c5a059] transition">{item.name}</h4>
                      <p className="text-xs text-gray-300">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Cosmetology Grid */}
            <div>
              <h3 className="text-2xl font-serif font-bold mb-8 flex items-center gap-3">
                <Sparkles className="text-[#c5a059]" /> Cosmetology & Laser
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { name: "Laser Hair Removal", desc: "Painless & Permanent", img: "/treatments/laser-hair-removal.jpg" },
                  { name: "HydraFacial", desc: "Deep Cleansing & Glow", img: "/treatments/hydrafacial.jpg" },
                  { name: "Chemical Peels", desc: "Skin Resurfacing", img: "/treatments/chemical-peel.jpg" }
                ].map((item, i) => (
                  <div key={i} className="group relative h-64 rounded-xl overflow-hidden cursor-pointer bg-neutral-800">
                    <div className="absolute inset-0 bg-neutral-800 animate-pulse group-hover:animate-none flex items-center justify-center text-gray-700">
                      <img 
                        src={item.img} 
                        alt={item.name} 
                        className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition duration-500 group-hover:scale-110"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <span className="absolute text-xs opacity-30"></span>
                    </div>
                    <div className="absolute bottom-0 left-0 p-6 z-10">
                      <h4 className="font-bold text-lg group-hover:text-[#c5a059] transition">{item.name}</h4>
                      <p className="text-xs text-gray-300">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer id="contact" className="bg-[#162b1e] text-white pt-20 pb-10 border-t border-white/10">
         <div className="max-w-7xl mx-auto px-6 md:px-10">
            <div className="grid md:grid-cols-3 gap-12 mb-16">
               {/* Address */}
               <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-[#c5a059] rounded-full flex items-center justify-center shrink-0 text-[#1e3a29] mt-1">
                    <MapPin size={20}/>
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-lg mb-2">Visit Our Clinic</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      206, B-Block, 2nd Floor,<br/> 
                      Olive Greens, Gota, S.G. Highway,<br/> 
                      Ahmedabad - 382481
                    </p>
                  </div>
               </div>

               {/* Contact */}
               <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-[#c5a059] rounded-full flex items-center justify-center shrink-0 text-[#1e3a29] mt-1">
                    <Phone size={20}/>
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-lg mb-2">Get in Touch</h4>
                    <p className="text-sm text-gray-400 hover:text-[#c5a059] transition">
                      <a href="tel:+916352135799">+91 63521 35799</a>
                    </p>
                    <p className="text-sm text-gray-400 mt-1 hover:text-[#c5a059] transition">
                      <a href="mailto:rudraayurved5@gmail.com">rudraayurved5@gmail.com</a>
                    </p>
                  </div>
               </div>

               {/* Socials */}
               <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-[#c5a059] rounded-full flex items-center justify-center shrink-0 text-[#1e3a29] mt-1">
                    <Sparkles size={20}/>
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-lg mb-2">Social Media</h4>
                    <div className="flex gap-4 mt-2">
                       <a href="https://www.instagram.com/rudraayurved5/?hl=en" target="_blank" className="bg-white/10 p-2 rounded-lg hover:bg-[#c5a059] hover:text-[#1e3a29] transition">
                         <Instagram size={20} />
                       </a>
                       <a href="https://www.facebook.com/p/Rudra-Ayurved-61577961763044/" target="_blank" className="bg-white/10 p-2 rounded-lg hover:bg-[#c5a059] hover:text-[#1e3a29] transition">
                         <Facebook size={20} />
                       </a>
                    </div>
                  </div>
               </div>
            </div>

            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500">
               <p>© {new Date().getFullYear()} Rudra Ayurved. All Rights Reserved.</p>
               <div className="flex gap-6 mt-4 md:mt-0">
                  <Link href="#" className="hover:text-[#c5a059] transition">Privacy Policy</Link>
                  <Link href="#" className="hover:text-[#c5a059] transition">Terms of Service</Link>
               </div>
            </div>
         </div>
      </footer>

      {/* --- CONSULTATION MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6">
                <div>
                   <h2 className="text-2xl font-serif font-bold text-[#1e3a29]">Request Consultation</h2>
                   <p className="text-xs text-gray-500">We will call you to confirm the time.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition">
                  <X size={24} />
                </button>
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input 
                    required
                    className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Mobile Number <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="tel"
                    className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059]"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
               </div>
               <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Symptoms / Purpose</label>
                  <textarea 
                    className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] resize-none h-24"
                    placeholder="Briefly describe your issue..."
                    value={formData.symptoms}
                    onChange={(e) => setFormData({...formData, symptoms: e.target.value})}
                  />
               </div>

               <button 
                 disabled={loading}
                 className="w-full bg-[#1e3a29] text-white font-bold py-3.5 rounded-lg hover:bg-[#162b1e] transition flex items-center justify-center gap-2 mt-2"
               >
                 {loading ? <Loader2 className="animate-spin" size={20} /> : "Submit Request"}
               </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}