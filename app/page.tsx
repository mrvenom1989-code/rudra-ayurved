"use client"; 

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  ArrowRight, Phone, MapPin, Instagram, Facebook, 
  Sparkles, Leaf, Calendar, CheckCircle2, Loader2, X, Wallet,
  Eye, ChevronRight, Info, MessageCircle // Added MessageCircle for WhatsApp icon
} from "lucide-react";
import { createConsultationRequest } from "@/app/actions"; 

// --- DATA: PANCHAKARMA THERAPIES ---
const PANCHAKARMA_SERVICES = [
  { 
    id: 'vamana',
    name: "Vamana", 
    subtitle: "Therapeutic Emesis", 
    desc: "Eliminates Kapha toxins from the body.",
    detail: "Vamana is a medicated emesis therapy that removes Kapha toxins collected in the body and the respiratory tract. This is given to people with high Kapha imbalance. Daily treatment is administered for a few days to loosen toxins and mobilize them to the stomach.",
    benefits: ["Treats Asthma & Allergies", "Reduces Obesity", "Clears Skin Disorders (Psoriasis)", "Improves Digestion"],
    img: "/treatments/vamana.jpg", 
    gallery: ["/treatments/vamana.jpg", "/treatments/vamana-2.jpg"] 
  },
  { 
    id: 'virechana',
    name: "Virechana", 
    subtitle: "Purgation Therapy", 
    desc: "Removes Pitta toxins from the liver and gallbladder.",
    detail: "Virechana is the administration of purgative substances for the cleansing of Pitta and the purification of the blood toxins from the body that are concentrated in the liver and gallbladder. It completely cleanses the gastrointestinal tract.",
    benefits: ["Detoxifies Liver", "Treats Acidity & Ulcers", "Cures Skin Inflammations", "Relieves Jaundice"],
    img: "/treatments/virechana.jpg",
    gallery: ["/treatments/virechana.jpg", "/treatments/virechana-2.jpg"]
  },
  { 
    id: 'basti',
    name: "Basti", 
    subtitle: "Medicated Enema", 
    desc: "The mother of all treatments for Vata disorders.",
    detail: "Basti involves the introduction of herbal decoctions and medicated oils into the colon through the rectum. Since Vata is mainly located in the colon and bones, Basti is considered the most effective treatment for Vata disorders.",
    benefits: ["Relieves Arthritis & Joint Pain", "Treats Constipation", "Helps in Neurological Disorders", "Rejuvenates the Body"],
    img: "/treatments/basti.jpg",
    gallery: ["/treatments/basti.jpg", "/treatments/basti-detail.jpg"]
  },
  { 
    id: 'nasya',
    name: "Nasya", 
    subtitle: "Nasal Administration", 
    desc: "Cleanses the head and neck region.",
    detail: "Nasya involves the administration of medicated oil or powder through the nostrils. It is highly effective for ailments of the head, neck, and shoulders, as the nose is considered the doorway to the brain.",
    benefits: ["Cures Sinusitis & Migraine", "Improves Memory & Eyesight", "Relieves Cervical Spondylosis", "Prevents Hair Fall"],
    img: "/treatments/nasya.jpg",
    gallery: ["/treatments/nasya.jpg", "/treatments/nasya-2.jpg"]
  },
  { 
    id: 'raktamokshana',
    name: "Raktamokshana", 
    subtitle: "Bloodletting Therapy", 
    desc: "Purifies the blood to treat skin diseases.",
    detail: "A specialized therapy to remove impure blood from the body. It is often used for Pitta disorders and blood-borne diseases. Leech therapy (Jaloka) is a common form of this treatment used for localized purification.",
    benefits: ["Treats Eczema & Acne", "Reduces localized swelling", "Effective for Varicose Veins", "Relieves Gout"],
    img: "/treatments/raktamokshana.jpg",
    gallery: ["/treatments/raktamokshana.jpg", "/treatments/rakta.jpg"]
  },
  { 
    id: 'shirodhara',
    name: "Shirodhara", 
    subtitle: "Stress Relief", 
    desc: "Deep relaxation for the nervous system.",
    detail: "A gentle, continuous stream of warm herbal oil is poured over the forehead. This therapy induces a deep state of relaxation and mental clarity.",
    benefits: ["Cures Insomnia", "Relieves Anxiety & Stress", "Improves Concentration", "Balances Hormones"],
    img: "/treatments/shirodhara.jpg",
    gallery: ["/treatments/shirodhara.jpg", "/treatments/shiro-2.jpg"]
  },
  { 
    id: 'abhyanga',
    name: "Abhyanga", 
    subtitle: "Full Body Massage", 
    desc: "Nourishes tissues and improves circulation.",
    detail: "Traditional Ayurvedic full body massage using warm, herb-infused oils specific to your Dosha. It helps to liquefy toxins and move them towards the gastrointestinal tract for elimination.",
    benefits: ["Improves Blood Circulation", "Tones Muscles", "Softens Skin", "Relieves Fatigue"],
    img: "/treatments/abhyanga.jpg",
    gallery: ["/treatments/abhyanga.jpg", "/treatments/massage.jpg"]
  },
  { 
    id: 'janubasti',
    name: "Janu Basti", 
    subtitle: "Knee Care", 
    desc: "Specialized treatment for knee pain.",
    detail: "Warm medicated oil is pooled over the knee joint for a specific duration. This lubricates the joints and strengthens the muscles supporting the knee.",
    benefits: ["Relieves Knee Pain", "Treats Osteoarthritis", "Reduces Stiffness", "Improves Mobility"],
    img: "/treatments/janu-basti.jpg",
    gallery: ["/treatments/janu-basti.jpg", "/treatments/knee.jpg"]
  }
];

// --- DATA: COSMETOLOGY SERVICES ---
const COSMETOLOGY_SERVICES = [
  { 
    id: 'laser',
    name: "Hair Restoration & Skin Rejuvenation", 
    subtitle: "Hair Restoration & Skin Rejuvenation", 
    desc: "A regenerative treatment for Hair Restoration & Skin Rejuvenation.",
    detail: "A regenerative treatment using concentrated platelets from your own blood to stimulate healing in injured tissues, promoting natural repair for conditions like tendinitis, hair loss and skin rejuvenation",
    benefits: ["Uses your own blood, minimizing rejection risk.", "Minimally invasive and non-surgical.", "Promotes natural healing processes. ", "Safe for Sensitive Skin"],
    img: "/treatments/prptreatment.jpg",
    gallery: ["/treatments/prptreatment.jpg", "/treatments/prpmachine.jpg"]
  },
  { 
    id: 'hydra',
    name: "HydraFacial", 
    subtitle: "Deep Cleansing", 
    desc: "Cleanse, exfoliate, and hydrate.",
    detail: "A medical-grade resurfacing treatment that clears out your pores and hydrates your skin. It involves cleansing, exfoliation, extraction, hydration and antioxidant protection.",
    benefits: ["Instant Glow", "Removes Blackheads", "Deep Hydration", "Even Skin Tone"],
    img: "/treatments/hydrafacial.jpg",
    gallery: ["/treatments/hydrafacial.jpg", "/treatments/facial-2.jpg"]
  },
  { 
    id: 'peel',
    name: "Chemical Peels", 
    subtitle: "Skin Resurfacing", 
    desc: "Treats acne, scars, and pigmentation.",
    detail: "Controlled application of chemical solutions to exfoliate the skin, allowing new skin to regenerate. We use customized peels ranging from superficial to deep based on skin concerns.",
    benefits: ["Reduces Acne Scars", "Treats Hyperpigmentation", "Smooths Fine Lines", "Brightens Complexion"],
    img: "/treatments/chemical-peel.jpg",
    gallery: ["/treatments/chemical-peel.jpg", "/treatments/peel-2.jpg"]
  }
];

export default function LandingPage() {
  // --- MODAL STATES ---
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<any>(null); // For Treatment Details
  const [activeImage, setActiveImage] = useState<string>(""); 
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", phone: "", symptoms: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.phone || !formData.name) return alert("Name and Phone are required!");

    setLoading(true);
    const res = await createConsultationRequest(formData);
    setLoading(false);

    if(res.success) {
      alert("Request received! Our team will call you shortly to confirm the time.");
      setIsBookingModalOpen(false);
      setFormData({ name: "", phone: "", symptoms: "" });
    } else {
      alert("Error submitting request. Please try again.");
    }
  };

  // Helper to open booking from treatment modal
  const handleBookFromTreatment = () => {
    setFormData(prev => ({...prev, symptoms: `Inquiry about: ${selectedTreatment.name}`}));
    setSelectedTreatment(null);
    setIsBookingModalOpen(true);
  };

  // Helper to Open Treatment & Set Default Image
  const openTreatment = (item: any) => {
    setSelectedTreatment(item);
    setActiveImage(item.img); 
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-neutral-800 selection:bg-[#c5a059] selection:text-white">
      
      {/* --- NAVIGATION --- */}
      <nav className="sticky top-0 z-50 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
        <div className="flex justify-between items-center px-6 md:px-10 py-3 max-w-7xl mx-auto">
          
          <div className="flex items-center gap-3">
             <div className="relative w-14 h-14">
                <Image 
                  src="/rudralogo.png" 
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

          <div className="flex items-center gap-4 md:gap-8">
              <Link href="#specialists" className="hidden md:block text-sm font-medium text-gray-600 hover:text-[#c5a059] transition">Specialists</Link>
              <Link href="#treatments" className="hidden md:block text-sm font-medium text-gray-600 hover:text-[#c5a059] transition">Treatments</Link>
              <Link href="#contact" className="hidden md:block text-sm font-medium text-gray-600 hover:text-[#c5a059] transition">Visit Us</Link>
              
              {/* ✅ UPDATE: Made Staff Login Visible on Mobile */}
              <Link href="/login" className="bg-[#1e3a29] text-white px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-bold hover:bg-[#2a4d38] transition flex items-center gap-2 shadow-lg shadow-[#1e3a29]/20">
                Staff Login <ArrowRight size={15}/>
              </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative pt-20 pb-32 px-6 md:px-10 overflow-hidden">
         
         <div className="absolute inset-0 z-0">
            <Image 
              src="/hero-bg.jpg" 
              alt="Ayurveda Background" 
              fill 
              className="object-cover opacity-100" 
              priority
            />
            <div className="absolute inset-0 bg-[#FDFBF7]/80 via-[#FDFBF7]/60 to-transparent"></div>
         </div>

         <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-10 duration-700">
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c5a059]/10 text-[#c5a059] text-xs font-bold tracking-widest uppercase mb-6 border border-[#c5a059]/20 backdrop-blur-sm">
                 <Sparkles size={12} /> Multi-Speciality Panchkarma Hospital
               </div>
               
               <h1 className="text-5xl md:text-7xl font-serif font-bold text-[#1e3a29] leading-[1.1] mb-6 drop-shadow-sm">
                 Healing Roots, <br/>
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c5a059] to-[#8a6e3e]">
                   Glowing Future.
                 </span>
               </h1>
               
               <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-lg font-medium">
                 <i>"आयुर्वेद: शाश्वतो स्वास्थ्य"</i> — Restoring your natural balance through ancient Nadi Pariksha and modern Aesthetic Cosmetology treatments.
               </p>
               
               <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={() => setIsBookingModalOpen(true)}
                    className="bg-[#1e3a29] text-white px-8 py-3.5 rounded-lg font-bold hover:bg-[#2a4d38] transition shadow-xl shadow-[#1e3a29]/10 flex items-center justify-center gap-2"
                  >
                    <Calendar size={18} /> Book Consultation
                  </button>
                  <Link href="#treatments" className="px-8 py-3.5 border border-[#1e3a29] rounded-lg font-bold text-[#1e3a29] hover:bg-[#1e3a29] hover:text-white transition text-center bg-white/50 backdrop-blur-sm">
                    Explore Services
                  </Link>
               </div>
            </div>

            <div className="hidden md:block relative">
               <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#c5a059]/20 rounded-full blur-3xl -z-10"></div>
               <div className="relative z-10 grid grid-cols-2 gap-4">
                  <div className="space-y-4 mt-8">
                    <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-gray-100 transform hover:-translate-y-1 transition duration-300">
                       <Leaf className="text-[#1e3a29] mb-2" size={28}/>
                       <h3 className="font-bold text-[#1e3a29]">Kerala Panchakarma</h3>
                       <p className="text-xs text-gray-500 mt-1">Detoxification & Rejuvenation</p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-gray-100 transform hover:-translate-y-1 transition duration-300">
                       <Sparkles className="text-[#c5a059] mb-2" size={28}/>
                       <h3 className="font-bold text-[#1e3a29]">Cosmetology Tech</h3>
                       <p className="text-xs text-gray-500 mt-1">Hair Restoration & Skin Rejuvenation</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                     <div className="bg-[#1e3a29] p-6 rounded-2xl shadow-lg text-white transform hover:-translate-y-1 transition duration-300">
                        <h3 className="font-serif text-2xl font-bold">15+</h3>
                        <p className="text-xs text-[#c5a059] uppercase tracking-wider mt-1">Years Experience</p>
                     </div>
                     <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-gray-100 transform hover:-translate-y-1 transition duration-300">
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
                      src="/rudrachirag.jpg" 
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
                      src="/rudradipal.jpg" 
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
                      "Specialist in Hair Repair, Skin Rejuvenation, and advanced Clinical Cosmetology treatments."
                    </p>
                    <div className="flex flex-wrap gap-2">
                       {['Cosmetology', 'Skin & Hair'].map(tag => (
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
              We combine the detoxification power of Kerala Panchakarma with state-of-the-art Cosmetology technology for complete wellness.
            </p>
          </div>

          <div className="space-y-16">
            
            {/* 1. Panchakarma Grid */}
            <div>
              <h3 className="text-2xl font-serif font-bold mb-8 flex items-center gap-3">
                <Leaf className="text-[#c5a059]" /> Panchakarma & Detox
              </h3>
              <div className="grid md:grid-cols-4 gap-4">
                {PANCHAKARMA_SERVICES.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => openTreatment(item)} 
                    className="group relative h-72 rounded-xl overflow-hidden cursor-pointer bg-neutral-800 border border-white/10 hover:border-[#c5a059]/50 transition-all duration-300 hover:shadow-2xl"
                  >
                    {/* Image */}
                    <img 
                      src={item.img} 
                      alt={item.name} 
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition duration-700"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    
                    {/* Content Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1f15] via-[#0f1f15]/50 to-transparent p-6 flex flex-col justify-end">
                       <h4 className="font-bold text-lg text-white mb-1">{item.name}</h4>
                       <p className="text-xs text-[#c5a059] font-bold uppercase tracking-wider mb-2">{item.subtitle}</p>
                       
                       <div className="flex items-center gap-2 text-xs font-medium text-white/80 bg-white/10 w-fit px-3 py-1.5 rounded-full mt-2 group-hover:bg-[#c5a059] group-hover:text-[#1e3a29] transition-colors">
                          <Eye size={14} /> Tap to View Details
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Cosmetology Grid */}
            <div>
              <h3 className="text-2xl font-serif font-bold mb-8 flex items-center gap-3">
                <Sparkles className="text-[#c5a059]" /> Cosmetology & PRP
              </h3>
              <div className="grid md:grid-cols-3 gap-6">
                {COSMETOLOGY_SERVICES.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => openTreatment(item)} 
                    className="group relative h-72 rounded-xl overflow-hidden cursor-pointer bg-neutral-800 border border-white/10 hover:border-[#c5a059]/50 transition-all duration-300 hover:shadow-2xl"
                  >
                    {/* Image */}
                    <img 
                      src={item.img} 
                      alt={item.name} 
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition duration-700"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    
                    {/* Content Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1f15] via-[#0f1f15]/50 to-transparent p-6 flex flex-col justify-end">
                       <h4 className="font-bold text-lg text-white mb-1">{item.name}</h4>
                       <p className="text-xs text-[#c5a059] font-bold uppercase tracking-wider mb-2">{item.subtitle}</p>
                       
                       <div className="flex items-center gap-2 text-xs font-medium text-white/80 bg-white/10 w-fit px-3 py-1.5 rounded-full mt-2 group-hover:bg-[#c5a059] group-hover:text-[#1e3a29] transition-colors">
                          <Eye size={14} /> Tap to View Details
                       </div>
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
               {/* 1. Address Section */}
      <div className="flex gap-4 items-start">
        <div className="w-10 h-10 bg-[#c5a059] rounded-full flex items-center justify-center shrink-0 text-[#1e3a29] mt-1">
          <MapPin size={20}/>
        </div>
        <div>
          <h4 className="font-serif font-bold text-lg mb-2">Visit Our Clinic</h4>
          
          {/* Address Text (Non-clickable) */}
          <p className="text-sm text-gray-400 leading-relaxed mb-3">
            206, B-Block, 2nd Floor,<br/> 
            Olive Greens, Gota, S.G. Highway,<br/> 
            Ahmedabad - 382481
          </p>

          {/* ✅ UPDATE: Get Directions Button */}
          <a 
            href="https://maps.app.goo.gl/2EpwqWbUEQkiwR6k7" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[#c5a059] font-bold text-xs border border-[#c5a059] px-4 py-2 rounded-full hover:bg-[#c5a059] hover:text-[#1e3a29] transition"
          >
            Get Directions <ArrowRight size={12} />
          </a>
        </div>
      </div>

               <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-[#c5a059] rounded-full flex items-center justify-center shrink-0 text-[#1e3a29] mt-1">
                    <Phone size={20}/>
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-lg mb-2">Get in Touch</h4>
                    {/* ✅ UPDATE: WhatsApp Click-to-Chat */}
                    <p className="text-sm text-gray-400 hover:text-[#c5a059] transition flex items-center gap-2">
                      <a href="tel:+916352135799">+91 63521 35799</a>
                      <a 
                        href="https://wa.me/916352135799" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#25D366] font-bold bg-white/10 px-2 py-0.5 rounded text-[10px] hover:bg-[#25D366] hover:text-white transition"
                      >
                         <MessageCircle size={10} /> Chat
                      </a>
                    </p>
                    <p className="text-sm text-gray-400 mt-1 hover:text-[#c5a059] transition">
                      <a href="mailto:rudraayurved5@gmail.com">rudraayurved5@gmail.com</a>
                    </p>
                  </div>
               </div>

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

      {/* --- CONSULTATION BOOKING MODAL --- */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
              <div className="flex justify-between items-center mb-4">
                 <div>
                    <h2 className="text-2xl font-serif font-bold text-[#1e3a29]">Request Consultation</h2>
                    <p className="text-xs text-gray-500">We will call you to confirm the time.</p>
                 </div>
                 <button onClick={() => setIsBookingModalOpen(false)} className="text-gray-400 hover:text-red-500 transition">
                   <X size={24} />
                 </button>
              </div>

              <div className="bg-[#1e3a29]/5 border border-[#1e3a29]/10 rounded-lg p-3 mb-6 flex items-center gap-3">
                <div className="bg-[#1e3a29] text-white p-2 rounded-full">
                  <Wallet size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Consultation Charge</p>
                  <p className="text-lg font-bold text-[#1e3a29]">₹500 <span className="text-xs font-normal text-gray-500">(Pay at Clinic)</span></p>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                   <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Full Name <span className="text-red-500">*</span></label>
                   <input 
                     required
                     className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] bg-white text-gray-900"
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
                     className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] bg-white text-gray-900"
                     placeholder="e.g. 9876543210"
                     value={formData.phone}
                     onChange={(e) => setFormData({...formData, phone: e.target.value})}
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Symptoms / Purpose</label>
                   <textarea 
                     className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] resize-none h-24 bg-white text-gray-900"
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

      {/* --- TREATMENT DETAIL MODAL (UPDATED) --- */}
      {selectedTreatment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] md:h-auto overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col md:flex-row relative">
              
              {/* Close Button */}
              <button 
                onClick={() => setSelectedTreatment(null)} 
                className="absolute top-4 right-4 z-20 bg-white/20 hover:bg-white text-gray-400 hover:text-red-500 backdrop-blur-sm p-2 rounded-full transition-all"
              >
                <X size={24} />
              </button>

              {/* Left: Image Gallery */}
              <div className="w-full md:w-1/2 bg-neutral-900 relative">
                 <div className="h-64 md:h-full relative">
                    {/* ✅ UPDATED: Uses activeImage state */}
                    <img 
                       src={activeImage} 
                       alt={selectedTreatment.name} 
                       className="w-full h-full object-cover"
                       onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-8">
                       <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">{selectedTreatment.name}</h2>
                       <p className="text-[#c5a059] uppercase tracking-widest font-bold mt-2 text-sm">{selectedTreatment.subtitle}</p>
                    </div>
                 </div>
                 
                 {/* Mini Gallery Strip */}
                 <div className="absolute bottom-4 right-4 flex gap-2">
                    {selectedTreatment.gallery && selectedTreatment.gallery.map((img: string, i: number) => (
                      <div 
                        key={i} 
                        onClick={() => setActiveImage(img)} // 👈 Updated click handler
                        className={`w-12 h-12 md:w-16 md:h-16 rounded-lg border-2 overflow-hidden cursor-pointer transition ${activeImage === img ? 'border-[#c5a059] scale-105' : 'border-white/50 hover:border-white'}`}
                      >
                          <img src={img} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                      </div>
                    ))}
                 </div>
              </div>

              {/* Right: Details */}
              <div className="w-full md:w-1/2 p-6 md:p-10 overflow-y-auto bg-white flex flex-col">
                  <div className="flex-1">
                     <div className="flex items-center gap-2 text-[#c5a059] mb-4">
                        <Info size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">Therapy Details</span>
                     </div>
                     
                     <p className="text-lg text-[#1e3a29] leading-relaxed mb-6 font-medium">
                        {selectedTreatment.detail}
                     </p>

                     {selectedTreatment.benefits && (
                       <div className="mb-8">
                         <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                           <CheckCircle2 size={18} className="text-[#c5a059]" /> Key Benefits
                         </h4>
                         <ul className="grid grid-cols-1 gap-3">
                           {selectedTreatment.benefits.map((benefit: string, i: number) => (
                             <li key={i} className="text-gray-600 text-sm flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                 <span className="w-1.5 h-1.5 bg-[#1e3a29] rounded-full mt-1.5 shrink-0"></span>
                                 {benefit}
                             </li>
                           ))}
                         </ul>
                       </div>
                     )}
                  </div>

                  {/* Action Bar */}
                  <div className="pt-6 border-t border-gray-100 mt-6">
                     <button 
                       onClick={handleBookFromTreatment}
                       className="w-full bg-[#1e3a29] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#162b1e] transition flex items-center justify-center gap-2 shadow-lg shadow-[#1e3a29]/20"
                     >
                        <Calendar size={20} /> Book This Therapy
                     </button>
                     <p className="text-center text-xs text-gray-400 mt-3">
                       Consultation required before therapy confirmation.
                     </p>
                  </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}